import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeSource } from "../web/code-analysis.js";
import { buildCodeReport, reportCSV } from "../web/code-report.js";
import { reportXLSX } from "../web/code-xlsx.js";
import { codeSamples } from "../web/code-samples.js";
import { unzipSync, strFromU8 } from "../web/vendor/fflate.js";

const analyze = (language, text, name = `sample.${language}`) =>
  analyzeSource({ name, language, text });

test("五种课堂语言：行数分类、函数识别和排除空行后的长度", async () => {
  const expected = [
    { total: 10, code: 7, blank: 2, comment: 1, lengths: [3, 4] },
    { total: 10, code: 10, blank: 0, comment: 0, lengths: [1, 3] },
    { total: 8, code: 6, blank: 1, comment: 1, lengths: [1, 4] },
    { total: 8, code: 5, blank: 2, comment: 1, lengths: [2, 3] },
    { total: 8, code: 7, blank: 1, comment: 0, lengths: [1, 4] },
  ];
  const rows = [];
  for (const [i, sample] of codeSamples.entries()) {
    const row = await analyzeSource(sample);
    rows.push(row);
    assert.equal(row.functionStatus, "complete", row.warning);
    for (const key of ["total", "code", "blank", "comment"])
      assert.equal(row[key], expected[i][key], sample.name + ":" + key);
    assert.deepEqual(
      row.functions.map((fn) => fn.length),
      expected[i].lengths,
      sample.name,
    );
  }
  const report = buildCodeReport(rows);
  assert.deepEqual(
    report.summary.map((r) => r.mean),
    [3.5, 2, 2.5, 2.5, 2.5],
  );
  assert.deepEqual(
    report.summary.map((r) => r.median),
    [3.5, 2, 2.5, 2.5, 2.5],
  );
  assert.equal(report.total.functionCount, 10);
  assert.equal(report.total.mean, 2.6);
  assert.equal(report.total.median, 3);
  assert.equal(report.total.code, 35);
});
test("多文件按全部函数加权；偶数中位数、空文件、无函数和不支持语言", async () => {
  const files = [
    await analyze("c", "int f() { return 0; }", "a.c"),
    await analyze(
      "c",
      "int g() {\n\n return 1;\n}\nint h() { return 2; }",
      "b.c",
    ),
    await analyze("c", "", "empty.c"),
  ];
  const r = buildCodeReport(files).summary[0];
  assert.equal(r.files, 3);
  assert.equal(r.functionCount, 3);
  assert.equal(r.mean, 1.67);
  assert.equal(r.median, 1);
  const noFunctions = buildCodeReport([await analyze("c", "int value = 1;")])
    .summary[0];
  assert.equal(noFunctions.functionCount, 0);
  assert.equal(noFunctions.min, null);
  const unsupported = buildCodeReport([
    await analyze("css", "body { color: red; }"),
  ]);
  assert.equal(unsupported.total.functionCount, null);
  assert.match(unsupported.files[0].warning, /仅统计行数/);
});
test("C/C++ 区分声明和定义；字符串及控制语句不增加函数个数", async () => {
  const row = await analyze(
    "cpp",
    `int declared(int x);
class Box {
public:
  Box() {}
  ~Box() {}
  int get() const { if (true) { return 1; } return 0; }
};
int main() {
  auto text = R"tag(
// still a string
{})tag";
  auto f = []() { return 1; };
  return f();
}`,
  );
  assert.equal(row.functionStatus, "complete", row.warning);
  assert.deepEqual(
    row.functions.map((f) => f.name),
    ["Box", "~Box", "get", "main"],
  );
  assert.equal(row.comment, 0);
});
test("Java 抽象方法不计数；构造器、重载及多行方法参与统计", async () => {
  const r = await analyze(
    "java",
    `abstract class Example {
  Example() {}
  abstract void skipped();
  int twice(int value) { return value * 2; }
  int twice() {
    return twice(1);
  }
}`,
  );
  assert.equal(r.functionStatus, "complete", r.warning);
  assert.deepEqual(
    r.functions.map((f) => f.length),
    [1, 1, 3],
  );
});
test("Python 嵌套、async、装饰器和三引号字符串；空格/制表符行不计长度", async () => {
  const r = await analyze(
    "python",
    `@decorator
async def outer(x):
    """line one
# this is string content
    """
    
\t
    def inner():
        return x

    return inner()
`,
  );
  assert.equal(r.functionStatus, "complete", r.warning);
  assert.deepEqual(
    r.functions.map((f) => [f.name, f.startLine, f.endLine, f.length]),
    [
      ["outer", 2, 11, 7],
      ["inner", 8, 9, 2],
    ],
  );
  assert.equal(r.comment, 0);
  assert.equal(r.blank, 3);
});
test("C# verbatim/raw 字符串、表达式方法和局部函数；不统计属性访问器", async () => {
  const r = await analyze(
    "csharp",
    `abstract class Example {
  public abstract int Missing();
  public int Value { get { return 1; } }
  public int Twice(int x) => x * 2;
  public string Text() {
    var verbatim = @"a ""quote"" // string";
    var raw = """
// raw string
""";
    int Local() { return 1; }
    return verbatim + raw + Local();
  }
}`,
  );
  assert.equal(r.functionStatus, "complete", r.warning);
  assert.deepEqual(
    r.functions.map((f) => f.name),
    ["Twice", "Text", "Local"],
  );
  assert.equal(r.comment, 0);
});
test("JS/TS 项目自身使用的嵌套模板、箭头函数及 TSX", async () => {
  const text =
    "const outer = () => {\n  const inner = x => `text ${`nested ${x}`}`;\n  return inner(1);\n};\n";
  const js = await analyze("javascript", text);
  assert.equal(js.functionStatus, "complete", js.warning);
  assert.equal(js.functions.length, 2);
  const tsx = await analyze(
    "typescript",
    "const View = () => <div>hello</div>;",
    "view.tsx",
  );
  assert.equal(tsx.functionStatus, "complete", tsx.warning);
  assert.equal(tsx.functions.length, 1);
  const own = await analyze(
    "javascript",
    await readFile(new URL("../web/code-tool.js", import.meta.url), "utf8"),
  );
  assert.equal(own.functionStatus, "complete", own.warning);
  assert.ok(own.functions.length > 10);
});
test("语法错误保留行数并标记不完整，不用 0 假装分析成功", async () => {
  const r = await analyze("python", "def broken(:\n    return 1");
  assert.equal(r.total, 2);
  assert.equal(r.functionStatus, "partial");
  assert.match(r.warning, /语法错误/);
  const report = buildCodeReport([r]);
  assert.equal(report.total.functionCount, null);
  assert.equal(report.total.mean, null);
});
test("CSV/JSON/XLSX 使用同一报告；工作表、数值和转义可读取", async () => {
  const files = [];
  for (const s of codeSamples) files.push(await analyzeSource(s));
  const report = buildCodeReport(files);
  const csv = reportCSV(report);
  assert.match(csv, /"C","1","7","2","1","2","4","3","3.5","3.5"/);
  assert.equal(JSON.parse(JSON.stringify(report)).total.mean, 2.6);
  const zip = unzipSync(reportXLSX(report));
  const workbook = strFromU8(zip["xl/workbook.xml"]);
  for (const name of ["语言汇总", "文件明细", "函数明细", "统计口径"])
    assert.ok(workbook.includes(name));
  const summary = strFromU8(zip["xl/worksheets/sheet1.xml"]);
  assert.match(summary, /<c r="I7"[^>]*t="n"><v>2.6<\/v>/);
  assert.match(summary, /<c r="J7"[^>]*t="n"><v>3<\/v>/);
  const escaped = buildCodeReport([{ ...files[0], name: '名字<&".c' }]);
  assert.match(
    strFromU8(unzipSync(reportXLSX(escaped))["xl/worksheets/sheet2.xml"]),
    /名字&lt;&amp;&quot;\.c/,
  );
});
