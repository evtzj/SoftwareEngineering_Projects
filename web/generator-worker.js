import { generateQuestions } from "./arithmetic.js";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ questions: generateQuestions(data) });
  } catch (e) {
    self.postMessage({ error: e.message });
  }
};
