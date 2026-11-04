import { test, expect } from "@playwright/test";

test("从报告定位函数、搜索并返回完整列表", async ({ page }) => {
  await page.goto("/#code");
  await page.getByRole("button", { name: "载入五语言示例项目" }).click();
  await expect(page.locator(".insight-language")).toHaveCount(5);
  await page.locator('[data-locate-function="0"]').click();
  await expect(page).toHaveURL(/#code\/functions$/);
  await expect(page.locator("#code-functions-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "查看全部函数" }).click();
  await expect(page.locator("#code-functions-table tbody tr")).toHaveCount(10);
  await page.locator("#function-search").fill("example.py");
  await expect(page.locator("#code-functions-table tbody tr")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("错题中展开与批改一致的计算过程", async ({ page }) => {
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
          lastReviewed: "2026-11-04",
          settings: { max: 100, operations: ["+", "*"], operatorCount: 2 },
        },
      ]),
    ),
  );
  await page.goto("/#math/mistakes");
  await page.getByText("查看计算过程", { exact: true }).click();
  await expect(page.locator(".solution ol")).toHaveText(
    "3 × 4 = 122 + 12 = 14",
  );
  await expect(page.locator(".mistake-insights strong")).toHaveText([
    "1",
    "0",
    "1",
    "0",
  ]);
});
