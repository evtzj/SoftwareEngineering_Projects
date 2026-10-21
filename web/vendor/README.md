# 浏览器依赖

这些文件随网站提交，本地启动无需下载 CDN 资源。

| 内容 | 来源 |
| --- | --- |
| `tree-sitter.js`、`tree-sitter.wasm` | [web-tree-sitter 0.25.10](https://github.com/tree-sitter/tree-sitter/tree/v0.25.10/lib/binding_web)，MIT |
| C 语法 WASM | [tree-sitter-c 0.24.1](https://github.com/tree-sitter/tree-sitter-c)，MIT |
| C++、Java、Python、C#、JavaScript、TypeScript、TSX 语法 WASM | [@vscode/tree-sitter-wasm 0.3.1](https://github.com/microsoft/vscode-tree-sitter-wasm)，各语法库 MIT，许可见同目录 `*-LICENSE` |
| `fflate.js` | [fflate 0.8.2](https://github.com/101arrowz/fflate)，MIT，用于 XLSX 的 ZIP 打包 |

执行 `npm ci` 后运行 `npm run vendor:code` 可从锁定的 npm 包恢复运行文件。语言语法的许可证保留在本目录。升级语法时需同步检查对应上游许可证。

应用代码不修改第三方库内部实现。`code-analysis.js` 通过 Tree-sitter 的公开接口读取语法树；`code-xlsx.js` 生成 Office Open XML 工作表，用 fflate 打包为 `.xlsx`。
