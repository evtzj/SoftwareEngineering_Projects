const SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export function fraction(n, d = 1) {
  if (!d) throw new Error("除数不能为零");
  const g = gcd(n, d),
    sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: (sign * d) / g };
}
const format = (v) => (v.d === 1 ? v.n : `${v.n}/${v.d}`);
const numeric = (v) => v.n / v.d;
function apply(a, b, op) {
  if (op === "+") return fraction(a.n * b.d + b.n * a.d, a.d * b.d);
  if (op === "-") return fraction(a.n * b.d - b.n * a.d, a.d * b.d);
  if (op === "*") return fraction(a.n * b.n, a.d * b.d);
  return fraction(a.n * b.d, a.d * b.n);
}
// 调度场算法生成逆波兰表达式；不执行用户输入的 JavaScript。
export function evaluateExpression(expression) {
  const text = expression
    .replaceAll("−", "-")
    .replaceAll("×", "*")
    .replaceAll("÷", "/");
  const tokens = text.match(/\d+|[()+*/-]/g) || [];
  if (tokens.join("") !== text.replace(/\s/g, "")) throw new Error("无效字符");
  const rpn = [],
    ops = [],
    priority = { "+": 1, "-": 1, "*": 2, "/": 2 };
  let expecting = true;
  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      if (!expecting) throw new Error("缺少运算符");
      rpn.push(Number(t));
      expecting = false;
    } else if (t === "(") {
      if (!expecting) throw new Error("缺少运算符");
      ops.push(t);
    } else if (t === ")") {
      if (expecting) throw new Error("缺少操作数");
      while (ops.length && ops.at(-1) !== "(") rpn.push(ops.pop());
      if (ops.pop() !== "(") throw new Error("括号不匹配");
    } else {
      if (expecting) throw new Error("缺少操作数");
      while (ops.length && priority[ops.at(-1)] >= priority[t])
        rpn.push(ops.pop());
      ops.push(t);
      expecting = true;
    }
  }
  if (expecting) throw new Error("算式不完整");
  while (ops.length) {
    const op = ops.pop();
    if (op === "(") throw new Error("括号不匹配");
    rpn.push(op);
  }
  const stack = [],
    intermediates = [];
  for (const t of rpn) {
    if (typeof t === "number") stack.push(fraction(t));
    else {
      const b = stack.pop(),
        a = stack.pop(),
        v = apply(a, b, t);
      stack.push(v);
      intermediates.push(v);
    }
  }
  return { ...stack[0], answer: format(stack[0]), rpn, intermediates };
}
export function validateSettings(input) {
  const s = {
    operatorCount: 1,
    parentheses: false,
    negative: false,
    division: "exact",
    ...input,
  };
  if (!Number.isInteger(s.count) || s.count < 1 || s.count > 10000)
    throw new Error("题量须为 1–10000 的整数");
  if (!Number.isInteger(s.max) || s.max < 2 || s.max > 1000)
    throw new Error("数值范围须为 2–1000 的整数");
  if (
    !Array.isArray(s.operations) ||
    !s.operations.length ||
    s.operations.some((op) => !Object.hasOwn(SYMBOLS, op))
  )
    throw new Error("请选择至少一种运算");
  s.operations = [...new Set(s.operations)];
  if (![1, 2, 3].includes(s.operatorCount))
    throw new Error("请选择 1–3 个运算符");
  if (!["exact", "fraction", "remainder"].includes(s.division))
    throw new Error("除法规则无效");
  if (s.division === "remainder" && s.operatorCount !== 1)
    throw new Error("带余数除法仅支持一个运算符");
  return s;
}
function candidate(numbers, ops, s, group = false) {
  let expression = String(numbers[0]);
  for (let i = 0; i < ops.length; i++) {
    expression += ` ${SYMBOLS[ops[i]]} ${numbers[i + 1]}`;
    if (group && i === 0) expression = `(${expression})`;
  }
  try {
    let answer;
    if (s.division === "remainder" && ops[0] === "/") {
      if (!numbers[1]) return;
      answer = `${Math.floor(numbers[0] / numbers[1])}余${numbers[0] % numbers[1]}`;
    } else {
      const v = evaluateExpression(expression);
      if (Math.abs(numeric(v)) > s.max) return;
      if (
        v.intermediates.some(
          (x) =>
            (!s.negative && x.n < 0) ||
            (s.division !== "fraction" && x.d !== 1),
        )
      )
        return;
      answer = v.answer;
    }
    return { a: numbers[0], b: numbers[1], op: ops[0], expression, answer };
  } catch {
    return;
  }
}
function shuffle(pool, random) {
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}
export function generateQuestions(input, random = Math.random) {
  const s = validateSettings(input),
    pools = s.operations.map(() => []),
    seen = new Set();
  if (s.operatorCount === 1) {
    s.operations.forEach((op, i) => {
      for (let a = 0; a <= s.max; a++)
        for (let b = 0; b <= s.max; b++) {
          // 保留原有基础模式的九九乘除范围。
          if (
            s.division === "exact" &&
            !s.negative &&
            op === "*" &&
            (a < 1 || a > 9 || b < 1 || b > 9)
          )
            continue;
          if (
            s.division === "exact" &&
            !s.negative &&
            op === "/" &&
            (a < 1 || b < 1 || b > 9 || a / b > 9)
          )
            continue;
          const q = candidate([a, b], [op], s);
          if (q) pools[i].push(q);
        }
    });
    pools.forEach((p) => shuffle(p, random));
  } else {
    // 限定尝试次数，题库不足时明确报错，不退化成重复题。
    const targets = s.operations.map(
      (_, i) =>
        Math.floor(s.count / s.operations.length) +
        (i < s.count % s.operations.length ? 1 : 0),
    );
    for (
      let attempt = 0;
      attempt < Math.max(30000, s.count * 150) &&
      pools.some((p, i) => p.length < targets[i]);
      attempt++
    ) {
      const index = attempt % s.operations.length;
      if (pools[index].length >= targets[index]) continue;
      const nums = Array.from({ length: s.operatorCount + 1 }, () =>
        Math.floor(random() * (s.max + 1)),
      );
      const ops = Array.from({ length: s.operatorCount }, (_, i) =>
        i === 0
          ? s.operations[index]
          : s.operations[Math.floor(random() * s.operations.length)],
      );
      const q = candidate(nums, ops, s, s.parentheses);
      if (q && !seen.has(q.expression)) {
        seen.add(q.expression);
        pools[index].push(q);
      }
    }
    pools.forEach((p) => shuffle(p, random));
  }
  const questions = [];
  let cursor = Math.floor(random() * pools.length);
  while (questions.length < s.count && pools.some((p) => p.length)) {
    const pool = pools[cursor++ % pools.length];
    if (pool.length) questions.push(pool.pop());
  }
  if (questions.length < s.count)
    throw new Error(
      `当前条件仅找到 ${questions.length} 道不重复题目，请减少题量、扩大范围或增加运算种类`,
    );
  return questions;
}
export function answerMatches(raw, expected) {
  const text = String(raw).trim();
  if (!text) return false;
  if (String(expected).includes("余"))
    return text.replace(/\s/g, "") === expected;
  const parse = (text) => {
    if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(text)) {
      const [n, d] = text.split("/").map(Number);
      return d ? fraction(n, d) : null;
    }
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const v = Number(text);
    return Number.isFinite(v) ? v : null;
  };
  const actual = parse(text),
    target = parse(String(expected));
  if (actual === null || target === null) return false;
  if (typeof actual === "object" && typeof target === "object")
    return actual.n === target.n && actual.d === target.d;
  return (
    Math.abs(
      (typeof actual === "object" ? numeric(actual) : actual) -
        (typeof target === "object" ? numeric(target) : target),
    ) < 1e-10
  );
}
export function gradeQuestions(questions, answers) {
  const rows = questions.map((q, i) => {
    const given = String(answers[i] ?? "").trim();
    return {
      ...q,
      given,
      answered: given !== "",
      correct: answerMatches(given, q.answer),
    };
  });
  const correct = rows.filter((r) => r.correct).length;
  return {
    rows,
    correct,
    total: rows.length,
    unanswered: rows.filter((r) => !r.answered).length,
    score: rows.length ? Math.round((correct / rows.length) * 100) : 0,
  };
}
