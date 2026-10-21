import { Parser, Language } from "./vendor/tree-sitter.js";
import { countCode } from "./logic.js";

const grammars = {
  c: "c",
  cpp: "cpp",
  java: "java",
  python: "python",
  csharp: "c-sharp",
  javascript: "javascript",
  typescript: "typescript",
};
const definitions = {
  c: new Set(["function_definition"]),
  cpp: new Set(["function_definition"]),
  java: new Set([
    "method_declaration",
    "constructor_declaration",
    "compact_constructor_declaration",
  ]),
  python: new Set(["function_definition"]),
  csharp: new Set([
    "method_declaration",
    "constructor_declaration",
    "destructor_declaration",
    "local_function_statement",
    "operator_declaration",
    "conversion_operator_declaration",
  ]),
  javascript: new Set([
    "function_declaration",
    "generator_function_declaration",
    "function_expression",
    "generator_function",
    "arrow_function",
    "method_definition",
  ]),
  typescript: new Set([
    "function_declaration",
    "generator_function_declaration",
    "function_expression",
    "generator_function",
    "arrow_function",
    "method_definition",
  ]),
};
let initialized;
const loaded = new Map();

async function loadGrammar(name) {
  initialized ??= Parser.init({
    locateFile: () =>
      new URL("./vendor/tree-sitter.wasm", import.meta.url).href,
  });
  await initialized;
  if (!loaded.has(name)) {
    const url = new URL(`./vendor/tree-sitter-${name}.wasm`, import.meta.url);
    // 浏览器和 Node 共用算法；Node 的 Language.load 接收本地文件路径。
    const source =
      url.protocol === "file:"
        ? (await import("node:url")).fileURLToPath(url)
        : url.href;
    loaded.set(name, await Language.load(source));
  }
  return loaded.get(name);
}
function walk(root, visit) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    visit(node);
    const children = node.namedChildren;
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }
}
function functionName(node) {
  const name = node.childForFieldName("name");
  if (name) return name.text;
  let declarator = node.childForFieldName("declarator");
  while (declarator) {
    if (declarator.type === "function_declarator")
      return declarator.childForFieldName("declarator")?.text || "匿名函数";
    declarator = declarator.childForFieldName("declarator");
  }
  if (
    ["variable_declarator", "pair", "public_field_definition"].includes(
      node.parent?.type,
    )
  ) {
    return (
      (
        node.parent.childForFieldName("name") ||
        node.parent.childForFieldName("key")
      )?.text || "匿名函数"
    );
  }
  return node.type.includes("operator") ? "operator" : "匿名函数";
}
function countLines(source, comments) {
  const pieces = [];
  let offset = 0;
  for (const comment of comments.sort((a, b) => a.startIndex - b.startIndex)) {
    pieces.push(source.slice(offset, comment.startIndex));
    pieces.push(
      source.slice(comment.startIndex, comment.endIndex).replace(/[^\n]/g, " "),
    );
    offset = comment.endIndex;
  }
  pieces.push(source.slice(offset));
  const original = source.split("\n"),
    masked = pieces.join("").split("\n");
  if (original.at(-1) === "") {
    original.pop();
    masked.pop();
  }
  const counts = { total: original.length, code: 0, blank: 0, comment: 0 };
  original.forEach((line, index) => {
    if (!line.trim()) counts.blank++;
    else if (masked[index].trim()) counts.code++;
    else counts.comment++;
  });
  return counts;
}

export async function analyzeSource({ name, language, text }) {
  const source = text.replace(/\r\n?/g, "\n");
  if (!grammars[language])
    return {
      name,
      language,
      ...countCode(source, language),
      functions: [],
      functionStatus: "unsupported",
      warning: "此语言仅统计行数",
    };
  let parser, tree;
  try {
    const grammar =
      language === "typescript" && /\.tsx$/i.test(name)
        ? "tsx"
        : grammars[language];
    const loadedGrammar = await loadGrammar(grammar);
    parser = new Parser();
    parser.setLanguage(loadedGrammar);
    tree = parser.parse(source);
    const comments = [],
      functions = [];
    const sourceLines = source.split("\n");
    walk(tree.rootNode, (node) => {
      if (["comment", "line_comment", "block_comment"].includes(node.type))
        comments.push(node);
      if (!definitions[language].has(node.type) || node.hasError) return;
      // 只统计有实现的定义，忽略接口/抽象方法和 C/C++ 原型声明。
      if (!node.childForFieldName("body")) return;
      const startLine = node.startPosition.row + 1;
      const endLine =
        node.endPosition.row + (node.endPosition.column > 0 ? 1 : 0);
      const length = sourceLines
        .slice(startLine - 1, endLine)
        .filter((line) => line.trim()).length;
      functions.push({ name: functionName(node), startLine, endLine, length });
    });
    return {
      name,
      language,
      ...countLines(source, comments),
      functions,
      functionStatus: tree.rootNode.hasError ? "partial" : "complete",
      warning: tree.rootNode.hasError
        ? "存在语法错误，函数统计不完整；请修正源码后重新统计"
        : "",
    };
  } catch (error) {
    return {
      name,
      language,
      ...countCode(source, language),
      functions: [],
      functionStatus: "failed",
      warning: `语法分析失败：${error.message}`,
    };
  } finally {
    tree?.delete();
    parser?.delete();
  }
}
