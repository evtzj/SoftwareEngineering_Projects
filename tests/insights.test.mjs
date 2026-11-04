import test from "node:test";
import assert from "node:assert/strict";
import { explainQuestion, mistakeBreakdown } from "../web/practice-insights.js";
import { reportInsights, selectFunctions } from "../web/code-insights.js";
import { repositoryFiles } from "../web/github-source.js";

test("错题过程遵守优先级、括号、有理数与负数的实际求值顺序", () => {
  assert.deepEqual(explainQuestion({ expression: "2 + 3 × 4", answer: 14 }), [
    "3 × 4 = 12",
    "2 + 12 = 14",
  ]);
  assert.deepEqual(explainQuestion({ expression: "(2 + 3) × 4", answer: 20 }), [
    "2 + 3 = 5",
    "5 × 4 = 20",
  ]);
  assert.deepEqual(
    explainQuestion({ expression: "1 ÷ 2 + 1 ÷ 3", answer: "5/6" }),
    ["1 ÷ 2 = 1/2", "1 ÷ 3 = 1/3", "(1/2) + (1/3) = 5/6"],
  );
  assert.deepEqual(explainQuestion({ expression: "(2 − 5) × 3", answer: -9 }), [
    "2 − 5 = -3",
    "(-3) × 3 = -9",
  ]);
  assert.deepEqual(explainQuestion({ expression: "17 ÷ 5", answer: "3余2" }), [
    "17 ÷ 5 = 3 余 2",
    "17 = 5 × 3 + 2",
  ]);
  assert.deepEqual(
    mistakeBreakdown([
      { expression: "2 + 3 × 4", mastered: false },
      { expression: "2 + 3", mastered: true },
    ]).map((row) => row.count),
    [1, 0, 1, 0],
  );
});
test("统计解读排除缺失解析，函数搜索和排序不修改原报告", () => {
  const functions = [
    {
      file: "a.py",
      name: "short",
      startLine: 1,
      length: 2,
      status: "complete",
    },
    { file: "b.py", name: "long", startLine: 4, length: 9, status: "complete" },
    {
      file: "bad.py",
      name: "partial",
      startLine: 1,
      length: 100,
      status: "incomplete",
    },
  ];
  const report = {
    total: { code: 10 },
    summary: [
      { language: "Python", files: 2, code: 8 },
      { language: "C", files: 1, code: 2 },
    ],
    functions,
    files: [{ functionStatus: "complete" }, { functionStatus: "incomplete" }],
  };
  const result = reportInsights(report);
  assert.equal(result.languages[0].percent, 80);
  assert.deepEqual(
    result.longest.map((row) => row.name),
    ["long", "short"],
  );
  assert.equal(result.incomplete, 1);
  assert.deepEqual(
    selectFunctions(functions, "PY", "length").map((row) => row.name),
    ["partial", "long", "short"],
  );
  assert.equal(functions[0].name, "short");
});
test("GitHub 显式含斜杠分支与 tree 链接可正确提取子目录", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () =>
      String(url).includes("/git/trees/")
        ? {
            tree: [
              { type: "tree", path: "src" },
              { type: "blob", path: "src/main.py" },
              { type: "blob", path: "docs/a.md" },
            ],
          }
        : { sha: "revision", commit: { tree: { sha: "tree" } } },
  });
  try {
    const files = await repositoryFiles(
      "https://github.com/a/b/tree/feature/classroom/src",
      { branch: "feature/classroom" },
    );
    assert.deepEqual(
      files.map((file) => file.name),
      ["src/main.py"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
