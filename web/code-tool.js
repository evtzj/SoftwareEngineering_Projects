import { createSnapshot, validSnapshots, compareSnapshots, comparisonCSV } from "./code-history.js";
import { repositoryFiles } from "./github-source.js";
import { languages, detectLanguage } from "./logic.js";
import {
  buildCodeReport,
  summaryColumns,
  metricPolicy,
  reportCSV,
} from "./code-report.js";
import { codeSamples } from "./code-samples.js";

const $ = (selector) => document.querySelector(selector);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const number = (value) =>
  value === null
    ? "—"
    : value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
let rows = [],
  busy = false,
  message = "",
  worker;
let archives = [];
try { const stored=JSON.parse(localStorage.getItem("code-report-history") || "[]"); if(validSnapshots(stored))archives=stored.slice(0,10); } catch {}
let comparison = null, comparisonMode = "metrics";
const metricLabels={files:"源文件数",code:"代码行",blank:"空行",comment:"注释行",total:"总行数",functionCount:"函数个数"};
const difference = value => value === null ? "—" : value > 0 ? `+${number(value)}` : number(value);
function archiveView() {
  const comparing=location.hash === "#code/compare";
  return `<section class="feature-surface code-archive"><div class="feature-title"><div><h2>${comparing ? "版本对比" : "报告历史"}</h2><p>${comparing ? "选择两份报告，看看项目发生了哪些变化。" : "保存最多 10 份完整报告，刷新后仍可查看。"}</p></div></div><nav class="archive-switch" aria-label="报告历史功能"><a href="#code/history" ${!comparing ? 'aria-current="page"' : ''}>历史报告</a><a href="#code/compare" ${comparing ? 'aria-current="page"' : ''}>版本对比</a></nav><div class="archive-list">${archives.map(s=>`<article class="archive-row"><div><h3>${escape(s.name)}</h3><p>${escape(new Date(s.date).toLocaleString('zh-CN'))} · ${number(s.report.total.files)} 个文件 · ${number(s.report.total.total)} 行</p></div><div class="feature-actions"><button class="text-link" data-archive-open="${escape(s.id)}">打开报告</button><button class="text-link" data-archive-delete="${escape(s.id)}" aria-label="删除报告：${escape(s.name)}">删除</button></div></article>`).join('') || '<div class="feature-empty">还没有保存报告。完成一次统计后，在报告页点击“保存到历史”。</div>'}</div>${archives.length>=2 ? `<form id="compare-form"><div class="feature-fields"><label>较早报告<select id="compare-before">${archives.map((s,i)=>`<option value="${escape(s.id)}" ${i===1?'selected':''}>${escape(s.name)}</option>`).join('')}</select></label><label>较新报告<select id="compare-after">${archives.map(s=>`<option value="${escape(s.id)}">${escape(s.name)}</option>`).join('')}</select></label></div><button class="button primary" type="submit">对比报告</button></form>` : ''}<p id="compare-status" role="status"></p><div id="code-comparison">${comparisonView()}</div>${comparing && archives.length<2 ? '<div class="feature-empty">至少保存两份报告后，即可比较指标变化。</div>' : ''}<p class="feature-footnote">报告保存在当前浏览器，包含文件与函数明细。变化表示指标增减，不等同于工作量或代码质量。</p></section>`;
}
function comparisonView() {
  if(!comparison)return '';
  const metrics=table([['label','指标'],['before','原值'],['after','新值'],['change','变化']],comparison.metrics.map(r=>({...r,label:metricLabels[r.key],change:difference(r.delta)})));
  const byLanguage=table([['language','语言'],['before','原代码行'],['after','新代码行'],['change','代码行变化'],['functions','函数数变化']],comparison.languages.map(r=>({...r,change:difference(r.delta),functions:difference(r.functionDelta)})));
  return `<div class="feature-title"><div><h2>统计变化</h2><p>${escape(comparison.before)} → ${escape(comparison.after)}</p></div><button class="button outline small" id="download-comparison">导出对比 CSV</button></div><div class="filter-group comparison-filter" role="group" aria-label="对比维度"><button data-comparison-mode="metrics" aria-pressed="${comparisonMode==='metrics'}">总体变化</button><button data-comparison-mode="languages" aria-pressed="${comparisonMode==='languages'}">按语言比较</button></div>${comparisonMode==='metrics' ? metrics : byLanguage}<p class="feature-footnote">函数指标不可用时显示“—”，不按 0 计算变化。</p>`;
}
function storeArchives(next) {
  try { localStorage.setItem("code-report-history",JSON.stringify(next));archives=next;return true; }
  catch { setStatus("浏览器空间不足或存储不可用，报告历史未能更新。请先导出报告备份。");return false; }
}
function redrawCode() {
  if(!$(".code-page"))return;
  $("#main").innerHTML=codeView();bindCode();
}
function analyze(input) {
  worker ??= new Worker(new URL("./code-worker.js", import.meta.url), {
    type: "module",
  });
  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => resolve(event.data);
    worker.onerror = () => {
      worker.terminate();
      worker = null;
      reject(new Error("无法启动代码分析，请刷新页面后重试"));
    };
    worker.postMessage(input);
  });
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function setStatus(text) {
  message = text;
  if ($("#code-status")) $("#code-status").textContent = text;
  if ($(".report-status")) $(".report-status").textContent = text;
}
function toggleBusy(value) {
  busy = value;
  for (const id of [
    "choose-files",
    "choose-folder",
    "load-project-sample",
    "count-paste",
    "clear-code",
    "count-repository",
    "save-snapshot",
  ])
    if ($("#" + id)) $("#" + id).disabled = value || (id === "save-snapshot" && !rows.length);
}
export function codeView() {
  const route = location.hash.slice(1);
  return `<div class="page-container code-page"><div class="breadcrumb"><a href="#start">首页</a><span>/</span><span>代码统计</span></div>
    <div class="tool-page-heading"><div><span class="eyebrow">让每一行，都有迹可循</span><h1>代码统计</h1><p>按语言整理代码规模，查看函数长度，导出一份完整报告。</p></div></div>
    <nav class="task-nav" aria-label="代码统计页面">${[["code", "1. 导入源码"], ["code/report", "2. 统计报告"], ["code/files", "文件明细"], ["code/functions", "函数明细"], ["code/history", "历史与对比"]].map(([key,label]) => `<a href="#${key}" ${(route === key || (key === "code/history" && route === "code/compare")) ? 'aria-current="page"' : ''}>${label}</a>`).join("")}</nav><p class="report-status" role="status">${escape(message)}</p><div class="code-workspace"><section class="panel code-input"><div class="panel-title"><h2>导入源码</h2></div>
      <div class="dropzone" id="dropzone"><span class="source-mark">&lt; / &gt;</span><h3>选择文件或整个项目</h3><p>也可以将代码文件拖到这里</p><div class="upload-buttons"><button class="button primary small" id="choose-files">选择文件</button><button class="button outline small" id="choose-folder">选择文件夹</button></div><small>C / C++ / JAVA / PYTHON / C# / JS / TS 等</small><input type="file" id="code-files" multiple hidden accept="${Object.values(
        languages,
      )
        .flatMap((l) => l.extensions.map((e) => "." + e))
        .join(
          ",",
        )}"><input type="file" id="code-folder" multiple webkitdirectory hidden></div>
      <details class="repository-details"><summary>GitHub 仓库</summary><form id="repository-form"><label>仓库链接<input id="repository-url" type="url" required placeholder="https://github.com/owner/repo"></label><div class="repo-fields"><label>分支（可选）<input id="repository-branch" placeholder="默认分支"></label><label>子目录（可选）<input id="repository-directory" placeholder="例如 src"></label></div><details><summary>访问 Token（可选）</summary><input id="repository-token" type="password" autocomplete="off" aria-label="GitHub Token" placeholder="仅本次请求使用，不保存"><p class="source-note">Token 仅发送到 GitHub API。源码下载需仓库公开可访问。</p></details><button class="button primary small" id="count-repository" type="submit">统计仓库 ↗</button></form></details>
      <button class="text-link project-sample" id="load-project-sample">载入五语言示例项目 ↗</button>
      <details class="paste-details"><summary>也可以直接粘贴代码 <span>＋</span></summary><div class="paste-heading"><label for="paste-language">语言</label><select id="paste-language">${Object.entries(
        languages,
      )
        .map(([k, l]) => `<option value="${k}">${l.label}</option>`)
        .join(
          "",
        )}</select><button class="text-link" id="load-sample">填入示例</button></div><textarea id="paste-code" rows="8" spellcheck="false" placeholder="在这里粘贴代码…" aria-label="粘贴代码"></textarea><button class="button primary small" id="count-paste">统计这段代码 ↗</button></details>
      <p class="source-note">本地源码只在浏览器内读取；仓库统计需连接 GitHub 与 jsDelivr。自动跳过依赖目录、构建输出和不支持的文件。</p><div id="code-status" class="status-message" role="status" aria-live="polite">${escape(message)}</div></section>
      <section class="panel code-overview"><div class="panel-title"><h2>统计概览</h2><button class="text-link" id="clear-code">清空</button></div><div id="code-overview"></div></section></div>
    <section class="panel code-report-panel"><div class="report-heading"><div><span class="eyebrow">ANALYSIS REPORT</span><h2>语言汇总</h2></div><div class="report-exports"><button class="button outline small" data-export="csv" id="export-code">导出 CSV</button><button class="button outline small" data-export="json">导出 JSON</button><button class="button primary small" data-export="xlsx">导出 Excel</button></div></div><div class="snapshot-save"><label>报告名称<input id="snapshot-name" maxlength="80" placeholder="例如：项目初版"></label><button class="button outline small" id="save-snapshot">保存到历史</button></div><p class="report-caption">最大值、最小值、均值和中位数：函数的非空白行数，单位为行。窄屏下可横向滚动表格。</p><div id="code-summary"></div>
    <div class="code-details-grid"><div class="files-page"><h3>文件明细</h3><div id="code-files-table"></div></div><div class="functions-page"><h3>函数明细</h3><div id="code-functions-table"></div></div></div></section>
    ${archiveView()}<details class="code-policy"><summary>统计口径与实现思路</summary><dl>${Object.entries(
      metricPolicy,
    )
      .map(
        ([key, value]) =>
          `<div><dt>${{ lines: "行数分类", functions: "函数定义", length: "函数长度", aggregation: "汇总方式", missing: "缺失值", headers: "文件与语言" }[key]}</dt><dd>${escape(value)}</dd></div>`,
      )
      .join(
        "",
      )}</dl><p>源码 → 语法树识别注释与函数 → 单文件统计 → 按语言汇总 → 页面与多格式导出。分析、汇总、输出分别实现，修改导出格式不改变统计规则。详细说明见仓库 docs/代码统计设计.md。</p></details></div>`;
}
function table(columns, items, className = "") {
  return `<div class="table-scroll ${className}"><table><thead><tr>${columns.map((c) => `<th scope="col">${escape(c[1])}</th>`).join("")}</tr></thead><tbody>${items.map((item) => `<tr>${columns.map(([key]) => `<td>${typeof item[key] === "number" || item[key] === null ? number(item[key]) : escape(item[key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function renderResults() {
  if (!$("#code-summary")) return;
  const report = buildCodeReport(rows),
    total = report.total;
  $("#code-overview").innerHTML = rows.length
    ? `<div class="stat-total"><span>总行数 <small>/ ${rows.length} 个文件</small></span><strong>${number(total.total)}</strong></div><div class="code-stats">${[
        ["code", "代码行"],
        ["comment", "注释行"],
        ["blank", "空白行"],
      ]
        .map(
          ([key, label]) =>
            `<div><strong>${number(total[key])}</strong><span>${label}</span></div>`,
        )
        .join(
          "",
        )}</div><div class="composition-bar">${["code", "comment", "blank"].map((k) => `<span class="bar-${k}" style="width:${total.total ? (total[k] / total.total) * 100 : 0}%"></span>`).join("")}</div><div class="code-function-total"><span>函数 / 方法</span><strong>${number(total.functionCount)}</strong><span>平均长度 <b>${number(total.mean)}</b> 行</span></div>${rows.some((r) => r.warning) ? '<p class="analysis-warning">部分文件的函数分析不可用，见文件明细中的说明。</p>' : '<p class="analysis-complete">已完成语法分析 · 函数长度不计空行</p>'}`
    : `<div class="code-ready"><span>{ }</span><h3>从一份源码开始</h3><p>导入后即可查看语言汇总、文件明细和函数长度。也可以载入示例项目体验。</p></div>`;
  $("#code-summary").innerHTML = table(
    summaryColumns,
    [...report.summary, report.total],
    "summary-scroll",
  );
  $("#code-files-table").innerHTML = rows.length
    ? table(
        [
          ["name", "文件"],
          ["label", "语言"],
          ["code", "代码"],
          ["comment", "注释"],
          ["blank", "空白"],
          ["functionCount", "函数"],
          ["warning", "说明"],
        ],
        rows.map((r) => ({
          ...r,
          label: languages[r.language].label,
          functionCount:
            r.functionStatus === "complete" ? r.functions.length : null,
          warning: r.warning || "完成",
        })),
      )
    : '<p class="empty-inline">尚未导入源码。</p>';
  $("#code-functions-table").innerHTML = report.functions.length
    ? table(
        [
          ["file", "文件"],
          ["name", "函数"],
          ["startLine", "起始行"],
          ["endLine", "结束行"],
          ["length", "非空白行数"],
        ],
        report.functions,
      )
    : '<p class="empty-inline">暂无可列出的函数定义。</p>';
  $("#save-snapshot").disabled = !rows.length || busy;
  document
    .querySelectorAll("[data-export]")
    .forEach((button) => (button.disabled = !rows.length));
}
async function processFiles(files, acquired = false) {
  if (busy && !acquired) return;
  toggleBusy(true);
  const next = [];
  let skipped = 0,
    failed = 0;
  const errors = [];
  const all = [...files];
  try {
    for (const [index, file] of all.entries()) {
      const name = file.webkitRelativePath || file.name,
        language = file.language || detectLanguage(name);
      if (
        !language ||
        name
          .split("/")
          .some((part) =>
            [
              ".git",
              "node_modules",
              ".tools",
              "vendor",
              "dist",
              "build",
              "coverage",
              ".venv",
              "venv",
              "__pycache__",
            ].includes(part),
          )
      ) {
        skipped++;
        continue;
      }
      setStatus(`正在分析 ${index + 1} / ${all.length}：${name}`);
      try {
        next.push(
          await analyze({
            name,
            language,
            text: typeof file.text === "string" ? file.text : await file.text(),
          }),
        );
      } catch (error) {
        failed++;
        errors.push(`${name}：${error.message}`);
        setStatus(error.message);
      }
    }
    rows = next.sort((a, b) => a.name.localeCompare(b.name));
    if (next.length && location.hash.startsWith("#code")) location.hash = "code/report";
    renderResults();
    setStatus(
      `已统计 ${next.length} 个文件${skipped ? `，跳过 ${skipped} 个文件` : ""}${failed ? `，failed ${failed} 个文件读取或分析失败。${errors.slice(0, 3).join("；")}` : ""}。`,
    );
  } finally {
    toggleBusy(false);
  }
}
const simpleSample =
  '// 一个小小的问候\nfunction greet(name) {\n  /* 把想法变成现实 */\n  const message = "Hello, " + name;\n  console.log(message);\n}\n\ngreet("world");\n';
export function bindCode() {
  $("#save-snapshot").onclick=()=>{
    if(busy || !rows.length)return;
    const name=$("#snapshot-name").value.trim() || `统计报告 ${archives.length+1}`;
    const snapshot=createSnapshot(name,rows);
    if(storeArchives([snapshot,...archives].slice(0,10))) {
      setStatus(`已保存“${name}”，可在“历史与对比”中查看。`);
      redrawCode();
    }
  };
  document.querySelectorAll('[data-archive-open]').forEach(b=>b.onclick=()=>{
    if(busy)return;
    const snapshot=archives.find(s=>s.id===b.dataset.archiveOpen);
    if(!snapshot)return;
    rows=structuredClone(snapshot.report.files);
    setStatus(`已打开历史报告“${snapshot.name}”。`);
    location.hash="code/report";redrawCode();
  });
  document.querySelectorAll('[data-archive-delete]').forEach(b=>b.onclick=()=>{
    if(storeArchives(archives.filter(s=>s.id!==b.dataset.archiveDelete))) {comparison=null;redrawCode();}
  });
  $("#compare-form")?.addEventListener('submit',event=>{
    event.preventDefault();
    try {
      const before=archives.find(s=>s.id===$("#compare-before").value),after=archives.find(s=>s.id===$("#compare-after").value);
      comparison=compareSnapshots(before,after);
      $("#compare-status").textContent="";
      $("#code-comparison").innerHTML=comparisonView();
      bindComparison();
    } catch(error) {$("#compare-status").textContent=error.message;}
  });
  function bindComparison() {
    $("#download-comparison")?.addEventListener('click',()=>download(comparisonCSV(comparison),"代码统计对比.csv","text/csv;charset=utf-8"));
    document.querySelectorAll('[data-comparison-mode]').forEach(button=>button.onclick=()=>{
      comparisonMode=button.dataset.comparisonMode;
      $("#code-comparison").innerHTML=comparisonView();bindComparison();
    });
  }
  bindComparison();
  $("#repository-form").onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    const value = $("#repository-url").value;
    const token = $("#repository-token").value;
    const branch = $("#repository-branch").value.trim();
    const directory = $("#repository-directory").value.trim();
    $("#repository-token").value = "";
    toggleBusy(true);
    try {
      const files = await repositoryFiles(value, { token, branch, directory, status: setStatus });
      await processFiles(files, true);
    } catch (error) { setStatus(error.message); }
    finally { toggleBusy(false); }
  };
  $("#choose-files").onclick = () => $("#code-files").click();
  $("#choose-folder").onclick = () => $("#code-folder").click();
  for (const id of ["code-files", "code-folder"])
    $("#" + id).onchange = (event) => {
      processFiles(event.target.files);
      event.target.value = "";
    };
  const zone = $("#dropzone");
  zone.ondragover = (event) => {
    event.preventDefault();
    zone.classList.add("dragover");
  };
  zone.ondragleave = () => zone.classList.remove("dragover");
  zone.ondrop = (event) => {
    event.preventDefault();
    zone.classList.remove("dragover");
    processFiles(event.dataTransfer.files);
  };
  $("#load-project-sample").onclick = () => processFiles(codeSamples);
  $("#load-sample").onclick = () => {
    $("#paste-code").value =
      $("#paste-language").value === "javascript"
        ? simpleSample
        : codeSamples.find((s) => s.language === $("#paste-language").value)
            ?.text || "";
  };
  $("#count-paste").onclick = () => {
    const text = $("#paste-code").value,
      language = $("#paste-language").value;
    if (!text.trim()) {
      setStatus("请先粘贴代码。");
      $("#paste-code").focus();
      return;
    }
    processFiles([
      { name: "粘贴代码." + languages[language].extensions[0], language, text },
    ]);
  };
  $("#clear-code").onclick = () => {
    if (busy) return;
    rows = [];
    renderResults();
    setStatus("");
    location.hash = "code";
  };
  document.querySelectorAll("[data-export]").forEach(
    (button) =>
      (button.onclick = async () => {
        const report = buildCodeReport(rows);
        try {
          if (button.dataset.export === "csv")
            download(
              reportCSV(report),
              "代码量统计.csv",
              "text/csv;charset=utf-8",
            );
          if (button.dataset.export === "json")
            download(
              JSON.stringify(report, null, 2),
              "代码量统计.json",
              "application/json;charset=utf-8",
            );
          if (button.dataset.export === "xlsx") {
            button.disabled = true;
            const { reportXLSX } = await import("./code-xlsx.js");
            download(
              reportXLSX(report),
              "代码量统计.xlsx",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );
          }
        } catch (error) {
          setStatus("导出失败：" + error.message);
        } finally {
          button.disabled = !rows.length;
        }
      }),
  );
  renderResults();
  toggleBusy(busy);
}
