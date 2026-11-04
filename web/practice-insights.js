import { evaluateExpression } from "./arithmetic.js";

const symbol = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const valueText = ({ n, d }) => (d === 1 ? String(n) : `${n}/${d}`);
const operand = (value) =>
  /^-/.test(value) || value.includes("/") ? `(${value})` : value;

// 使用求值器的实际执行顺序和中间分数，保证讲解与批改采用同一规则。
export function explainQuestion(question) {
  if (String(question.answer).includes("余")) {
    const [a, b] = question.expression.split(/[÷/]/).map(Number);
    const quotient = Math.floor(a / b),
      remainder = a % b;
    return [
      `${a} ÷ ${b} = ${quotient} 余 ${remainder}`,
      `${a} = ${b} × ${quotient} + ${remainder}`,
    ];
  }
  const result = evaluateExpression(question.expression);
  const stack = [],
    steps = [];
  let index = 0;
  for (const token of result.rpn) {
    if (typeof token === "number") stack.push(String(token));
    else {
      const right = stack.pop(),
        left = stack.pop();
      const answer = valueText(result.intermediates[index++]);
      steps.push(
        `${operand(left)} ${symbol[token]} ${operand(right)} = ${answer}`,
      );
      stack.push(answer);
    }
  }
  return steps;
}

export function mistakeBreakdown(mistakes) {
  return Object.entries(symbol).map(([operator, label]) => ({
    operator,
    label,
    count: mistakes.filter(
      (q) =>
        !q.mastered &&
        q.expression
          .replaceAll("−", "-")
          .replaceAll("×", "*")
          .replaceAll("÷", "/")
          .includes(operator),
    ).length,
  }));
}
