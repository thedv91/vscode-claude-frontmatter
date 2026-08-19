import type { FrontmatterKind } from "../schemas";
import { locateFrontmatter } from "./frontmatter";
import { fieldsFor } from "./introspect";

export interface Suggestion {
  label: string;
  kind: "field" | "value";
  detail: string;
  documentation: string;
  /** Snippet body, using VS Code placeholder syntax. */
  insertText: string;
  /** Required fields sort ahead of optional ones. */
  sortText: string;
}

const KEY_LINE = /^([A-Za-z_$][\w$-]*)\s*:/;

function keysAlreadyUsed(lines: string[], closeLine: number): Set<string> {
  const used = new Set<string>();
  for (let i = 1; i < closeLine; i++) {
    const match = lines[i]?.match(KEY_LINE);
    if (match?.[1]) used.add(match[1]);
  }
  return used;
}

/**
 * Completions for a cursor sitting inside a frontmatter block. Returns an empty
 * list everywhere else — outside the block, on the `---` delimiters themselves,
 * and in files with no frontmatter — so the provider adds nothing to ordinary
 * markdown.
 */
export function completionsAt(
  kind: FrontmatterKind,
  text: string,
  line: number,
  character: number,
): Suggestion[] {
  const block = locateFrontmatter(text);
  if (!block || line <= block.openLine || line >= block.closeLine) return [];

  const lines = text.split("\n");
  const linePrefix = (lines[line] ?? "").slice(0, character);
  const fields = fieldsFor(kind);

  const valueContext = linePrefix.match(/^([A-Za-z_$][\w$-]*)\s*:\s*(.*)$/);
  if (valueContext) {
    const field = fields.find((f) => f.name === valueContext[1]);
    if (!field) return [];
    return field.values.map((value) => ({
      label: value,
      kind: "value" as const,
      detail: field.detail,
      documentation: field.description,
      insertText: value,
      sortText: value,
    }));
  }

  // Anything indented is a list item or a nested map; these schemas do not
  // describe those field-by-field, so stay quiet rather than offer top-level
  // keys at the wrong depth.
  if (/^\s/.test(linePrefix)) return [];

  const used = keysAlreadyUsed(lines, block.closeLine);
  return fields
    .filter((field) => !used.has(field.name))
    .map((field) => ({
      label: field.name,
      kind: "field" as const,
      detail: field.detail,
      documentation:
        field.values.length > 0
          ? `${field.description}\n\nAllowed: ${field.values.map((v) => `\`${v}\``).join(", ")}`
          : field.description,
      insertText:
        field.values.length > 0
          ? `${field.name}: \${1|${field.values.join(",")}|}`
          : `${field.name}: \${1}`,
      sortText: `${field.required ? "0" : "1"}${field.name}`,
    }));
}
