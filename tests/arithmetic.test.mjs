import test from "node:test";
import assert from "node:assert/strict";
import {
  generateQuestions,
  evaluateExpression,
  gradeQuestions,
  answerMatches,
} from "../web/arithmetic.js";
function seeded(seed = 1122) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test("调度场算法：优先级、括号、约分、除零和非法字符", () => {
  assert.equal(evaluateExpression("2 + 3 × 4").answer, 14);
  assert.equal(evaluateExpression("(2 + 3) × 4").answer, 20);
  assert.equal(evaluateExpression("1 ÷ 3 + 1 ÷ 6").answer, "1/2");
  assert.deepEqual(evaluateExpression("2 + 3 × 4").rpn, [2, 3, 4, "*", "+"]);
  for (const e of ["2 ÷ 0", "(2 + 1", "2 +", "2 ()", "alert(1)", "2 ** 3"])
    assert.throws(() => evaluateExpression(e));
});
test("300 题周练：双运算符、唯一性、答案和中间结果约束", () => {
  const qs = generateQuestions(
    {
      count: 300,
      max: 100,
      operatorCount: 2,
      operations: ["+", "-", "*", "/"],
      parentheses: true,
    },
    seeded(),
  );
  assert.equal(qs.length, 300);
  assert.equal(new Set(qs.map((q) => q.expression)).size, 300);
  for (const q of qs) {
    const result = evaluateExpression(q.expression);
    assert.equal(result.answer, q.answer);
    assert.ok(result.n >= 0 && result.n / result.d <= 100);
    assert.ok(result.intermediates.every((v) => v.d === 1 && v.n >= 0));
    assert.equal(q.expression.match(/[+−×÷]/g).length, 2);
  }
});
test("一万道题：真实生成完整的不重复多步算式", () => {
  const qs = generateQuestions(
    { count: 10000, max: 100, operatorCount: 2, operations: ["+", "-"] },
    seeded(),
  );
  assert.equal(qs.length, 10000);
  assert.equal(new Set(qs.map((q) => q.expression)).size, 10000);
});
test("负数、分数、余数和题库不足", () => {
  const negative = generateQuestions(
    { count: 30, max: 10, operatorCount: 2, operations: ["-"], negative: true },
    seeded(),
  );
  assert.ok(negative.some((q) => q.answer < 0));
  const fractions = generateQuestions(
    { count: 30, max: 10, operations: ["/"], division: "fraction" },
    seeded(),
  );
  assert.ok(fractions.some((q) => String(q.answer).includes("/")));
  const remainder = generateQuestions(
    { count: 30, max: 10, operations: ["/"], division: "remainder" },
    seeded(),
  );
  for (const q of remainder)
    assert.equal(q.answer, `${Math.floor(q.a / q.b)}余${q.a % q.b}`);
  assert.throws(
    () =>
      generateQuestions({
        count: 10,
        max: 10,
        operatorCount: 2,
        operations: ["/"],
        division: "remainder",
      }),
    /一个运算符/,
  );
  assert.throws(
    () =>
      generateQuestions(
        { count: 10000, max: 2, operations: ["+"], operatorCount: 2 },
        seeded(),
      ),
    /不重复题目/,
  );
});
test("批改分数等价、负数、余数、空白、非法输入", () => {
  assert.ok(answerMatches("2/4", "1/2"));
  assert.ok(answerMatches("0.5", "1/2"));
  assert.ok(answerMatches("-2", -2));
  assert.ok(answerMatches("3 余 1", "3余1"));
  for (const raw of ["", "1/0", "0x10", "Infinity", "hi"])
    assert.equal(answerMatches(raw, 16), false);
  const r = gradeQuestions(
    [{ answer: "1/2" }, { answer: "2余1" }, { answer: 0 }],
    ["2/4", "2余1", ""],
  );
  assert.equal(r.correct, 2);
  assert.equal(r.unanswered, 1);
});
