export function practiceStats(history) {
  const total = history.reduce((sum, item) => sum + item.total, 0);
  const correct = history.reduce(
    (sum, item) =>
      sum + (item.correct ?? Math.round((item.score * item.total) / 100)),
    0,
  );
  return {
    sessions: history.length,
    total,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    seconds: history.reduce((sum, item) => sum + item.elapsed, 0),
    reviews: history.filter((item) => item.retry).length,
  };
}

export function pendingPlans(plans, today) {
  return plans
    .filter((plan) => !plan.done)
    .sort(
      (a, b) =>
        Number(Boolean(b.due && b.due < today)) -
          Number(Boolean(a.due && a.due < today)) ||
        Number(b.priority === "high") - Number(a.priority === "high") ||
        (a.due || "9999").localeCompare(b.due || "9999"),
    );
}
