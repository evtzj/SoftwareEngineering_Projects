import { test, expect } from "@playwright/test";
import { evaluateExpression } from "../../web/arithmetic.js";
test("工作台：周练默认值、分页保留答案、计时、批改与错题", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".ws-masthead")).toBeVisible();
  await expect(page.locator("[name=count]")).toHaveValue("300");
  await page.getByRole("button", { name: "生成练习", exact: true }).click();
  await expect(page.locator("[data-ws-answer]")).toHaveCount(30);
  await expect(page.locator(".ws-paper-heading")).toContainText("300 道题");
  await page.locator('[data-ws-answer="0"]').fill("999");
  await page.getByRole("button", { name: "下一页" }).click();
  await page.locator('[data-ws-answer="30"]').fill("1/2");
  await page.getByRole("button", { name: "上一页" }).click();
  await expect(page.locator('[data-ws-answer="0"]')).toHaveValue("999");
  await expect(page.locator("#ws-progress")).toContainText("2 / 300");
  await page.getByRole("button", { name: "交卷批改" }).click();
  await expect(page.locator(".ws-result")).toContainText("未答 298");
  await page.getByRole("button", { name: "错题重练" }).click();
  await expect(page.locator(".ws-paper-heading h2")).toHaveText("再解一次");
  await page.getByRole("button", { name: "口算 20 题" }).click();
  await page.getByRole("button", { name: "生成练习", exact: true }).click();
  await expect(page.locator("[data-ws-answer]")).toHaveCount(20);
  const expressions = await page
    .locator(".ws-question label")
    .allTextContents();
  for (let i = 0; i < expressions.length; i++)
    await page
      .locator(`[data-ws-answer="${i}"]`)
      .fill(
        String(
          evaluateExpression(expressions[i].replace(/\s*=\s*$/, "")).answer,
        ),
      );
  await page.getByRole("button", { name: "交卷批改" }).click();
  await expect(page.locator(".ws-result>strong")).toHaveText("100%");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载题目" }).click();
  expect((await download).suggestedFilename()).toBe("四则运算练习.txt");
  await page.locator("#ws-include").check();
  await page.evaluate(() => (window.print = () => {}));
  await page.getByRole("button", { name: "打印 / PDF" }).click();
  await expect(page.locator("#print-sheet")).toContainText("参考答案");
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: "preview/worksheet-print.pdf", format: "A4" });
  await expect(page.locator("#print-sheet")).toBeVisible();
  await expect(page.locator(".workshop")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.screenshot({
    path: "preview/workshop-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "preview/workshop-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("错误规则不会丢失已有练习", async ({ page }) => {
  await page.goto("/#math");
  await page.getByRole("button", { name: "口算 20 题" }).click();
  await page.getByRole("button", { name: "生成练习", exact: true }).click();
  await expect(page.locator("[data-ws-answer]")).toHaveCount(20);
  await page.locator("[name=division]").selectOption("remainder");
  await page.locator("[name=operatorCount]").selectOption("2");
  await page.getByRole("button", { name: "生成练习", exact: true }).click();
  await expect(page.locator("#ws-status")).toContainText("一个运算符");
  await expect(page.locator("[data-ws-answer]")).toHaveCount(20);
});
