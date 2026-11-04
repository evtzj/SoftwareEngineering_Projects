// Wrong answers are keyed by expression and expected answer, not by screen position.
export function updateMistakes(previous, grade, settings, date = new Date().toISOString()) {
  const byKey = new Map(previous.map(q => [JSON.stringify([q.expression,String(q.answer)]),q]));
  for (const row of grade.rows) {
    const key = JSON.stringify([row.expression,String(row.answer)]), old = byKey.get(key);
    if (row.correct) {
      if (old) byKey.set(key,{...old,mastered:true,lastReviewed:date});
    } else if (row.answered) {
      byKey.set(key,{ expression:row.expression, answer:row.answer, given:row.given, settings:{...(row.sourceSettings || settings)}, misses:(old?.misses || 0)+1, mastered:false, lastReviewed:date });
    }
  }
  return [...byKey.values()].sort((a,b)=>b.lastReviewed.localeCompare(a.lastReviewed)).slice(0,500);
}
export function mistakeQuestions(mistakes, includeMastered = false) {
  return mistakes.filter(q=>includeMastered || !q.mastered).map(q=>({expression:q.expression,answer:q.answer,sourceSettings:q.settings}));
}
