import { workshopView, bindWorkshop } from "./workshop.js";
import { codeView, bindCode } from "./code-tool.js";

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
let editor = null;
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
  const route = location.hash.slice(1) || "math";
  const page = ["code", "math"].includes(route) ? route : "home";
  $$("[data-nav]").forEach((a) => {
    const active = a.dataset.nav === (page === "home" ? route : page);
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = `${page === "code" ? "代码量统计" : page === "math" ? "四则运算练习" : "个人档案"} · 演算室`;
  if (page !== currentPage || !scroll) {
    $("#main").innerHTML =
      page === "code"
        ? codeView()
        : page === "math"
          ? workshopView()
          : homeView();
    if (page === "code") bindCode();
    else if (page === "math") bindWorkshop();
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
