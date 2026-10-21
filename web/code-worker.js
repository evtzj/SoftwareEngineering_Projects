import { analyzeSource } from "./code-analysis.js";
self.onmessage = async ({ data }) =>
  self.postMessage(await analyzeSource(data));
