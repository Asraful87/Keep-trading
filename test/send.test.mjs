import test from "node:test";
import assert from "node:assert/strict";
import { splitMessage, MAX_MESSAGE_LENGTH } from "../src/message-splitter.js";

// 1. Blank lines are preserved exactly when the message fits in one part.
test("preserves blank lines and Markdown in a single message", () => {
  const input =
    "# Heading\n\n" +
    "## Heading 2\n\n" +
    "**Bold**\n\n" +
    "*Italic*\n\n" +
    "__Underline__\n\n" +
    "~~Strikethrough~~\n\n" +
    "> Quote\n\n" +
    "- Bullet\n" +
    "- Bullet\n\n" +
    "1. Number\n" +
    "2. Number\n\n" +
    "```js\n" +
    'console.log("hello");\n' +
    "```";

  const out = splitMessage(input, MAX_MESSAGE_LENGTH);
  assert.equal(out.length, 1);
  assert.equal(out[0], input);
});

// 2. No whitespace normalization: indentation, tabs and multiple spaces survive.
test("does not normalize whitespace", () => {
  const input = "    indented line\n\ntext   with   spaces\tand\ttabs\n\n  leading spaces";
  const out = splitMessage(input, MAX_MESSAGE_LENGTH);
  assert.equal(out.length, 1);
  assert.equal(out[0], input);
});

// 3. Multiple paragraphs remain separate when the content exceeds the limit.
test("splits long content at paragraph boundaries", () => {
  const p1 = "A".repeat(1500);
  const p2 = "B".repeat(1500);
  const input = `${p1}\n\n${p2}`;

  const out = splitMessage(input, MAX_MESSAGE_LENGTH);
  assert.equal(out.length, 2);
  assert.equal(out[0], p1);
  assert.equal(out[1], p2);
});

// 4. Code blocks are atomic and never split across messages.
test("never splits inside a fenced code block", () => {
  const code = "```js\n" + "x".repeat(1500) + "\n```";
  const input = `intro text here\n\n${code}\n\noutro ` + "y".repeat(800);

  const out = splitMessage(input, MAX_MESSAGE_LENGTH);
  for (const msg of out) {
    const fences = (msg.match(/```/g) || []).length;
    assert.equal(fences % 2, 0, `code fences must be balanced:\n${msg}`);
  }
  // The code block must live entirely within a single message.
  const withCode = out.filter((m) => m.includes("```"));
  assert.equal(withCode.length, 1);
  assert.ok(withCode[0].includes(code));
});

// 5. Lists remain intact: a long bullet list with no blank lines is NOT
//    broken mid-item; it only splits at whole-line boundaries.
test("long lists split only at line boundaries", () => {
  const lines = Array.from({ length: 200 }, (_, i) => `- item number ${i}`);
  const input = lines.join("\n");
  assert.ok(input.length > MAX_MESSAGE_LENGTH);

  const out = splitMessage(input, MAX_MESSAGE_LENGTH);
  assert.ok(out.length >= 2);
  for (const msg of out) {
    assert.ok(msg.length <= MAX_MESSAGE_LENGTH);
    // Every message must be a clean concatenation of whole list items.
    assert.ok(msg.startsWith("- item"));
    assert.ok(msg.endsWith(/item number \d+$/.exec(msg)?.[0] ?? ""));
  }
  // Reassembling the messages (joined by \n) reproduces the original list.
  assert.equal(out.join("\n"), input);
});

// 6. Empty / whitespace-only content yields nothing.
test("empty content yields no messages", () => {
  assert.deepEqual(splitMessage("", MAX_MESSAGE_LENGTH), []);
});

// 7. A short message is returned verbatim (no trimming).
test("short message is returned unchanged", () => {
  const input = "Hello **world**";
  assert.deepEqual(splitMessage(input, MAX_MESSAGE_LENGTH), [input]);
});
