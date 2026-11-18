import { gradeQuestions } from "./arithmetic.js";

export function packSession(session, page) {
  const {
    settings,
    questions,
    answers,
    started,
    elapsed,
    include,
    retry,
    library,
  } = session;
  return {
    settings,
    questions,
    answers,
    started,
    elapsed,
    include,
    retry,
    library,
    page,
    graded: Boolean(session.grade),
  };
}

export function unpackSession(record) {
  if (
    !record ||
    !Array.isArray(record.questions) ||
    !record.questions.length ||
    !Array.isArray(record.answers) ||
    !record.settings ||
    !Number.isFinite(record.started)
  )
    return null;
  return {
    ...record,
    page: Math.max(
      0,
      Math.min(record.page || 0, Math.ceil(record.questions.length / 8) - 1),
    ),
    grade: record.graded
      ? gradeQuestions(record.questions, record.answers)
      : null,
  };
}

export function questionState(result) {
  return result.correct
    ? "correct"
    : String(result.given ?? "").trim()
      ? "wrong"
      : "unanswered";
}
