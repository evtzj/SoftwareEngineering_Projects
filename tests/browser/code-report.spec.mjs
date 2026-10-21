import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "../../web/vendor/fflate.js";

test("五语言表格与三种下载内容一致；桌面和手机可用", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#code");
  await page.getByRole("button", { name: "载入五语言示例项目" }).click();
  await expect(page.locator("#code-status")).toContainText("已统计 5 个文件");
  await expect(page.locator(".stat-total strong")).toHaveText("44");
  await expect(page.locator(".code-stats strong")).toHaveText(["35", "3", "6"]);
  const cRow = page.locator("#code-summary tbody tr").first();
  await expect(cRow.locator("td")).toHaveText([
    "C",
    "1",
    "7",
    "2",
    "1",
    "2",
    "4",
    "3",
    "3.5",
    "3.5",
  ]);
  const total = page.locator("#code-summary tbody tr").last();
  await expect(total.locator("td")).toHaveText([
    "合计",
    "5",
    "35",
    "6",
    "3",
    "10",
    "4",
    "1",
    "2.6",
    "3",
  ]);
  await expect(page.locator("#code-functions-table tbody tr")).toHaveCount(10);
  const getDownload = async (name) => {
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const result = await promise;
    return {
      name: result.suggestedFilename(),
      bytes: await readFile(await result.path()),
    };
  };
  const csv = await getDownload("导出 CSV");
  expect(csv.name).toBe("代码量统计.csv");
  expect(csv.bytes.toString("utf8")).toContain(
    '"合计","5","35","6","3","10","4","1","2.6","3"',
  );
  const json = await getDownload("导出 JSON");
  expect(json.name).toBe("代码量统计.json");
  const report = JSON.parse(json.bytes);
  expect(report.total.mean).toBe(2.6);
  expect(report.files).toHaveLength(5);
  const excel = await getDownload("导出 Excel");
  expect(excel.name).toBe("代码量统计.xlsx");
  const sheets = unzipSync(excel.bytes);
  expect(strFromU8(sheets["xl/workbook.xml"])).toContain("统计口径");
  expect(strFromU8(sheets["xl/worksheets/sheet1.xml"])).toMatch(
    /<c r="I7"[^>]*><v>2.6<\/v>/,
  );
  await page.screenshot({
    path: "preview/code-report-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "前往运算练习" }).click();
  await page.getByRole("link", { name: "02 / 代码统计" }).click();
  await expect(page.locator(".stat-total strong")).toHaveText("44");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(page.getByRole("button", { name: "导出 Excel" })).toBeEnabled();
  await page.screenshot({
    path: "preview/code-report-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("上传源码排除空行；错误源码及空文件提供明确状态", async ({ page }) => {
  await page.goto("/#code");
  await page.locator("#code-files").setInputFiles([
    {
      name: "sample.c",
      mimeType: "text/plain",
      buffer: Buffer.from("int f() {\n\n  \n\t\n return 0;\n}\n"),
    },
    { name: "empty.py", mimeType: "text/plain", buffer: Buffer.from("") },
  ]);
  await expect(page.locator("#code-status")).toContainText("已统计 2 个文件");
  await expect(
    page.locator("#code-functions-table tbody tr td").last(),
  ).toHaveText("3");
  await page
    .locator("#code-files")
    .setInputFiles({
      name: "broken.py",
      mimeType: "text/plain",
      buffer: Buffer.from("def f(:\n    return 1"),
    });
  await expect(page.locator("#code-status")).toContainText("已统计 1 个文件");
  await expect(page.locator(".analysis-warning")).toBeVisible();
  await expect(page.locator("#code-files-table")).toContainText("语法错误");
  await page.getByRole("button", { name: "清空", exact: true }).click();
  await expect(page.getByRole("button", { name: "导出 JSON" })).toBeDisabled();
});
