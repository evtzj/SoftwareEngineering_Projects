import { languages } from "./logic.js";
import { buildCodeReport, metricPolicy } from "./code-report.js";
export function readReportBackup(value, name = "导入报告") {
  const snapshots = Array.isArray(value)
    ? value
    : [
        {
          version: 1,
          id: crypto.randomUUID(),
          name,
          date: new Date().toISOString(),
          report: value,
        },
      ];
  if (!snapshots.length || !validSnapshots(snapshots))
    throw new Error("请选择本网站导出的报告 JSON 或历史备份。");
  if (
    snapshots.some(
      (s) => JSON.stringify(s.report.policy) !== JSON.stringify(metricPolicy),
    )
  )
    throw new Error("报告的统计口径与当前版本不同，请使用原版本查看。");
  return snapshots.map((s) => ({
    ...s,
    report: buildCodeReport(structuredClone(s.report.files)),
  }));
}
export function createSnapshot(
  name,
  files,
  id = crypto.randomUUID(),
  date = new Date().toISOString(),
) {
  return {
    version: 1,
    id,
    name: name.trim().slice(0, 80) || "项目统计",
    date,
    report: buildCodeReport(structuredClone(files)),
  };
}
export function validSnapshots(value) {
  const counts = (row) =>
    row &&
    ["files", "code", "blank", "comment", "total"].every(
      (k) => Number.isFinite(row[k]) && row[k] >= 0,
    ) &&
    (row.functionCount === null || Number.isFinite(row.functionCount));
  return (
    Array.isArray(value) &&
    new Set(value.map((s) => s?.id)).size === value.length &&
    value.every(
      (s) =>
        s?.version === 1 &&
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        typeof s.date === "string" &&
        Number.isFinite(Date.parse(s.date)) &&
        s.report &&
        Array.isArray(s.report.files) &&
        Array.isArray(s.report.summary) &&
        counts(s.report.total) &&
        s.report.summary.every(counts) &&
        s.report.files.every(
          (f) =>
            typeof f.name === "string" &&
            Object.hasOwn(languages, f.language) &&
            Array.isArray(f.functions) &&
            ["code", "blank", "comment", "total"].every(
              (k) => Number.isFinite(f[k]) && f[k] >= 0,
            ),
        ),
    )
  );
}
export function compareSnapshots(before, after) {
  if (before.id === after.id) throw new Error("请选择两份不同的报告。");
  if (
    JSON.stringify(before.report.policy) !== JSON.stringify(after.report.policy)
  )
    throw new Error("两份报告的统计口径不同，无法直接比较。");
  const delta = (a, b) =>
    a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)
      ? null
      : b - a;
  const metrics = [
    "files",
    "code",
    "blank",
    "comment",
    "total",
    "functionCount",
  ].map((key) => ({
    key,
    before: before.report.total[key],
    after: after.report.total[key],
    delta: delta(before.report.total[key], after.report.total[key]),
  }));
  const keys = [
    ...new Set(
      [...before.report.summary, ...after.report.summary].map((r) => r.key),
    ),
  ];
  const languages = keys.map((key) => {
    const a = before.report.summary.find((r) => r.key === key),
      b = after.report.summary.find((r) => r.key === key);
    return {
      language: (b || a).language,
      before: a?.code ?? 0,
      after: b?.code ?? 0,
      delta: (b?.code ?? 0) - (a?.code ?? 0),
      functionDelta: delta(a ? a.functionCount : 0, b ? b.functionCount : 0),
    };
  });
  return { before: before.name, after: after.name, metrics, languages };
}
export function comparisonCSV(comparison) {
  const labels = {
    files: "源文件数",
    code: "代码行",
    blank: "空行",
    comment: "注释行",
    total: "总行数",
    functionCount: "函数个数",
  };
  const cell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  return (
    "\ufeff" +
    [
      ["指标", comparison.before, comparison.after, "变化"],
      ...comparison.metrics.map((m) => [
        labels[m.key],
        m.before,
        m.after,
        m.delta,
      ]),
      [],
      ["语言", "原代码行", "新代码行", "代码行变化", "函数数变化"],
      ...comparison.languages.map((r) => [
        r.language,
        r.before,
        r.after,
        r.delta,
        r.functionDelta,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
