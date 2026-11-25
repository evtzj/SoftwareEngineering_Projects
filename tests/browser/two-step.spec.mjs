import { test, expect } from "@playwright/test";
import { evaluateExpression } from "../../web/arithmetic.js";

test("两步四则与加减混合快捷设置，每题两个运算符且可正确批改", async ({
  page,
}) => {
  await page.goto("/#math");
  await page.getByRole("button", { name: "两步四则", exact: true }).click();
  await expect(page.locator('[name="operatorCount"]')).toHaveValue("2");
  await expect(page.locator('[name="max"]')).toHaveValue("100");
  await expect(page.locator('[name="operation"]:checked')).toHaveCount(4);
  await page.getByRole("button", { name: "生成练习", exact: true }).click();
  await expect(page).toHaveURL(/math\/practice$/);
  let questions = await page.evaluate(
    () => JSON.parse(localStorage.getItem("workshop-session")).questions,
  );
  expect(questions).toHaveLength(20);
  for (const question of questions)
    expect(question.expression.match(/[+−×÷]/g)).toHaveLength(2);

  await page.getByRole("link", { name: "1. 设置练习", exact: true }).click();
  await page.getByRole("button", { name: "加减混合", exact: true }).click();
  await expect(page.locator('[name="operation"]:checked')).toHaveCount(2);
  await expect(page.locator('[name="operation"][value="+"]')).toBeChecked();
  await expect(page.locator('[name="operation"][value="-"]')).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: ".tools/two-step-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".tools/two-step-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "生成练习", exact: true }).click();
  await expect(page).toHaveURL(/math\/practice$/);
  questions = await page.evaluate(
    () => JSON.parse(localStorage.getItem("workshop-session")).questions,
  );
  for (const question of questions) {
    expect(question.expression.match(/[+−×÷]/g).sort()).toEqual(["+", "−"]);
    expect(question.answer).toBeGreaterThanOrEqual(0);
    expect(question.answer).toBeLessThanOrEqual(100);
  }
  expect(evaluateExpression("13 + 28 − 10").answer).toBe(31);
  for (let round = 0; round < 3; round++) {
    const labels = await page.locator(".ws-question label").allTextContents();
    for (let i = 0; i < labels.length; i++) {
      const answer = evaluateExpression(
        labels[i].replace(/\s*=\s*$/, ""),
      ).answer;
      await page.locator("[data-ws-answer]").nth(i).fill(String(answer));
    }
    if (round < 2) await page.getByRole("button", { name: "下一页" }).click();
  }
  await page.getByRole("button", { name: "交卷批改" }).click();
  await expect(page.locator(".ws-result > strong")).toHaveText("100%");
});
