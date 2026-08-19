export interface FrontmatterBlock {
  /** The YAML source between the delimiters, without either `---` line. */
  source: string;
  /** 0-indexed line of the opening `---`. Always 0 — frontmatter must lead. */
  openLine: number;
  /** 0-indexed line of the closing `---`. */
  closeLine: number;
  /** Character offset of the first character of `source` within the document. */
  offset: number;
}

/**
 * Locates the leading frontmatter block, or returns null when there is none —
 * which is valid for every kind of Claude definition file. A skill without
 * frontmatter falls back to its first paragraph as the description, and a rule
 * without one simply loads unconditionally.
 *
 * An unterminated block also returns null: until the closing `---` is typed
 * there is no way to tell frontmatter from a body-level thematic break.
 */
export function locateFrontmatter(text: string): FrontmatterBlock | null {
  const lines = text.split("\n");
  if (lines.length === 0 || lines[0]?.trim() !== "---") return null;

  const closeLine = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  if (closeLine < 0) return null;

  // +1 for the newline that ends the opening delimiter line.
  const offset = (lines[0]?.length ?? 0) + 1;
  return {
    source: lines.slice(1, closeLine).join("\n"),
    openLine: 0,
    closeLine,
    offset,
  };
}

export interface Position {
  line: number;
  character: number;
}

/** Converts a character offset in `text` to a zero-based line/character pair. */
export function offsetToPosition(text: string, offset: number): Position {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, clamped);
  const line = before.split("\n").length - 1;
  const lastBreak = before.lastIndexOf("\n");
  return { line, character: clamped - lastBreak - 1 };
}
