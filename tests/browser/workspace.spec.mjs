import { test, expect } from "@playwright/test";
import { evaluateExpression } from "../../web/arithmetic.js";
import { readFile } from "node:fs/promises";
import { buildCodeReport } from "../../web/code-report.js";

test("错题运算筛选后只重练当前匹配题目", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "workshop-mistakes",
      JSON.stringify([
        {
          expression: "2 + 3 × 4",
          answer: 14,
          given: "20",
          misses: 1,
          mastered: false,
          lastReviewed: "2026-11-18",
          settings: { max: 100 },
        },
        {
          expression: "8 ÷ 2",
          answer: 4,
          given: "5",
          misses: 1,
          mastered: false,
          lastReviewed: "2026-11-18",
          settings: { max: 100 },
        },
      ]),
    ),
  );
  await page.goto("/#math/mistakes");
  await page.locator("#mistake-operation").selectOption("*");
  await expect(page.locator(".mistake-row")).toHaveCount(1);
  await page.getByRole("button", { name: "练习待巩固题目" }).click();
  await expect(page.locator(".ws-paper-heading")).toContainText("1 道题");
  await expect(page.locator(".ws-question label")).toHaveText("2 + 3 × 4 =");
});

test("练习刷新恢复、键盘继续、结果分类与首页入口", async ({ page }) => {
  await page.goto("/#math");
  await page.locator("[name=count]").fill("10");
  await page.getByRole("button", { name: "生成练习", exact: true }).click();
  await expect(page).toHaveURL(/math\/practice$/);
  await page.locator('[data-ws-answer="0"]').fill("999999");
  await page.locator('[data-ws-answer="0"]').press("Enter");
  await expect(page.locator('[data-ws-answer="1"]')).toBeFocused();
  const expression = (
    await page.locator(".ws-question label").nth(1).textContent()
  ).replace(/\s*=\s*$/, "");
  await page
    .locator('[data-ws-answer="1"]')
    .fill(String(evaluateExpression(expression).answer));
  await page.getByRole("link", { name: "首页", exact: true }).first().click();
  await expect(page.locator(".continue-card")).toContainText("已作答 2 / 10");
  await page.getByRole("link", { name: "继续作答" }).click();
  await page.getByRole("button", { name: "下一页 →", exact: true }).click();
  await page.reload();
  await expect(page.locator('[data-ws-answer="8"]')).toBeVisible();
  await expect(page.locator("#ws-progress")).toHaveText("已作答 2 / 10");
  await page.getByRole("link", { name: "首页", exact: true }).first().click();
  await expect(page.locator(".continue-card")).toContainText("已作答 2 / 10");
  await page.getByRole("link", { name: "继续作答" }).click();
  await page.getByRole("button", { name: "跳到未答题" }).click();
  await expect(page.locator('[data-ws-answer="2"]')).toBeFocused();
  await page.getByRole("button", { name: "交卷批改" }).click();
  await page.locator('[data-review-filter="wrong"]').click();
  await expect(page.locator(".ws-question")).toHaveCount(1);
  await expect(page.locator('[data-ws-answer="0"]')).toHaveValue("999999");
  await page.locator('[data-review-filter="unanswered"]').click();
  await expect(page.locator(".ws-question")).toHaveCount(8);
  await expect(page.locator(".is-unanswered")).toHaveCount(8);
  await page.reload();
  await expect(page.locator(".ws-result")).toContainText("答对 1 / 10");
  await page.getByRole("link", { name: "练习记录", exact: true }).click();
  await expect(page.locator(".practice-history tbody tr")).toHaveCount(1);
  await expect(page.locator(".history-metrics")).toContainText("10%");
});

test("源码明细分页、语言筛选与文件到函数的精确定位", async ({ page }) => {
  await page.goto("/#code");
  await page.locator("#code-files").setInputFiles(
    Array.from({ length: 45 }, (_, i) => ({
      name: `f${String(i).padStart(2, "0")}.py`,
      mimeType: "text/plain",
      buffer: Buffer.from(`def f${i}():\n    return ${i}\n`),
    })),
  );
  await expect(page).toHaveURL(/code\/report$/);
  await page
    .getByRole("button", { name: "查看 Python 文件", exact: true })
    .click();
  await expect(page.locator("#code-files-table tbody tr")).toHaveCount(40);
  await page.locator("#file-pagination [data-detail-next]").click();
  await expect(page.locator("#code-files-table tbody tr")).toHaveCount(5);
  await page.locator("#file-search").fill("f00");
  await expect(page.locator("#code-files-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "查看 f00.py 的函数", exact: true })
    .click();
  await expect(page.locator("#code-functions-table tbody tr")).toHaveCount(1);
  await expect(page.locator("#function-location")).toContainText("f00.py");
  await page.getByRole("button", { name: "查看全部函数" }).click();
  await expect(page.locator("#code-functions-table tbody tr")).toHaveCount(40);
  await page.locator("#function-pagination [data-detail-next]").click();
  await expect(page.locator("#code-functions-table tbody tr")).toHaveCount(5);
  await page.locator("#function-search").fill("f00");
  await expect(page.locator("#code-functions-table tbody tr")).toHaveCount(1);
});

test("导出报告重新导入后保留指标，历史备份可恢复", async ({ page }) => {
  await page.goto("/#code");
  await page.getByRole("button", { name: "载入五语言示例项目" }).click();
  await expect(page).toHaveURL(/code\/report$/);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON", exact: true }).click();
  const file = await downloading;
  const content = await readFile(await file.path());
  await page.getByRole("link", { name: "历史与对比", exact: true }).click();
  await page.locator("#report-backup-file").setInputFiles({
    name: "五语言报告.json",
    mimeType: "application/json",
    buffer: content,
  });
  await expect(page).toHaveURL(/code\/report$/);
  await expect(page.locator(".stat-total strong")).toHaveText("44");
  await expect(page.locator("#active-report-name")).toHaveText("五语言报告");
  await page.getByRole("link", { name: "历史与对比", exact: true }).click();
  await expect(page.locator(".archive-row")).toHaveCount(1);
  const backingUp = page.waitForEvent("download");
  await page.getByRole("button", { name: "备份全部历史" }).click();
  const backup = await backingUp;
  const backupContent = await readFile(await backup.path());
  await page.locator("[data-archive-delete]").click();
  await page.locator("#report-backup-file").setInputFiles({
    name: "历史.json",
    mimeType: "application/json",
    buffer: backupContent,
  });
  await page.reload();
  await page.getByRole("link", { name: "历史与对比", exact: true }).click();
  await expect(page.locator(".archive-row")).toHaveCount(1);
});

test("更换对比报告后清除旧结果，相同报告不会保留旧差值", async ({ page }) => {
  const snapshot = (id, code) => ({
    version: 1,
    id,
    name: id,
    date: "2026-11-18T00:00:00Z",
    report: buildCodeReport([
      {
        name: "a.py",
        language: "python",
        code,
        comment: 0,
        blank: 0,
        total: code,
        functionStatus: "complete",
        functions: [],
      },
    ]),
  });
  await page.goto("/#code/history");
  await page.locator("#report-backup-file").setInputFiles({
    name: "history.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([snapshot("新版", 5), snapshot("初版", 2)]),
    ),
  });
  await page.getByRole("link", { name: "历史与对比", exact: true }).click();
  await page.getByRole("link", { name: "版本对比", exact: true }).click();
  await page.getByRole("button", { name: "对比报告", exact: true }).click();
  await expect(page.locator("#code-comparison")).toContainText("+3");
  await page.locator("#compare-before").selectOption({ label: "新版" });
  await expect(page.locator("#code-comparison")).toBeEmpty();
  await page.getByRole("button", { name: "对比报告", exact: true }).click();
  await expect(page.locator("#compare-status")).toContainText("不同的报告");
  await expect(page.locator("#code-comparison")).toBeEmpty();
});

test("学习计划搜索、逾期筛选与手机布局", async ({ page }) => {
  await page.goto("/#plans");
  await page.getByLabel("计划名称", { exact: true }).fill("整理课程报告");
  await page.getByLabel("截止日期（可选）").fill("2026-01-01");
  await page.getByRole("button", { name: "添加计划", exact: true }).click();
  await page.getByLabel("计划名称", { exact: true }).fill("完成四则运算");
  await page.getByRole("button", { name: "添加计划", exact: true }).click();
  await page.getByRole("button", { name: "已逾期", exact: true }).click();
  await expect(page.locator(".plan-row")).toHaveCount(1);
  await page.getByRole("button", { name: "全部", exact: true }).click();
  await page.locator("#plan-search").fill("运算");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.locator(".plan-row")).toHaveCount(1);
  await expect(page.locator(".plan-row")).toContainText("完成四则运算");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
