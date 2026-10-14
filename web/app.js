import {
  languages,
  detectLanguage,
  countCode,
  generateQuestions,
  gradeQuestions,
} from "./logic.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const icon = (name, size = 24) => {
  const paths = {
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/>',
    math: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 12h2m4 0h2m-8 5h2m4 0h2"/>',
    leaf: '<path d="M20 4C9 2 3 7 4 14s10 9 14 2c2-4 2-8 2-12ZM5 20 16 9"/>',
    book: '<path d="M12 5v16M12 5C9 2 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-2-10 1Z"/>',
    spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7ZM20 2v4m-2-2h4"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M3 15v5h18v-5"/>',
    download: '<path d="M12 3v13m-5-5 5 5 5-5M3 16v5h18v-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    folder: '<path d="M3 7V4h7l3 3h8v13H3Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    print: '<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6Z"/>',
    trophy:
      '<path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5m-4 1v6m-5 1h10"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
};
const defaults = {
  name: "小林",
  subtitle: "一名正在探索世界的大学生",
  bio: "喜欢记录，热爱创造。在学习与生活之间，慢慢找到自己的方向。这里收藏我的成长足迹，也存放那些从想法变成现实的小作品。",
  goal: "把好奇心，变成下一次出发。",
  events: [
    {
      id: "e1",
      date: "小时候",
      title: "好奇，是故事的开始",
      text: "拆开玩具，翻开书本，对世界问出第一个“为什么”。许多热爱的种子，都在那时悄悄发芽。",
      tag: "初识世界",
      demo: true,
    },
    {
      id: "e2",
      date: "中学时期",
      title: "找到喜欢的事，也遇见同行的人",
      text: "从课堂走向更大的世界。在一次次尝试里，认识自己的兴趣，也学会与伙伴一起完成一件事。",
      tag: "探索与尝试",
      demo: true,
    },
    {
      id: "e3",
      date: "大学生活",
      title: "第一次，用代码表达想法",
      text: "从一个 Hello World 开始，学习编程与软件工程。让抽象的想法变成看得见、用得上的小工具。",
      tag: "学习与创造",
      demo: true,
    },
    {
      id: "e4",
      date: "此刻",
      title: "为自己，留下一块成长的地方",
      text: "搭建这个个人主页，整理一路走来的记录。成长不一定轰轰烈烈，也可以是今天比昨天多迈出的一小步。",
      tag: "继续生长",
      demo: true,
    },
  ],
  works: [
    {
      id: "w1",
      date: "学习记录",
      title: "从零开始的编程笔记",
      text: "整理课堂笔记、练习过程与问题解法，让每一次“终于懂了”都有迹可循。",
      tag: "知识积累",
      demo: true,
    },
    {
      id: "w2",
      date: "协作经历",
      title: "和伙伴一起完成一件事",
      text: "记录小组项目里的分工、讨论与收获。好的作品，也来自认真沟通和彼此配合。",
      tag: "团队协作",
      demo: true,
    },
    {
      id: "w3",
      date: "个人作品",
      title: "我的第一个成长主页",
      text: "把个人故事和两个实用工具放在一起。这是软件工程课程设计，也是一次完整的创作练习。",
      tag: "网页设计",
      demo: true,
    },
  ],
};
function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
let profile = readStorage("growth-garden-profile", structuredClone(defaults));
let history = readStorage("growth-garden-practice", []);
let editor = null,
  codeRows = [],
  codeBusy = false;
let math = {
  count: 10,
  max: 20,
  operations: ["+", "-"],
  questions: [],
  answers: [],
  grade: null,
  started: null,
  elapsed: null,
};
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    toast("浏览器未能保存数据，当前页面仍可使用。");
    return false;
  }
}
function download(content, filename, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function landscape() {
  return `<div class="hero-art" aria-label="纸张拼贴风格的山野风景插画" role="img">
    <span class="art-note">Life is a journey.</span><span class="paper-tape"></span>
    <div class="landscape-frame"><div class="landscape-label">FIELD NOTES <span>VOL. 01</span></div>
    <svg class="landscape" viewBox="0 0 480 430" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#d9e4de"/><stop offset="1" stop-color="#f4e9cf"/></linearGradient><linearGradient id="mountain" x2="0" y2="1"><stop stop-color="#608171"/><stop offset="1" stop-color="#9aaf93"/></linearGradient><pattern id="grain" width="13" height="11" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".55" fill="#274e42" opacity=".13"/><circle cx="8" cy="9" r=".4" fill="#fff" opacity=".3"/></pattern></defs>
      <rect width="480" height="430" fill="url(#sky)"/><circle cx="343" cy="107" r="44" fill="#d58c57"/><path d="m0 265 65-59 45 20 70-108 105 149 64-85 131 101v147H0Z" fill="#a7b6a4"/><path d="m104 226 76-108 54 77-54-29-20 34-15-6Z" fill="#e7e8d7"/>
      <path d="M0 293 109 240l76 26 115-101 83 89 97-23v199H0Z" fill="url(#mountain)"/><path d="m242 216 58-51 52 56-54-20-13 17-17-12Z" fill="#d4decb"/>
      <path d="M0 289c71-11 98 52 180 51s141-79 300-27v117H0Z" fill="#477765"/><path d="M0 362c147-120 229 79 480-27v95H0Z" fill="#264f42"/><path d="M205 430c11-49 91-65 97-103 6-21-9-36-28-43 45 5 64 22 51 45-22 42-63 63-61 101Z" fill="#d7c69d"/>
      <g stroke="#204739" stroke-width="3" fill="#204739"><path d="M56 388V275m-20 36 20-36 20 36Zm-8 29 28-46 28 46ZM398 407V270m-23 44 23-44 23 44Zm-9 35 32-56 32 56Z"/><path d="M99 427V319m-18 32 18-32 18 32Zm-7 26 25-42 25 42ZM450 414V325m-17 32 17-32 17 32Z"/></g>
      <path d="m91 100 8-3 8 3m10-13 8-3 8 3" fill="none" stroke="#6d897a" stroke-width="2"/><rect width="480" height="430" fill="url(#grain)"/>
    </svg><div class="photo-caption"><span>去看世界，也看见自己。</span><span>↗</span></div></div>
    <div class="art-sticker">STAY<br><i>curious</i><span>✳</span></div><div class="art-caption">慢慢走，也会到达。<span>— 一张写给未来的明信片</span></div>
  </div>`;
}
function sectionTitle(number, english, title, description, action = "") {
  return `<div class="section-heading"><div><span class="eyebrow">${number} / ${english}</span><h2>${title}</h2><p>${description}</p></div>${action}</div>`;
}
function homeView() {
  const demo = [...profile.events, ...profile.works].some((item) => item.demo);
  return `<section class="hero page-container" id="home">
    <div class="hero-copy"><div class="hero-kicker"><span></span>一个持续生长的小小世界 <span class="demo-label">${demo ? "示例主页 · 可编辑" : "我的个人主页"}</span></div>
    <h1>你好，我是<br><span>${escape(profile.name)}</span><span class="hero-period">。</span></h1><p class="hero-subtitle">${escape(profile.subtitle)}</p><p class="hero-description">${escape(profile.bio)}</p>
    <div class="hero-actions"><a class="button primary" href="#growth">翻开我的故事 ${icon("arrow", 18)}</a><a class="text-link" href="#tools">逛逛工具箱 <span>→</span></a></div>
    <div class="hero-meta"><span class="little-star">✳</span><span>${escape(profile.goal)}</span><span class="hero-meta-line"></span></div></div>${landscape()}</section>
    <div class="intro-strip page-container"><span class="strip-label">MY LITTLE UNIVERSE</span><a href="#growth"><span class="strip-number">01</span><span>收藏一路的成长<small>GROWTH & MEMORIES</small></span><span>↗</span></a><a href="#works"><span class="strip-number">02</span><span>让想法留下形状<small>WORKS & ACHIEVEMENTS</small></span><span>&#8599;</span></a><a href="#tools"><span class="strip-number">03</span><span>做一点有用的东西<small>TOOLS & EXPERIMENTS</small></span><span>↗</span></a></div>
    <section class="section page-container" id="growth">${sectionTitle("01", "THE WAY I GROW", "每一程，都算数。", "从最初的好奇，到今天的自己。把重要的瞬间，轻轻收好。", '<button class="button outline small" data-add="events">＋ 添加足迹</button>')}
    <div class="timeline">${profile.events.map((e, i) => `<article class="timeline-item"><div class="timeline-date"><span>${escape(e.date)}</span><small>CHAPTER ${String(i + 1).padStart(2, "0")}</small></div><span class="timeline-node ${i === profile.events.length - 1 ? "last" : ""}"></span><div class="timeline-content"><div class="tag-row"><span class="tag">${escape(e.tag)}</span>${e.demo ? '<span class="sample-note">示例内容</span>' : ""}</div><h3>${escape(e.title)}</h3><p>${escape(e.text)}</p><button class="edit-link" data-edit="events" data-id="${escape(e.id)}">编辑记录 ↗</button></div></article>`).join("") || '<p class="empty-inline">新的故事，等你来写。点击“添加足迹”记录第一步。</p>'}</div></section>
    <section class="works-section" id="works"><div class="page-container section">${sectionTitle("02", "THINGS I HAVE MADE", "热爱，也会有回响。", "作品、收获与值得纪念的小成就，是认真走过的证明。", '<button class="button outline small" data-add="works">＋ 添加作品</button>')}
    <div class="works-grid">${profile.works.map((w, i) => `<article class="work-card"><div class="work-art work-art-${i % 3}">${icon(["book", "spark", "code"][i % 3], 42)}<span>${String(i + 1).padStart(2, "0")}</span><div class="art-lines"></div></div><div class="work-body"><div class="tag-row"><span class="tag">${escape(w.tag)}</span>${w.demo ? '<span class="sample-note">示例内容</span>' : ""}</div><h3>${escape(w.title)}</h3><p>${escape(w.text)}</p><div class="work-bottom"><span>${escape(w.date)}</span><button class="edit-link" data-edit="works" data-id="${escape(w.id)}">编辑 ${icon("arrow", 16)}</button></div></div></article>`).join("") || '<p class="empty-inline">在这里收藏你的第一件作品。</p>'}</div></div></section>
    <section class="section page-container" id="tools">${sectionTitle("03", "A SMALL TOOLBOX", "不止记录，也来动手。", "把课堂里的知识，变成生活里用得上的小工具。")}
      <div class="tool-grid"><a class="tool-card code-tool" href="#code"><span class="tool-number">PROJECT / 01</span><div class="tool-illustration"><span>{</span><div><i></i><i></i><i></i><i></i></div><span>}</span></div><div class="tool-card-bottom"><div><span class="tag">开发者的小帮手</span><h3>代码量统计</h3><p>看看你的项目，一共写了多少行。<br>区分代码、注释与空白，让工作量一目了然。</p></div><span class="circle-arrow">↗</span></div><div class="tool-footnote">多语言支持 <span>·</span> 文件 / 文件夹 <span>·</span> 导出报告</div></a>
      <a class="tool-card math-tool" href="#math"><span class="tool-number">PROJECT / 02</span><div class="math-illustration"><span>7 <i>+</i> 5</span><span class="math-equals">=</span><span class="answer-sticker">12<span>✓</span></span></div><div class="tool-card-bottom"><div><span class="tag">每天进步一点点</span><h3>四则运算练习</h3><p>为小学生生成一份专属练习。<br>自己设置难度，即时批改，轻松掌握每一步。</p></div><span class="circle-arrow">↗</span></div><div class="tool-footnote">自主出题 <span>·</span> 自动批改 <span>·</span> 打印练习</div></a></div>
    </section><section class="closing page-container"><span>✳</span><h2>故事还在继续，<br>下一页，留给明天。</h2><p>KEEP LEARNING. KEEP MAKING. KEEP GROWING.</p><div class="data-actions"><button class="text-link" id="export-profile">备份我的主页 ↓</button><button class="text-link" id="import-profile">导入备份 ↑</button><input type="file" id="profile-file" accept=".json" hidden></div></section>`;
}
function toolHeader(number, english, title, description, current) {
  return `<div class="page-container tool-page"><div class="breadcrumb"><a href="#tools">工具箱</a><span>/</span><span>${title}</span></div><div class="tool-page-heading"><div><span class="eyebrow">PROJECT ${number} / ${english}</span><h1>${title}<span class="heading-dot">.</span></h1><p>${description}</p></div><div class="tool-switch"><a href="#code" class="${current === "code" ? "active" : ""}">${icon("code", 18)} 代码量</a><a href="#math" class="${current === "math" ? "active" : ""}">${icon("math", 18)} 四则运算</a></div></div>`;
}
const codeSample = `// 一个小小的问候\nfunction greet(name) {\n  /* 把想法变成现实 */\n  const message = "Hello, " + name;\n  console.log(message);\n}\n\ngreet("world");\n`;
function codeView() {
  return `${toolHeader("01", "COUNT THE LITTLE EFFORTS", "代码量统计", "每一行，都是把想法变成现实的努力。", "code")}
    <div class="code-layout"><section class="panel upload-panel"><div class="panel-title">${icon("folder")}<h2>选择你的代码</h2><span>01</span></div><div class="dropzone" id="dropzone"><span class="upload-icon">${icon("upload", 30)}</span><h3>把代码文件拖到这里</h3><p>或选择本地文件、整个项目文件夹</p><div class="upload-buttons"><button class="button primary small" id="choose-files">选择文件</button><button class="button outline small" id="choose-folder">${icon("folder", 16)} 选择文件夹</button></div><input type="file" id="code-files" multiple hidden accept=".js,.mjs,.cjs,.jsx,.ts,.tsx,.py,.c,.cpp,.h,.hpp,.cc,.java,.css,.scss,.html,.htm,.vue,.json,.sql"><input type="file" id="code-folder" multiple webkitdirectory hidden><small>JS / TS / Python / C / C++ / Java / HTML / CSS / JSON / SQL</small></div>
      <details class="paste-details"><summary>也可以直接粘贴代码 <span>＋</span></summary><div class="paste-heading"><label for="paste-language">语言</label><select id="paste-language">${Object.entries(
        languages,
      )
        .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
        .join(
          "",
        )}</select><button class="text-link" id="load-sample">填入示例</button></div><textarea id="paste-code" spellcheck="false" placeholder="在这里粘贴代码…" rows="8" aria-label="粘贴代码"></textarea><button class="button primary small" id="count-paste">统计这段代码 ${icon("arrow", 16)}</button></details>
      <div class="privacy-note">${icon("leaf", 18)}<p>文件在浏览器内处理，不会上传。<br>自动跳过 .git、node_modules、构建输出和不支持的文件。</p></div><div class="status-message" id="code-status" role="status"></div></section>
      <section class="panel result-panel"><div class="panel-title">${icon("code")}<h2>统计概览</h2><button class="text-link" id="clear-code">清空</button></div><div id="code-results">${codeResults()}</div></section></div>
      <div class="explanation"><span>统计口径</span><p>按物理行统计；空白行独立计算，纯注释行计为注释，代码与注释同一行计为代码。末尾换行不多算一行。Python 三引号字符串按代码计；HTML 中的 script / style 按对应语言处理。这是基础词法统计，未预处理 C / C++ 宏，也不展开外部文件。</p></div></div>`;
}
function codeResults() {
  if (!codeRows.length)
    return `<div class="empty-state"><div class="empty-code">&lt; / &gt;</div><h3>你的努力，值得被看见。</h3><p>选择一些代码文件，<br>这里就会呈现项目的行数与语言分布。</p><span class="empty-caption">READY WHEN YOU ARE</span></div>`;
  const sum = codeRows.reduce(
    (a, r) => {
      for (const k of ["total", "code", "comment", "blank"]) a[k] += r[k];
      return a;
    },
    { total: 0, code: 0, comment: 0, blank: 0 },
  );
  const groups = Object.entries(languages)
    .map(([key, l]) => ({
      key,
      label: l.label,
      lines: codeRows
        .filter((r) => r.language === key)
        .reduce((n, r) => n + r.total, 0),
    }))
    .filter((g) => g.lines > 0);
  return `<div class="stat-total"><span>总行数 <small>/ ${codeRows.length} 个文件</small></span><strong>${sum.total.toLocaleString()}</strong></div><div class="code-stats"><div><span class="legend-dot code-dot"></span><strong>${sum.code}</strong><span>代码行</span></div><div><span class="legend-dot comment-dot"></span><strong>${sum.comment}</strong><span>注释行</span></div><div><span class="legend-dot blank-dot"></span><strong>${sum.blank}</strong><span>空白行</span></div></div><div class="composition-bar" aria-label="行数构成">${["code", "comment", "blank"].map((k) => `<span class="bar-${k}" style="width:${sum.total ? (sum[k] / sum.total) * 100 : 0}%"></span>`).join("")}</div><div class="language-breakdown"><h3>语言分布</h3>${groups.map((g, i) => `<div class="language-row"><span>${escape(g.label)}</span><div><i style="width:${(g.lines / sum.total) * 100}%;background:${["#315e4b", "#bc805b", "#8b9d74", "#869eac"][i % 4]}"></i></div><strong>${g.lines} 行</strong></div>`).join("")}</div><div class="file-heading"><h3>文件明细</h3><button class="text-link" id="export-code">${icon("download", 15)} 导出 CSV</button></div><div class="table-scroll"><table><thead><tr><th>文件</th><th>代码</th><th>注释</th><th>空白</th><th>总计</th></tr></thead><tbody>${codeRows.map((r) => `<tr><td title="${escape(r.name)}">${escape(r.name)}<small>${languages[r.language].label}</small></td><td>${r.code}</td><td>${r.comment}</td><td>${r.blank}</td><td>${r.total}</td></tr>`).join("")}</tbody></table></div>`;
}
function updateCodeResults() {
  $("#code-results").innerHTML = codeResults();
  $("#export-code")?.addEventListener("click", () => {
    const csvCell = (v) => '"' + String(v).replaceAll('"', '""') + '"';
    const total = codeRows.reduce(
      (a, r) =>
        ["code", "comment", "blank", "total"].map((k, i) => a[i] + r[k]),
      [0, 0, 0, 0],
    );
    const csv = [
      ["文件", "语言", "代码行", "注释行", "空白行", "总行数"],
      ...codeRows.map((r) => [
        r.name,
        languages[r.language].label,
        r.code,
        r.comment,
        r.blank,
        r.total,
      ]),
      ["合计", "", ...total],
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    download("\ufeff" + csv, "代码量统计.csv", "text/csv;charset=utf-8");
  });
}
async function processFiles(files) {
  if (codeBusy) return;
  codeBusy = true;
  const status = $("#code-status");
  const all = [...files];
  let skipped = 0,
    failed = 0;
  status.textContent = "正在读取文件…";
  const next = [];
  for (const file of all) {
    const path = file.webkitRelativePath || file.name;
    const language = detectLanguage(file.name);
    if (
      !language ||
      path
        .split("/")
        .some((part) =>
          [
            "node_modules",
            ".git",
            ".tools",
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
    try {
      next.push({
        name: path,
        language,
        ...countCode(await file.text(), language),
      });
    } catch {
      failed++;
    }
  }
  codeRows = next.sort((a, b) => a.name.localeCompare(b.name));
  if (location.hash === "#code") {
    updateCodeResults();
    status.textContent = `已统计 ${next.length} 个文件${skipped ? `，跳过 ${skipped} 个不支持或忽略的文件` : ""}${failed ? `，${failed} 个文件读取失败，请重新选择` : ""}。`;
  }
  codeBusy = false;
}
function bindCode() {
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
  $("#load-sample").onclick = () => {
    $("#paste-code").value = codeSample;
  };
  $("#count-paste").onclick = () => {
    const text = $("#paste-code").value;
    if (!text.trim()) {
      toast("先粘贴一段代码吧。");
      $("#paste-code").focus();
      return;
    }
    if (codeBusy) {
      toast("文件还在读取，请稍等。");
      return;
    }
    const language = $("#paste-language").value;
    codeRows = [
      {
        name: "粘贴代码." + languages[language].extensions[0],
        language,
        ...countCode(text, language),
      },
    ];
    updateCodeResults();
    $("#code-status").textContent = "已完成粘贴代码统计。";
  };
  $("#clear-code").onclick = () => {
    if (codeBusy) return;
    codeRows = [];
    updateCodeResults();
    $("#code-status").textContent = "";
  };
  updateCodeResults();
}

function mathView() {
  return `${toolHeader("02", "A LITTLE BETTER EVERY DAY", "四则运算练习", "今天也来一点小挑战，让进步看得见。", "math")}
    <div class="math-layout"><aside class="panel math-settings"><div class="panel-title">${icon("math")}<h2>定制一份练习</h2></div><form id="math-settings"><fieldset><legend>01 <span>数字与结果范围</span></legend><div class="range-options">${[10, 20, 100].map((n) => `<label><input type="radio" name="max" value="${n}" ${math.max === n ? "checked" : ""}><span>${n}<small>以内</small></span></label>`).join("")}</div></fieldset><fieldset><legend>02 <span>选择运算</span></legend><div class="operator-options">${[
      ["+", "＋", "加法"],
      ["-", "−", "减法"],
      ["*", "×", "乘法"],
      ["/", "÷", "除法"],
    ]
      .map(
        ([op, symbol, label]) =>
          `<label><input type="checkbox" name="operation" value="${op}" ${math.operations.includes(op) ? "checked" : ""}><span><b>${symbol}</b>${label}</span></label>`,
      )
      .join(
        "",
      )}</div></fieldset><label class="count-label" for="question-count"><span>03 <b>题目数量</b></span><select id="question-count" name="count">${[5, 10, 20, 30].map((n) => `<option value="${n}" ${math.count === n ? "selected" : ""}>${n} 道题</option>`).join("")}</select></label><button class="button primary generate-button" type="submit">${icon("spark", 19)} ${math.questions.length ? "生成新练习" : "生成我的练习"} <span>↗</span></button></form><div class="math-tip"><span>✳</span><div><h3>一点点，就很好。</h3><p>减法不出现负数，除法可以整除。乘除法使用九九乘法表，数字和结果均在所选范围内。</p></div></div><div class="history-head"><h3>最近练习</h3>${history.length ? '<button class="text-link" id="clear-history">清空</button>' : ""}</div><div id="practice-history">${
      history.length
        ? history
            .slice(0, 5)
            .map(
              (h) =>
                `<div class="history-row"><div><span>${escape(h.date)}</span><small>${h.total} 道题 · ${h.max} 以内${h.retry ? " · 错题重练" : ""}</small></div><strong>${h.score}<small>分</small></strong></div>`,
            )
            .join("")
        : '<p class="history-empty">第一份练习，从今天开始。</p>'
    }</div></aside>
    <section class="panel worksheet-panel" id="worksheet-panel">${worksheet()}</section></div><div class="explanation"><span>小提示</span><p>所有题目都不重复；已选择的运算会均匀出现。填写后点击“交卷批改”，留空的题目会计为未答。练习记录保存在当前浏览器。</p></div></div>`;
}
function worksheet() {
  if (!math.questions.length)
    return `<div class="math-empty"><div class="empty-math-art"><span>3</span><span>+</span><span>2</span><i>?</i><span class="math-art-star">✳</span></div><span class="eyebrow">A FRESH LITTLE CHALLENGE</span><h2>准备好，开动小脑筋。</h2><p>选择左侧的范围、运算和题量，<br>给自己生成一份刚刚好的练习。</p><div class="empty-steps"><span>① 定制练习</span><i>→</i><span>② 认真作答</span><i>→</i><span>③ 看见进步</span></div></div>`;
  const grade = math.grade;
  return `<div class="worksheet-heading"><div><span class="eyebrow">TODAY'S PRACTICE ${math.retry ? " / 错题重练" : ""}</span><h2>${math.retry ? "再来一次，一定可以。" : "一小步，也是进步。"}</h2></div><button class="icon-button" id="print-math" aria-label="打印练习">${icon("print", 22)}</button></div><div class="worksheet-meta"><span>${math.questions.length} 道题 · ${math.max} 以内</span><span id="answer-progress">已完成 ${math.answers.filter((v) => String(v ?? "").trim() !== "").length} / ${math.questions.length}</span></div><div class="progress-track"><i id="answer-progress-bar" style="width:${(math.answers.filter((v) => String(v ?? "").trim() !== "").length / math.questions.length) * 100}%"></i></div>
    ${grade ? `<div class="grade-banner ${grade.score === 100 ? "perfect" : ""}"><div><span class="grade-icon">${grade.score === 100 ? "✳" : "✓"}</span><div><h3>${grade.score === 100 ? "全对啦，今天的你很棒！" : "每次练习，都是一次成长。"}</h3><p>答对 ${grade.correct} / ${grade.total} 道${grade.unanswered ? ` · 未答 ${grade.unanswered} 道` : ""} · 用时 ${math.elapsed} 秒</p></div></div><strong>${grade.score}<small>分</small></strong></div>` : ""}
    <form id="answer-form"><div class="questions-grid">${math.questions
      .map((q, i) => {
        const row = grade?.rows[i];
        return `<div class="question ${row ? (row.correct ? "correct" : "incorrect") : ""}"><label for="answer-${i}"><span class="question-number">${String(i + 1).padStart(2, "0")}</span><span class="expression">${q.expression} =</span></label><input type="text" inputmode="numeric" autocomplete="off" id="answer-${i}" data-answer="${i}" aria-label="第 ${i + 1} 题，${q.expression} 的答案" value="${escape(math.answers[i] ?? "")}" ${grade ? "readonly" : ""}><span class="answer-mark">${row ? (row.correct ? "✓" : "×") : ""}</span>${row && !row.correct ? `<small class="answer-correction">${row.answered ? "正确答案" : "未作答，答案"}：${q.answer}</small>` : ""}</div>`;
      })
      .join("")}</div>
    <div class="worksheet-actions">${grade ? `<div><button class="button primary" type="button" id="next-practice">再练一组 ${icon("arrow", 17)}</button>${grade.correct < grade.total ? '<button class="button outline" type="button" id="retry-wrong">只练错题</button>' : ""}</div>` : `<span class="worksheet-encourage">仔细想一想，你可以的。</span><button class="button primary" type="submit">交卷批改 ${icon("check", 18)}</button>`}</div></form><div class="worksheet-download"><button class="text-link" id="download-math">${icon("download", 16)} 下载题目</button><label><input type="checkbox" id="include-answers"> 附带答案（下载 / 打印）</label></div>`;
}
function generateMath(settings) {
  try {
    const questions = generateQuestions(settings);
    math = {
      ...settings,
      questions,
      answers: [],
      grade: null,
      started: Date.now(),
      elapsed: null,
      retry: false,
    };
    renderMath();
    toast("新练习已准备好，加油！");
  } catch (error) {
    toast(error.message);
  }
}
function renderMath() {
  $("#main").innerHTML = mathView();
  bindMath();
}
function practiceSettings() {
  const form = new FormData($("#math-settings"));
  return {
    count: Number(form.get("count")),
    max: Number(form.get("max")),
    operations: form.getAll("operation"),
  };
}
function bindMath() {
  $("#math-settings").onsubmit = (event) => {
    event.preventDefault();
    generateMath(practiceSettings());
  };
  $("#clear-history")?.addEventListener("click", () => {
    history = [];
    persist("growth-garden-practice", history);
    renderMath();
  });
  $$("[data-answer]").forEach(
    (input) =>
      (input.oninput = () => {
        math.answers[Number(input.dataset.answer)] = input.value;
        const answered = math.answers.filter(
          (v) => String(v ?? "").trim() !== "",
        ).length;
        $("#answer-progress").textContent =
          `已完成 ${answered} / ${math.questions.length}`;
        $("#answer-progress-bar").style.width =
          (answered / math.questions.length) * 100 + "%";
      }),
  );
  $("#answer-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (math.grade) return;
    if (!math.answers.some((v) => String(v ?? "").trim() !== "")) {
      toast("先试着回答一道题吧。");
      $("#answer-0").focus();
      return;
    }
    math.grade = gradeQuestions(math.questions, math.answers);
    math.elapsed = Math.max(1, Math.round((Date.now() - math.started) / 1000));
    history.unshift({
      date: new Date().toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      }),
      total: math.questions.length,
      max: math.max,
      score: math.grade.score,
      retry: math.retry,
    });
    history = history.slice(0, 20);
    persist("growth-garden-practice", history);
    renderMath();
  });
  $("#next-practice")?.addEventListener("click", () =>
    generateMath(practiceSettings()),
  );
  $("#retry-wrong")?.addEventListener("click", () => {
    math.questions = math.grade.rows
      .filter((q) => !q.correct)
      .map(({ a, b, op, answer, expression }) => ({
        a,
        b,
        op,
        answer,
        expression,
      }));
    math.answers = [];
    math.grade = null;
    math.started = Date.now();
    math.elapsed = null;
    math.retry = true;
    renderMath();
  });
  $("#download-math")?.addEventListener("click", () => {
    let text =
      `四则运算练习 · ${math.max}以内\n姓名：____________ 日期：____________\n\n` +
      math.questions
        .map((q, i) => `${i + 1}. ${q.expression} = ______`)
        .join("\n");
    if ($("#include-answers").checked)
      text +=
        "\n\n参考答案\n" +
        math.questions.map((q, i) => `${i + 1}. ${q.answer}`).join("\n");
    download(text, "四则运算练习.txt");
  });
  $("#print-math")?.addEventListener("click", () => {
    $("#print-sheet").innerHTML =
      `<h1>四则运算练习</h1><p>姓名：________________　日期：________________</p><p>${math.max} 以内 · 共 ${math.questions.length} 题</p><div class="print-questions">${math.questions.map((q, i) => `<div>${i + 1}.　${q.expression} = ______</div>`).join("")}</div>${$("#include-answers").checked ? `<div class="print-answers"><h2>参考答案</h2><p>${math.questions.map((q, i) => `${i + 1}. ${q.answer}`).join("　 /　 ")}</p></div>` : ""}`;
    window.print();
  });
}

function openEditor(kind, id) {
  editor = { kind, id };
  const personal = kind === "profile";
  const item = personal
    ? profile
    : profile[kind].find((e) => e.id === id) || {
        date: "",
        title: "",
        text: "",
        tag: "",
      };
  $("#dialog-title").textContent = personal
    ? "让主页，更像你。"
    : id
      ? "编辑这段故事。"
      : "记下新的瞬间。";
  const fields = personal
    ? [
        ["name", "你的名字", "input", 20],
        ["subtitle", "一句话介绍", "input", 60],
        ["bio", "关于自己", "textarea", 400],
        ["goal", "此刻想说的话", "input", 80],
      ]
    : [
        ["date", "时间或阶段", "input", 40],
        ["title", "标题", "input", 80],
        ["tag", "标签", "input", 20],
        ["text", "故事或作品介绍", "textarea", 600],
      ];
  $("#editor-fields").innerHTML =
    fields
      .map(
        ([key, label, type, max]) =>
          `<label class="editor-field" for="field-${key}">${label}${type === "textarea" ? `<textarea id="field-${key}" name="${key}" maxlength="${max}" rows="4" required>${escape(item[key])}</textarea>` : `<input id="field-${key}" name="${key}" maxlength="${max}" value="${escape(item[key])}" required>`}</label>`,
      )
      .join("") +
    (id && !personal
      ? '<button class="delete-record" type="button" id="delete-record">删除这条记录</button>'
      : "");
  $("#delete-record")?.addEventListener("click", () => {
    profile[kind] = profile[kind].filter((item) => item.id !== id);
    persist("growth-garden-profile", profile);
    $("#editor-dialog").close();
    render(false);
    toast("记录已删除。");
  });
  $("#editor-dialog").showModal();
}
$("#edit-profile").onclick = () => openEditor("profile");
$("#close-dialog").onclick = $("#cancel-dialog").onclick = () =>
  $("#editor-dialog").close();
$("#editor-form").onsubmit = (event) => {
  event.preventDefault();
  const fields = Object.fromEntries(
    [...new FormData(event.target)].map(([k, v]) => [k, String(v).trim()]),
  );
  if (Object.values(fields).some((v) => !v)) {
    toast("请填写完整，空格不算内容哦。");
    return;
  }
  if (editor.kind === "profile") Object.assign(profile, fields);
  else {
    const list = profile[editor.kind];
    const index = list.findIndex((e) => e.id === editor.id);
    if (index >= 0) list[index] = { ...list[index], ...fields, demo: false };
    else list.push({ ...fields, id: crypto.randomUUID(), demo: false });
  }
  const saved = persist("growth-garden-profile", profile);
  $("#editor-dialog").close();
  render(false);
  if (saved) toast("保存好了，故事有了新的样子。");
};
function bindHome() {
  $$("[data-add]").forEach(
    (b) => (b.onclick = () => openEditor(b.dataset.add)),
  );
  $$("[data-edit]").forEach(
    (b) => (b.onclick = () => openEditor(b.dataset.edit, b.dataset.id)),
  );
  $("#export-profile").onclick = () =>
    download(
      JSON.stringify(profile, null, 2),
      "我的成长主页.json",
      "application/json",
    );
  $("#import-profile").onclick = () => $("#profile-file").click();
  $("#profile-file").onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (
        !data ||
        !["name", "subtitle", "bio", "goal"].every(
          (k) => typeof data[k] === "string",
        ) ||
        !["events", "works"].every(
          (k) =>
            Array.isArray(data[k]) &&
            data[k].every(
              (e) =>
                e &&
                ["id", "date", "title", "text", "tag"].every(
                  (f) => typeof e[f] === "string",
                ),
            ),
        )
      )
        throw new Error();
      profile = data;
      const saved = persist("growth-garden-profile", profile);
      render(false);
      if (saved) toast("备份已导入。");
    } catch {
      toast("这不是有效的主页备份，请选择从本网站导出的 JSON 文件。");
    }
  };
}
let currentPage = null;
function render(scroll = true) {
  const route = location.hash.slice(1) || "home";
  const page = ["code", "math"].includes(route) ? route : "home";
  $$("[data-nav]").forEach((a) => {
    const active = a.dataset.nav === (page === "home" ? route : "tools");
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = `${page === "code" ? "代码量统计" : page === "math" ? "四则运算练习" : "成长自留地"} · ${profile.name}`;
  if (page !== currentPage || !scroll) {
    $("#main").innerHTML =
      page === "code" ? codeView() : page === "math" ? mathView() : homeView();
    if (page === "code") bindCode();
    else if (page === "math") bindMath();
    else bindHome();
    currentPage = page;
  }
  if (scroll)
    requestAnimationFrame(() => {
      if (page === "home" && route !== "home")
        $("#" + route)?.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "instant" });
    });
}
window.addEventListener("hashchange", () => render());
$(".skip-link").onclick = (event) => {
  event.preventDefault();
  $("#main").tabIndex = -1;
  $("#main").focus({ preventScroll: true });
  $("#main").scrollIntoView({ behavior: "instant" });
};
render();
