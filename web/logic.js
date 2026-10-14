export const languages = {
  javascript: {
    label: "JavaScript",
    extensions: ["js", "mjs", "cjs", "jsx"],
    family: "c",
  },
  typescript: { label: "TypeScript", extensions: ["ts", "tsx"], family: "c" },
  python: { label: "Python", extensions: ["py"], family: "python" },
  c: {
    label: "C / C++",
    extensions: ["c", "h", "cpp", "hpp", "cc"],
    family: "c",
  },
  java: { label: "Java", extensions: ["java"], family: "c" },
  css: { label: "CSS", extensions: ["css"], family: "css" },
  scss: { label: "SCSS", extensions: ["scss"], family: "c" },
  html: { label: "HTML", extensions: ["html", "htm", "vue"], family: "html" },
  json: { label: "JSON", extensions: ["json"], family: "plain" },
  sql: { label: "SQL", extensions: ["sql"], family: "sql" },
};

export function detectLanguage(filename) {
  const extension = filename.split(".").pop().toLowerCase();
  return Object.keys(languages).find((key) =>
    languages[key].extensions.includes(extension),
  );
}

// 统计物理行：含代码和注释的混合行归为代码行，结尾换行不额外计一行。
export function countCode(text, language = "javascript") {
  const baseFamily = languages[language]?.family || "plain";
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  let block = null,
    quote = null,
    triple = false,
    escaped = false,
    rawEnd = null;
  const templateContexts = [];
  let family = baseFamily,
    regex = false,
    regexClass = false,
    htmlTag = false;
  const result = { total: lines.length, code: 0, comment: 0, blank: 0 };
  for (const line of lines) {
    if (!line.trim()) {
      result.blank++;
      continue;
    }
    let hasCode = false,
      hasComment = false,
      previous = "";
    for (let i = 0; i < line.length;) {
      const ch = line[i],
        next = line.slice(i);
      if (block) {
        hasComment = true;
        if (next.startsWith(block)) {
          i += block.length;
          block = null;
        } else i++;
        continue;
      }
      if (rawEnd) {
        hasCode = true;
        if (next.startsWith(rawEnd)) {
          i += rawEnd.length;
          rawEnd = null;
        } else i++;
        continue;
      }
      if (regex) {
        hasCode = true;
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === "[") regexClass = true;
        else if (ch === "]") regexClass = false;
        else if (ch === "/" && !regexClass) regex = false;
        i++;
        continue;
      }
      if (quote) {
        hasCode = true;
        if (escaped) {
          escaped = false;
          i++;
          continue;
        }
        if (ch === "\\" && family !== "sql") {
          escaped = true;
          i++;
          continue;
        }
        if (quote === "`" && next.startsWith("${")) {
          quote = null;
          templateContexts.push(1);
          i += 2;
          continue;
        }
        if (triple && next.startsWith(quote.repeat(3))) {
          i += 3;
          triple = false;
          quote = null;
          continue;
        }
        if (!triple && ch === quote) {
          if (family === "sql" && line[i + 1] === quote) {
            i += 2;
            continue;
          }
          quote = null;
        }
        i++;
        continue;
      }
      if (
        baseFamily === "html" &&
        family === "html" &&
        /^<script\b/i.test(next)
      )
        family = "c";
      if (baseFamily === "html" && family === "html" && /^<style\b/i.test(next))
        family = "css";
      if (baseFamily === "html" && /^<\/(script|style)\s*>/i.test(next))
        family = "html";
      if (family === "html" && next.startsWith("<!--")) {
        block = "-->";
        hasComment = true;
        i += 4;
        continue;
      }
      if (["c", "css", "sql"].includes(family) && next.startsWith("/*")) {
        block = "*/";
        hasComment = true;
        i += 2;
        continue;
      }
      if (
        (family === "c" && next.startsWith("//")) ||
        (family === "python" && ch === "#") ||
        (family === "sql" && next.startsWith("--"))
      ) {
        hasComment = true;
        break;
      }
      if (language === "c" && next.startsWith('R"')) {
        const raw = next.match(/^R"([^\s()\\]{0,16})\(/);
        if (raw) {
          rawEnd = ")" + raw[1] + '"';
          hasCode = true;
          i += raw[0].length;
          continue;
        }
      }
      if (family === "html" && ch === "<") htmlTag = true;
      if (family === "html" && ch === ">") htmlTag = false;
      if (
        ((ch === '"' || ch === "'") && (family !== "html" || htmlTag)) ||
        (family === "c" && ch === "`")
      ) {
        quote = ch;
        triple = family === "python" && next.startsWith(ch.repeat(3));
        hasCode = true;
        i += triple ? 3 : 1;
        continue;
      }
      if (
        family === "c" &&
        ["javascript", "typescript", "html"].includes(language) &&
        ch === "/" &&
        (!previous ||
          /[=(:,!&|?;{\[]$/.test(previous) ||
          /\b(return|yield|case|throw)$/.test(previous))
      ) {
        regex = true;
        regexClass = false;
        hasCode = true;
        i++;
        continue;
      }
      if (templateContexts.length) {
        const top = templateContexts.length - 1;
        if (ch === "{") templateContexts[top]++;
        if (ch === "}" && --templateContexts[top] === 0) {
          templateContexts.pop();
          quote = "`";
        }
      }
      if (!/\s/.test(ch)) {
        hasCode = true;
        previous += ch;
      }
      i++;
    }
    // 普通字符串的转义换行只影响下一行的字符串状态，不影响下一个字符。
    escaped = false;
    if (hasCode) result.code++;
    else if (hasComment) result.comment++;
    else result.blank++;
  }
  return result;
}

const symbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };
export function generateQuestions(
  { count, max, operations },
  random = Math.random,
) {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 50 ||
    ![10, 20, 100].includes(max) ||
    !operations.length ||
    operations.some((op) => !(op in symbols))
  )
    throw new Error("请选择题量、范围和至少一种运算");
  const pools = operations.map((op) => {
    const pool = [];
    for (let a = 0; a <= max; a++)
      for (let b = 0; b <= max; b++) {
        let answer;
        if (op === "+" && a + b <= max) answer = a + b;
        if (op === "-" && a >= b) answer = a - b;
        if (op === "*" && a >= 1 && a <= 9 && b >= 1 && b <= 9 && a * b <= max)
          answer = a * b;
        if (
          op === "/" &&
          a >= 1 &&
          b >= 1 &&
          b <= 9 &&
          a % b === 0 &&
          a / b <= 9
        )
          answer = a / b;
        if (answer !== undefined)
          pool.push({
            a,
            b,
            op,
            answer,
            expression: `${a} ${symbols[op]} ${b}`,
          });
      }
    // 打乱后轮流取各运算，保证每种被选中的运算都有机会出现且不重复。
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  });
  const questions = [];
  let cursor = Math.floor(random() * pools.length);
  while (questions.length < count && pools.some((pool) => pool.length)) {
    const pool = pools[cursor++ % pools.length];
    if (pool.length) questions.push(pool.pop());
  }
  if (questions.length < count)
    throw new Error(
      `当前范围最多能生成 ${questions.length} 道不重复题目，请减少题量或增加运算种类`,
    );
  return questions;
}

export function gradeQuestions(questions, answers) {
  const rows = questions.map((q, i) => {
    const raw = String(answers[i] ?? "").trim();
    const answered = raw !== "";
    const correct =
      answered && Number.isFinite(Number(raw)) && Number(raw) === q.answer;
    return { ...q, given: raw, answered, correct };
  });
  const correct = rows.filter((row) => row.correct).length;
  return {
    rows,
    correct,
    unanswered: rows.filter((row) => !row.answered).length,
    total: rows.length,
    score: rows.length ? Math.round((correct / rows.length) * 100) : 0,
  };
}
