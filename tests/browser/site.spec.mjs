import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function screenshot(page, path, fullPage = true) {
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path,
    fullPage,
    animations: "disabled",
    style: "#toast { visibility: hidden !important; }",
  });
}

test("主页：导航、编辑保存及桌面和手机排版", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#home");
  await expect(
    page.getByRole("heading", { name: "你好，我是 小林。" }),
  ).toBeVisible();
  await mkdir("preview", { recursive: true });
  await screenshot(page, "preview/首页-桌面.png");
  await screenshot(page, "preview/首页-首屏.png", false);
  await page.getByRole("button", { name: "编辑主页" }).click();
  await page.getByLabel("你的名字").fill("测试同学");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(
    page.getByRole("heading", { name: "你好，我是 测试同学。" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "你好，我是 测试同学。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "添加足迹" }).click();
  await page.getByLabel("时间或阶段").fill("2026");
  await page.getByLabel("标题", { exact: true }).fill("测试记录");
  await page.getByLabel("标签", { exact: true }).fill("学习");
  await page.getByLabel("故事或作品介绍").fill("验证添加记录功能");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(
    page.getByRole("heading", { name: "测试记录", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "让想法留下形状" }).click();
  await expect(page).toHaveURL(/#works$/);
  await page.evaluate(() => localStorage.clear());
  await page.goto("/#home");
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "你好，我是 小林。" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await screenshot(page, "preview/首页-手机.png");
  expect(errors).toEqual([]);
});

test("代码统计：示例、文件读取、报告导出", async ({ page }) => {
  await page.goto("/#code");
  await page.getByText("也可以直接粘贴代码").click();
  await page.getByRole("button", { name: "填入示例" }).click();
  await page.getByRole("button", { name: "统计这段代码" }).click();
  await expect(page.locator(".stat-total strong")).toHaveText("8");
  await expect(page.locator(".code-stats strong")).toHaveText(["5", "2", "1"]);
  await page
    .locator("#code-files")
    .setInputFiles({
      name: "demo.py",
      mimeType: "text/plain",
      buffer: Buffer.from('# comment\nprint("# text")\n\n'),
    });
  await expect(page.locator(".stat-total strong")).toHaveText("3");
  await expect(page.locator(".code-stats strong")).toHaveText(["1", "1", "1"]);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 CSV" }).click();
  expect((await downloaded).suggestedFilename()).toBe("代码量统计.csv");
  await screenshot(page, "preview/代码统计.png");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
