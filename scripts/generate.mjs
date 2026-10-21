import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { generateQuestions } from "../web/arithmetic.js";
try {
  const { values: v } = parseArgs({
    options: {
      count: { type: "string", default: "300" },
      max: { type: "string", default: "100" },
      ops: { type: "string", default: "+-" },
      operators: { type: "string", default: "2" },
      parentheses: { type: "boolean", default: false },
      negative: { type: "boolean", default: false },
      division: { type: "string", default: "exact" },
      answers: { type: "boolean", default: false },
      out: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });
  if (v.help) {
    console.log(
      'node scripts/generate.mjs --count 300 --max 100 --ops "+-*/" --operators 2 [--parentheses] [--negative] [--division exact|fraction|remainder] [--answers] [--out exercises.txt]',
    );
  } else {
    const qs = generateQuestions({
      count: Number(v.count),
      max: Number(v.max),
      operations: [...v.ops],
      operatorCount: Number(v.operators),
      parentheses: v.parentheses,
      negative: v.negative,
      division: v.division,
    });
    const text =
      qs
        .map(
          (q, i) =>
            `${i + 1}. ${q.expression} = ${v.answers ? q.answer : "______"}`,
        )
        .join("\n") + "\n";
    if (v.out) await writeFile(v.out, text);
    else process.stdout.write(text);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
