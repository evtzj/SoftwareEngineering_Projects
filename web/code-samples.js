export const codeSamples = [
  {
    name: "example.c",
    language: "c",
    text: `// C 示例
int add(int a, int b) {
    return a + b;
}

int main(void) {

    int value = add(1, 2);
    return value;
}
`,
  },
  {
    name: "example.cpp",
    language: "cpp",
    text: `#include <string>
class Counter {
public:
    Counter() : value(0) {}
    int next() {
        return ++value;
    }
private:
    int value;
};
`,
  },
  {
    name: "Example.java",
    language: "java",
    text: `class Example {
    Example() {}

    int square(int value) {
        // 返回平方
        return value * value;
    }
}
`,
  },
  {
    name: "example.py",
    language: "python",
    text: `# Python 示例
def square(value):

    return value * value

def greet(name):
    message = f"Hello, {name}"
    return message
`,
  },
  {
    name: "Example.cs",
    language: "csharp",
    text: `class Example {
    public Example() {}

    public int Twice(int value) {
        var text = @"not // a comment";
        return value * 2;
    }
}
`,
  },
];
