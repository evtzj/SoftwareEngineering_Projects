import { gradeQuestions } from "./arithmetic.js";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
const DEFAULT = {
  count: 300,
  max: 100,
  operations: ["+", "-"],
  operatorCount: 2,
  parentheses: false,
  negative: false,
  division: "exact",
  columns: 2,
  spacing: 32,
};
let settings = { ...DEFAULT, ...load("workshop-settings", {}) },
  session = null,
  history = load("workshop-history", []),
  page = 0,
  busy = false,
  worker = null,
  timer = null;
const PAGE_SIZE = 30;
const option = (value, label, current) =>
  `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`;
function field(label, html) {
  return `<label class="ws-field"><span>${label}</span>${html}</label>`;
}
export function workshopView() {
  return `<div class="workshop"><div class="ws-masthead"><div><p class="ws-overline">数学练习工作台 / NO. 02</p><h1>把练习，写进日常<span>。</span></h1></div><div class="ws-date">课堂 · 自习 · 每周练习<br><b>ARITHMETIC WORKSHOP</b></div></div><div class="ws-layout"><aside class="ws-sidebar"><div class="ws-section-title"><span>01</span><h2>编排练习</h2><button id="ws-reset" type="button">恢复默认</button></div><form id="ws-settings"><div class="ws-presets"><button type="button" data-preset="week">每周 300 题</button><button type="button" data-preset="quick">口算 20 题</button></div><div class="ws-fields">${field("题目数量", `<input required type="number" name="count" min="1" max="10000" value="${settings.count}">`)}${field("数字与答案上限", `<input required type="number" name="max" min="2" max="1000" value="${settings.max}">`)}</div><fieldset class="ws-ops"><legend>运算种类</legend>${[
    ["+", "＋", "加"],
    ["-", "−", "减"],
    ["*", "×", "乘"],
    ["/", "÷", "除"],
  ]
    .map(
      ([v, s, l]) =>
        `<label><input type="checkbox" name="operation" value="${v}" ${settings.operations.includes(v) ? "checked" : ""}><span><b>${s}</b>${l}</span></label>`,
    )
    .join(
      "",
    )}</fieldset>${field("每题运算符", `<select name="operatorCount">${[1, 2, 3].map((n) => option(n, `${n} 个运算符 · ${n + 1} 个数`, settings.operatorCount)).join("")}</select>`)}<div class="ws-toggles"><label><input type="checkbox" name="parentheses" ${settings.parentheses ? "checked" : ""}>使用括号</label><label><input type="checkbox" name="negative" ${settings.negative ? "checked" : ""}>允许负数</label></div>${field(
    "除法规则",
    `<select name="division">${[
      ["exact", "整除"],
      ["fraction", "分数答案"],
      ["remainder", "带余数 · 仅单运算符"],
    ]
      .map(([v, l]) => option(v, l, settings.division))
      .join("")}</select>`,
  )}<details class="ws-print-settings"><summary>打印版式 <span>列数 / 行距</span></summary><div class="ws-fields">${field("每行题数", `<select name="columns">${[1, 2, 3].map((n) => option(n, `${n} 列`, settings.columns)).join("")}</select>`)}${field("题目行距 / px", `<input required type="number" min="12" max="100" name="spacing" value="${settings.spacing}">`)}</div></details><button class="ws-primary" type="submit" ${busy ? "disabled" : ""}>${busy ? "正在编排…" : "生成练习"} <span aria-hidden="true">↗</span></button><p class="ws-hint">每份算式去重 · 最多 10,000 题<br>默认数字、中间结果非负，最终答案不超过上限。</p><p id="ws-status" role="status" aria-live="polite"></p></form><section class="ws-history"><div class="ws-section-title"><span>02</span><h2>练习记录</h2>${history.length ? '<button id="ws-clear">清空</button>' : ""}</div>${
    history.length
      ? history
          .slice(0, 5)
          .map(
            (h) =>
              `<div class="ws-history-row"><div>${esc(h.date)}<small>${h.total} 题 / ${h.elapsed} 秒${h.retry ? " / 错题" : ""}</small></div><strong>${h.score}<small>%</small></strong></div>`,
          )
          .join("")
      : '<p class="ws-hint">完成一份练习后，记录会留在这里。</p>'
  }<p class="ws-hint">资料仅保存在当前浏览器。</p></section></aside><section class="ws-paper" id="ws-paper">${paper()}</section></div><div class="ws-colophon"><span>规则先行，落笔有数。</span><p>去重以完整算式为准，交换顺序视为不同题。分数输入 1/2，余数输入 3余1。分数模式只对答案使用分数，题目操作数为整数。</p></div></div>`;
}
function elapsed() {
  return session
    ? (session.elapsed ?? Math.floor((Date.now() - session.started) / 1000))
    : 0;
}
function paper() {
  if (!session)
    return `<div class="ws-paper-top"><span>EXERCISE BOOK</span><span>待编排 / —</span></div><div class="ws-empty"><div class="ws-equation">a <i>+</i> b <i>×</i> c</div><div class="ws-empty-rule"></div><span class="ws-overline">一张习题纸，无数种可能</span><h2>从这里，开始演算。</h2><p>设定左侧规则，生成你的第一份练习。<br>可以在线作答，也可以打印后落笔。</p><div class="ws-empty-bottom"><span>01 设定规则</span><span>02 独立演算</span><span>03 校对答案</span></div></div>`;
  const grade = session.grade,
    start = page * PAGE_SIZE,
    qs = session.questions.slice(start, start + PAGE_SIZE),
    answered = session.answers.filter((v) => String(v ?? "").trim()).length;
  return `<div class="ws-paper-top"><span>${session.retry ? "CORRECTION / 错题重练" : "EXERCISE BOOK / 课堂练习"}</span><span>${new Date(session.started).toLocaleDateString("zh-CN")}</span></div><div class="ws-paper-heading"><div><h2>${session.retry ? "再解一次" : "四则运算练习"}</h2><p>${session.questions.length} 道题 · ${session.settings.max} 以内 · ${session.settings.operatorCount} 个运算符</p></div><div class="ws-clock"><span>用时</span><b id="ws-clock">${elapsed()}</b><span>秒</span></div></div><div class="ws-toolbar"><span id="ws-progress">已作答 ${answered} / ${session.questions.length}</span><div><button type="button" id="ws-download">下载题目 ↓</button><button type="button" id="ws-print">打印 / PDF ↗</button></div></div>${grade ? `<div class="ws-result"><strong>${grade.score}<small>%</small></strong><div><b>答对 ${grade.correct} / ${grade.total}</b><p>未答 ${grade.unanswered} 题 · 用时 ${session.elapsed} 秒</p></div><button id="ws-retry" ${grade.correct === grade.total ? "disabled" : ""}>错题重练 ↗</button></div>` : ""}<form id="ws-answers"><div class="ws-questions">${qs
    .map((q, j) => {
      const i = start + j,
        r = grade?.rows[i];
      return `<div class="ws-question ${r ? (r.correct ? "is-correct" : "is-wrong") : ""}"><span class="ws-number">${String(i + 1).padStart(2, "0")}</span><label for="ws-a-${i}">${esc(q.expression)} =</label><input id="ws-a-${i}" data-ws-answer="${i}" aria-label="第 ${i + 1} 题答案" type="text" autocomplete="off" value="${esc(session.answers[i] ?? "")}" ${grade ? "readonly" : ""}>${r ? `<small>${r.correct ? "✓" : `答案 ${esc(q.answer)}`}</small>` : ""}</div>`;
    })
    .join(
      "",
    )}</div><div class="ws-pagination"><button type="button" id="ws-prev" ${page === 0 ? "disabled" : ""}>← 上一页</button><span>第 ${page + 1} / ${Math.ceil(session.questions.length / PAGE_SIZE)} 页</span><button type="button" id="ws-next" ${start + PAGE_SIZE >= session.questions.length ? "disabled" : ""}>下一页 →</button></div><div class="ws-submit-row"><label><input id="ws-include" type="checkbox" ${session.include ? "checked" : ""}>下载 / 打印附答案</label>${grade ? "<span>本次练习已批改</span>" : '<button class="ws-primary" type="submit">交卷批改 <span>✓</span></button>'}</div></form>`;
}
function redraw() {
  if (!$(".workshop")) return;
  $("#main").innerHTML = workshopView();
  bindWorkshop();
}
function readSettings() {
  const f = new FormData($("#ws-settings"));
  return {
    count: Number(f.get("count")),
    max: Number(f.get("max")),
    operations: f.getAll("operation"),
    operatorCount: Number(f.get("operatorCount")),
    parentheses: f.has("parentheses"),
    negative: f.has("negative"),
    division: f.get("division"),
    columns: Number(f.get("columns")),
    spacing: Number(f.get("spacing")),
  };
}
function status(text) {
  if ($("#ws-status")) $("#ws-status").textContent = text;
}
export function bindWorkshop() {
  clearInterval(timer);
  if (session && !session.grade)
    timer = setInterval(() => {
      if ($("#ws-clock")) $("#ws-clock").textContent = elapsed();
      else clearInterval(timer);
    }, 1000);
  $("#ws-settings").onsubmit = (e) => {
    e.preventDefault();
    if (busy) return;
    settings = readSettings();
    busy = true;
    redraw();
    status("正在生成不重复题目…");
    worker = new Worker(new URL("./generator-worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      worker.terminate();
      worker = null;
      busy = false;
      if (data.error) {
        redraw();
        status(data.error);
        return;
      }
      session = {
        settings: { ...settings },
        questions: data.questions,
        answers: [],
        grade: null,
        started: Date.now(),
        elapsed: null,
        include: false,
        retry: false,
      };
      page = 0;
      const saved = save("workshop-settings", settings);
      redraw();
      if (!saved) status("浏览器存储不可用，设置未能保存。");
    };
    worker.onerror = () => {
      worker.terminate();
      busy = false;
      redraw();
      status("出题失败，请重试。");
    };
    worker.postMessage(settings);
  };
  $("#ws-reset").onclick = () => {
    if (busy) return;
    settings = { ...DEFAULT };
    redraw();
  };
  document.querySelectorAll("[data-preset]").forEach(
    (b) =>
      (b.onclick = () => {
        if (busy) return;
        settings = {
          ...DEFAULT,
          ...(b.dataset.preset === "quick"
            ? { count: 20, max: 20, operatorCount: 1 }
            : {}),
        };
        redraw();
      }),
  );
  $("#ws-clear")?.addEventListener("click", () => {
    history = [];
    save("workshop-history", history);
    redraw();
  });
  document.querySelectorAll("[data-ws-answer]").forEach(
    (input) =>
      (input.oninput = () => {
        session.answers[Number(input.dataset.wsAnswer)] = input.value;
        $("#ws-progress").textContent =
          `已作答 ${session.answers.filter((v) => String(v ?? "").trim()).length} / ${session.questions.length}`;
      }),
  );
  $("#ws-prev")?.addEventListener("click", () => {
    page--;
    redraw();
  });
  $("#ws-next")?.addEventListener("click", () => {
    page++;
    redraw();
  });
  $("#ws-include")?.addEventListener(
    "change",
    (e) => (session.include = e.target.checked),
  );
  $("#ws-answers")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (session.grade) return;
    if (!session.answers.some((v) => String(v ?? "").trim())) {
      status("请先回答至少一道题。");
      return;
    }
    session.elapsed = elapsed();
    session.grade = gradeQuestions(session.questions, session.answers);
    history.unshift({
      date: new Date().toLocaleString("zh-CN"),
      total: session.questions.length,
      score: session.grade.score,
      elapsed: session.elapsed,
      retry: session.retry,
    });
    history = history.slice(0, 30);
    const saved = save("workshop-history", history);
    redraw();
    if (!saved) status("浏览器存储不可用，本次成绩未能保存。");
  });
  $("#ws-retry")?.addEventListener("click", () => {
    session = {
      ...session,
      questions: session.grade.rows.filter((q) => !q.correct),
      answers: [],
      grade: null,
      elapsed: null,
      started: Date.now(),
      retry: true,
    };
    page = 0;
    redraw();
  });
  $("#ws-download")?.addEventListener("click", () => {
    const text = `四则运算练习\n姓名：________ 日期：________\n\n${session.questions.map((q, i) => `${i + 1}. ${q.expression} = ______`).join("\n")}${session.include ? "\n\n参考答案\n" + session.questions.map((q, i) => `${i + 1}. ${q.answer}`).join("\n") : ""}`;
    const url = URL.createObjectURL(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "四则运算练习.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("#ws-print")?.addEventListener("click", () => {
    if (!$("#ws-settings").reportValidity()) {
      status("请先修正打印版式或配置中的无效数值。");
      return;
    }
    const s = readSettings();
    $("#print-sheet").innerHTML =
      `<style>@media print{.print-questions{display:grid;grid-template-columns:repeat(${s.columns},1fr)!important;gap:${s.spacing}px 20px!important}.print-questions>div{break-inside:avoid}.print-answers{break-before:page}}</style><h1>四则运算练习</h1><p>姓名：____________　日期：____________</p><p>${session.questions.length} 题 / ${session.settings.max} 以内</p><div class="print-questions">${session.questions.map((q, i) => `<div>${i + 1}. ${esc(q.expression)} = ______</div>`).join("")}</div>${session.include ? `<section class="print-answers"><h2>参考答案</h2>${session.questions.map((q, i) => `${i + 1}. ${esc(q.answer)}`).join("　 /　 ")}</section>` : ""}`;
    window.print();
  });
}
