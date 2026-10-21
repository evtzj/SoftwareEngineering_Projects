import { copyFile, mkdir } from "node:fs/promises";

// 浏览器资源随源码提交，正常运行不需要安装依赖或连接 CDN。
const target = new URL("../web/vendor/", import.meta.url);
await mkdir(target, { recursive: true });
const copy = (from, to) =>
  copyFile(
    new URL(`../node_modules/${from}`, import.meta.url),
    new URL(to, target),
  );
for (const file of ["tree-sitter.js", "tree-sitter.wasm"]) {
  await copy(`web-tree-sitter/${file}`, file);
}
for (const name of [
  "cpp",
  "java",
  "python",
  "c-sharp",
  "javascript",
  "typescript",
  "tsx",
]) {
  await copy(
    `@vscode/tree-sitter-wasm/wasm/tree-sitter-${name}.wasm`,
    `tree-sitter-${name}.wasm`,
  );
}
await copy("tree-sitter-c/tree-sitter-c.wasm", "tree-sitter-c.wasm");
await copy("fflate/esm/browser.js", "fflate.js");
await copy("fflate/LICENSE", "fflate-LICENSE");
await copy("web-tree-sitter/LICENSE", "tree-sitter-LICENSE");
await copy("@vscode/tree-sitter-wasm/LICENSE", "vscode-tree-sitter-LICENSE");
await copy("tree-sitter-c/LICENSE", "tree-sitter-c-LICENSE");
console.log("代码分析与导出资源已复制到 web/vendor。");
