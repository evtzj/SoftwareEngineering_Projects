import test from "node:test";
import assert from "node:assert/strict";
import {
  countCode,
  detectLanguage,
  generateQuestions,
  gradeQuestions,
} from "../web/logic.js";

test("物理行：空文件、尾换行和 Windows 换行", () => {
  assert.deepEqual(countCode(""), { total: 0, code: 0, comment: 0, blank: 0 });
  assert.deepEqual(countCode("const x = 1;\r\n\r\n// note\r\n"), {
    total: 3,
    code: 1,
    comment: 1,
    blank: 1,
  });
});
test("C 风格注释：字符串与混合行不可误算成纯注释", () => {
  const source =
    'const url = "https://example.test"; // link\n/* start\n * note\n */ const value = 1;\n\n// end';
  assert.deepEqual(countCode(source), {
    total: 6,
    code: 2,
    comment: 3,
    blank: 1,
  });
});
test("JavaScript 正则字符类和多行模板中的符号是代码", () => {
  const source =
    "const regex = /[//]/; // regular expression\nconst text = `first\n// literal text\n${1 /* comment */}\nlast`;";
  assert.deepEqual(countCode(source), {
    total: 5,
    code: 5,
    comment: 0,
    blank: 0,
  });
});
test("Python 三引号字符串归代码，井号字符串不归注释", () => {
  const source =
    '# note\ntext = "# value"\nvalue = """hello\n# not a comment\nworld"""\n';
  assert.deepEqual(countCode(source, "python"), {
    total: 5,
    code: 4,
    comment: 1,
    blank: 0,
  });
});
test("本项目使用的嵌套模板及 HTML 文本撇号不会破坏后续注释识别", () => {
  const source =
    "const text = `outer ${`inner ${1}`}\n// still literal\n`;\n// actual";
  assert.deepEqual(countCode(source), {
    total: 4,
    code: 3,
    comment: 1,
    blank: 0,
  });
  assert.deepEqual(countCode("<p>Don't give up.</p>\n<!-- note -->", "html"), {
    total: 2,
    code: 1,
    comment: 1,
    blank: 0,
  });
});
test("HTML 内嵌 script/style 的注释，以及 SQL 转义引号", () => {
  const source =
    '<!-- note -->\n<script>\n// comment\nconst x = "//";\n</script>\n<style>\n/* css */\na { color: red; }\n</style>';
  assert.deepEqual(countCode(source, "html"), {
    total: 9,
    code: 6,
    comment: 3,
    blank: 0,
  });
  assert.deepEqual(
    countCode("-- note\nSELECT 'it''s -- text';\n/* note */", "sql"),
    { total: 3, code: 1, comment: 2, blank: 0 },
  );
});
test("C++ 多行 raw string 不把内容当注释", () => {
  assert.deepEqual(
    countCode('auto s = R"tag(first\n// text\n)tag";\n// actual', "c"),
    { total: 4, code: 3, comment: 1, blank: 0 },
  );
});
test("文件扩展名识别", () => {
  assert.equal(detectLanguage("SOURCE.CPP"), "c");
  assert.equal(detectLanguage("app.mjs"), "javascript");
  assert.equal(detectLanguage("photo.png"), undefined);
});
test("四种运算：题量、唯一性、范围和非负整除约束", () => {
  for (const max of [10, 20, 100]) {
    const questions = generateQuestions({
      count: 30,
      max,
      operations: ["+", "-", "*", "/"],
    });
    assert.equal(questions.length, 30);
    assert.equal(new Set(questions.map((q) => q.expression)).size, 30);
    const counts = Object.fromEntries(
      ["+", "-", "*", "/"].map((op) => [
        op,
        questions.filter((q) => q.op === op).length,
      ]),
    );
    assert.ok(
      Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <=
        1,
    );
    for (const q of questions) {
      assert.ok(
        q.a >= 0 &&
          q.b >= 0 &&
          q.a <= max &&
          q.b <= max &&
          q.answer >= 0 &&
          q.answer <= max,
      );
      assert.ok(Number.isInteger(q.answer));
      const value =
        q.op === "+"
          ? q.a + q.b
          : q.op === "-"
            ? q.a - q.b
            : q.op === "*"
              ? q.a * q.b
              : q.a / q.b;
      assert.equal(q.answer, value);
      if (q.op === "/") assert.notEqual(q.b, 0);
    }
  }
});
test("题目不足与未选择运算给出可执行的提示", () => {
  assert.throws(
    () => generateQuestions({ count: 10, max: 20, operations: [] }),
    /至少一种运算/,
  );
  assert.throws(
    () => generateQuestions({ count: 30, max: 10, operations: ["*"] }),
    /不重复题目/,
  );
});
test("批改：0 是有效答案，空白、错误与非法输入区分", () => {
  const qs = [{ answer: 0 }, { answer: 3 }, { answer: 4 }, { answer: 1 }];
  const result = gradeQuestions(qs, ["0", "", "3", "hello"]);
  assert.equal(result.correct, 1);
  assert.equal(result.unanswered, 1);
  assert.equal(result.score, 25);
  assert.equal(result.rows[0].correct, true);
  assert.equal(result.rows[1].answered, false);
});
