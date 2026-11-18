import test from "node:test";
import assert from "node:assert/strict";
import {
  packSession,
  unpackSession,
  questionState,
} from "../web/practice-session.js";
import { practiceStats, pendingPlans } from "../web/activity.js";
import { readReportBackup, createSnapshot } from "../web/code-history.js";
import { buildCodeReport } from "../web/code-report.js";

test("练习备份恢复答案、页码和零秒交卷，不保存重复的批改明细", () => {
  const questions = Array.from({ length: 10 }, () => ({
    expression: "2 + 3",
    answer: 5,
  }));
  const session = {
    settings: { max: 10 },
    questions,
    answers: ["5", "", "8"],
    started: 1000,
    elapsed: 0,
    include: true,
    retry: false,
    grade: { score: 10 },
  };
  const record = JSON.parse(JSON.stringify(packSession(session, 1)));
  assert.equal(record.grade, undefined);
  const restored = unpackSession(record);
  assert.equal(restored.grade.correct, 1);
  assert.equal(restored.grade.unanswered, 8);
  assert.equal(restored.elapsed, 0);
  assert.equal(restored.page, 1);
  assert.deepEqual(restored.answers, session.answers);
  assert.equal(questionState(restored.grade.rows[0]), "correct");
  assert.equal(questionState(restored.grade.rows[1]), "unanswered");
  assert.equal(questionState(restored.grade.rows[2]), "wrong");
  assert.equal(unpackSession({ ...record, page: 99 }).page, 1);
  assert.equal(unpackSession(null), null);
});

test("累计正确率按题量计算，计划先展示逾期事项且不修改原列表", () => {
  assert.equal(
    practiceStats([
      { total: 2, score: 100, correct: 2, elapsed: 10 },
      { total: 8, score: 0, correct: 0, elapsed: 20, retry: true },
    ]).accuracy,
    20,
  );
  assert.equal(practiceStats([]).accuracy, 0);
  const plans = [
    { id: 1, done: false, priority: "high", due: "2026-12-01" },
    { id: 2, done: false, priority: "normal", due: "2026-11-01" },
    { id: 3, done: true, priority: "high", due: "2026-10-01" },
  ];
  assert.deepEqual(
    pendingPlans(plans, "2026-11-18").map((p) => p.id),
    [2, 1],
  );
  assert.deepEqual(
    plans.map((p) => p.id),
    [1, 2, 3],
  );
});

test("报告 JSON 与历史备份可恢复完整指标，保留解析缺失并拒绝不同口径", () => {
  const files = [
    {
      name: "demo.py",
      language: "python",
      code: 2,
      blank: 1,
      comment: 0,
      total: 3,
      functionStatus: "incomplete",
      functions: [],
      warning: "语法错误",
    },
  ];
  const report = buildCodeReport(files);
  const raw = readReportBackup(JSON.parse(JSON.stringify(report)), "示例");
  assert.equal(raw[0].name, "示例");
  assert.equal(raw[0].report.total.functionCount, null);
  assert.equal(raw[0].report.total.code, 2);
  const snapshots = [createSnapshot("初版", files)];
  assert.deepEqual(
    readReportBackup(JSON.parse(JSON.stringify(snapshots))),
    snapshots,
  );
  assert.throws(
    () => readReportBackup({ ...report, policy: { length: "另一种口径" } }),
    /统计口径/,
  );
  assert.throws(() => readReportBackup({ files: [] }), /报告 JSON/);
});
