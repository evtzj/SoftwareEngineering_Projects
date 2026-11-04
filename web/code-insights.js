export function reportInsights(report) {
  const total = report.total.code;
  return {
    languages: report.summary
      .filter((row) => row.files)
      .sort((a, b) => b.code - a.code)
      .map((row) => ({
        name: row.language,
        code: row.code,
        files: row.files,
        percent: total ? Math.round((row.code / total) * 1000) / 10 : 0,
      })),
    longest: report.functions
      .filter((fn) => fn.status === "complete")
      .sort(
        (a, b) =>
          b.length - a.length ||
          a.file.localeCompare(b.file) ||
          a.startLine - b.startLine,
      )
      .slice(0, 5),
    incomplete: report.files.filter(
      (file) => file.functionStatus !== "complete",
    ).length,
  };
}

export function selectFunctions(functions, query = "", order = "source") {
  const text = query.trim().toLocaleLowerCase();
  const selected = functions.filter((fn) =>
    `${fn.file} ${fn.name}`.toLocaleLowerCase().includes(text),
  );
  return order === "length"
    ? selected.sort(
        (a, b) =>
          b.length - a.length ||
          a.file.localeCompare(b.file) ||
          a.startLine - b.startLine,
      )
    : selected;
}
