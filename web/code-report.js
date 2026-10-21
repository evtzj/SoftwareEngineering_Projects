import { languages } from "./logic.js";

export const summaryColumns = [
  ["language", "语言"],
  ["files", "源文件数"],
  ["code", "代码行数"],
  ["blank", "空行数"],
  ["comment", "注释行数"],
  ["functionCount", "函数个数"],
  ["max", "最大值"],
  ["min", "最小值"],
  ["mean", "均值"],
  ["median", "中位数"],
];
export const metricPolicy = {
  lines:
    "按物理行计；混合行归代码，纯注释行归注释，空行单列，末尾换行不额外计行。Python 三引号字符串归代码。",
  functions:
    "统计有实现的函数、方法及构造/析构函数；包含嵌套函数。JavaScript/TypeScript 包含箭头与匿名函数。C/C++/Java/C# 不计 lambda，C# 不计属性访问器。",
  length:
    "函数长度为定义首行到末行的非空白行数（含签名、括号和注释行，排除空行及仅空格/制表符的行）；不含 Python 装饰器。嵌套函数各计一次，外层长度包含内层。",
  aggregation:
    "最大值、最小值、均值、中位数均针对同一语言全部函数长度；合计按所有函数重新计算，不平均各语言的均值。均值保留两位小数。",
  missing:
    "无函数时函数个数为 0，长度指标为空；未支持或语法分析不完整时函数指标为空，界面显示 —，原因见文件明细。",
  headers:
    ".h 默认归 C；C++ 头文件请选择 .hpp/.hxx/.hh，或使用粘贴模式选择 C++。不展开宏、外部文件或条件编译。",
};
function lengthStats(lengths) {
  if (!lengths.length)
    return { max: null, min: null, mean: null, median: null };
  const sorted = [...lengths].sort((a, b) => a - b),
    mid = Math.floor(sorted.length / 2);
  return {
    max: sorted.at(-1),
    min: sorted[0],
    mean:
      Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 100) /
      100,
    median:
      sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
  };
}
function summarize(files, key) {
  const complete = files.every((f) => f.functionStatus === "complete");
  const lengths = files.flatMap((f) => f.functions.map((fn) => fn.length));
  const counts = files.reduce(
    (sum, f) => {
      for (const k of ["total", "code", "blank", "comment"]) sum[k] += f[k];
      return sum;
    },
    { total: 0, code: 0, blank: 0, comment: 0 },
  );
  return {
    language: key === "total" ? "合计" : languages[key].label,
    key,
    files: files.length,
    ...counts,
    functionCount: complete ? lengths.length : null,
    ...lengthStats(complete ? lengths : []),
    functionStatus: complete ? "complete" : "incomplete",
  };
}
export function buildCodeReport(files) {
  const core = ["c", "cpp", "java", "python", "csharp"];
  const keys = [
    ...core,
    ...Object.keys(languages).filter(
      (key) => !core.includes(key) && files.some((f) => f.language === key),
    ),
  ];
  return {
    title: "代码量统计",
    policy: metricPolicy,
    summary: keys.map((key) =>
      summarize(
        files.filter((f) => f.language === key),
        key,
      ),
    ),
    total: summarize(files, "total"),
    files,
    functions: files.flatMap((f) =>
      f.functions.map((fn) => ({
        file: f.name,
        language: languages[f.language].label,
        ...fn,
        status: f.functionStatus,
      })),
    ),
  };
}
export function reportTables(report) {
  return [
    {
      name: "语言汇总",
      columns: summaryColumns,
      rows: [...report.summary, report.total],
    },
    {
      name: "文件明细",
      columns: [
        ["name", "文件"],
        ["languageLabel", "语言"],
        ["code", "代码行数"],
        ["blank", "空行数"],
        ["comment", "注释行数"],
        ["total", "总行数"],
        ["functionCount", "函数个数"],
        ["warning", "说明"],
      ],
      rows: report.files.map((f) => ({
        ...f,
        languageLabel: languages[f.language].label,
        functionCount:
          f.functionStatus === "complete" ? f.functions.length : null,
      })),
    },
    {
      name: "函数明细",
      columns: [
        ["file", "文件"],
        ["language", "语言"],
        ["name", "函数"],
        ["startLine", "起始行"],
        ["endLine", "结束行"],
        ["length", "非空白行数"],
        ["status", "解析状态"],
      ],
      rows: report.functions,
    },
    {
      name: "统计口径",
      columns: [
        ["item", "项目"],
        ["value", "说明"],
      ],
      rows: Object.entries(report.policy).map(([item, value]) => ({
        item,
        value,
      })),
    },
  ];
}
export function reportCSV(report) {
  const table = reportTables(report)[0];
  const cell = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
  return (
    "\ufeff" +
    [
      table.columns.map((c) => c[1]),
      ...table.rows.map((r) => table.columns.map(([key]) => r[key])),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
