// Safe, iterative message splitter for Discord.
//
// Design rules (per spec):
//  - Never build strings recursively.
//  - Never concatenate strings inside nested loops.
//  - The loop ALWAYS reduces the remaining string (split is always >= 1),
//    so an infinite loop / "Invalid string length" is impossible.
//  - Markdown, whitespace and newlines are never modified, replaced or
//    normalized. Text is only sliced, so the concatenation of all parts
//    is always exactly equal to the original content.

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_EMBED_LENGTH = 4096;

/**
 * Split `content` into an array of strings, each no longer than `maxLength`.
 *
 * Split priority (within the first `maxLength` characters):
 *   1. blank line  ("\n\n")
 *   2. newline     ("\n")
 *   3. space       (" ")
 *   4. hard split at `maxLength`
 *
 * The split index is always >= 1, so `remaining` shrinks every iteration.
 */
export function splitMessage(content, maxLength = MAX_MESSAGE_LENGTH) {
  if (content == null) content = "";
  const parts = [];
  let remaining = content;

  while (remaining.length > 0) {
    let split;
    if (remaining.length <= maxLength) {
      split = remaining.length;
    } else {
      const region = remaining.slice(0, maxLength);
      const blank = region.lastIndexOf("\n\n");
      const newline = region.lastIndexOf("\n");
      const space = region.lastIndexOf(" ");
      if (blank > 0) split = blank;
      else if (newline > 0) split = newline;
      else if (space > 0) split = space;
      else split = maxLength;
    }

    parts.push(remaining.slice(0, split));
    remaining = remaining.slice(split);
  }

  return parts;
}

/**
 * Throw instead of crashing if any chunk exceeds the Discord limit.
 */
export function validateChunks(parts, maxLength = MAX_MESSAGE_LENGTH) {
  for (const part of parts) {
    if (part.length > maxLength) {
      throw new Error("Chunk exceeds Discord limit");
    }
  }
}
