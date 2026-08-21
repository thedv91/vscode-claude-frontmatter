import { isMap, parseDocument, type Document, type Node } from "yaml";
import type { FrontmatterKind } from "../schemas";
import { IGNORED_FIELDS, SCHEMAS } from "../schemas";
import {
  locateFrontmatter,
  offsetToPosition,
  type Position,
} from "./frontmatter";

export interface Diagnostic {
  message: string;
  severity: "error" | "warning";
  start: Position;
  end: Position;
  /** Set for schema violations; absent for YAML syntax errors. */
  code?: string;
}

/** Resolves a YAML node's [start, end) offsets, shifted into document space. */
function rangeOf(node: Node | null | undefined, offset: number) {
  const range = node?.range;
  if (!range) return null;
  return { start: range[0] + offset, end: range[1] + offset };
}

/** The range of a top-level key node itself, rather than of its value. */
function keyRange(doc: Document, key: string, offset: number) {
  const contents = doc.contents;
  if (!isMap(contents)) return null;
  const pair = contents.items.find(
    (item) => (item.key as { value?: unknown })?.value === key,
  );
  return rangeOf(pair?.key as Node | undefined, offset);
}

function valueAt(data: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>(
    (acc, key) =>
      acc && typeof acc === "object"
        ? (acc as Record<PropertyKey, unknown>)[key]
        : undefined,
    data,
  );
}

/**
 * zod names the expected type but not the field, so a missing required field
 * reads as a bare "expected string, received undefined" — useless in a
 * diagnostics list where the range is the whole block. Prefix the field, and
 * say plainly when the value is simply absent.
 */
function messageFor(
  path: readonly PropertyKey[],
  message: string,
  data: unknown,
): string {
  if (path.length === 0) return message;
  const field = path.join(".");
  if (valueAt(data, path) === undefined)
    return `Missing required field "${field}".`;
  return `${field}: ${message}`;
}

/**
 * Validates a file's frontmatter against its zod schema.
 *
 * Unrecognized keys are reported as warnings rather than errors: Claude Code
 * itself ignores a field it does not know, so the file still works — but
 * uploading it to claude.ai or packaging it fails hard on the same key, and a
 * misspelt field name silently does nothing, which is worth surfacing.
 */
export function diagnosticsFor(
  kind: FrontmatterKind,
  text: string,
): Diagnostic[] {
  const block = locateFrontmatter(text);
  if (!block) return [];

  const doc = parseDocument(block.source, { keepSourceTokens: true });

  if (doc.errors.length > 0) {
    return doc.errors.map((error) => ({
      message: error.message,
      severity: "error" as const,
      start: offsetToPosition(text, error.pos[0] + block.offset),
      end: offsetToPosition(text, error.pos[1] + block.offset),
    }));
  }

  const data = doc.toJS();

  // Fields the kind parses happily but never acts on. zod cannot surface these
  // — they are valid — yet writing one is almost always a misunderstanding, so
  // they get their own warning.
  const ignored: Diagnostic[] = (IGNORED_FIELDS[kind] ?? [])
    .filter((field) => data && typeof data === "object" && field in data)
    .flatMap((field) => {
      const span = keyRange(doc, field, block.offset);
      if (!span) return [];
      return [
        {
          // Phrased without an article so every kind name reads correctly —
          // "a output-style file" would not.
          message: `"${field}" has no effect in ${kind} files — Claude Code parses it and ignores it.`,
          severity: "warning" as const,
          code: "ignored_field",
          start: offsetToPosition(text, span.start),
          end: offsetToPosition(text, span.end),
        },
      ];
    });

  // An empty block parses to null and is valid wherever the schema has no
  // required fields; let zod decide rather than special-casing it here.
  const result = SCHEMAS[kind].safeParse(data ?? {});
  if (result.success) return ignored;

  // Fall back to the opening delimiter when a node cannot be located, so a
  // diagnostic is never silently dropped.
  const wholeBlock = {
    start: offsetToPosition(text, block.offset),
    end: offsetToPosition(text, block.offset + block.source.length),
  };

  return ignored.concat(
    result.error.issues.flatMap((issue): Diagnostic[] => {
      if (issue.code === "unrecognized_keys") {
        return issue.keys.map((key) => {
          const span = keyRange(doc, key, block.offset);
          return {
            message: `Unrecognized field "${key}". Claude Code ignores it, and packaging the file fails on it.`,
            severity: "warning" as const,
            code: issue.code,
            start: span ? offsetToPosition(text, span.start) : wholeBlock.start,
            end: span ? offsetToPosition(text, span.end) : wholeBlock.end,
          };
        });
      }

      const node =
        issue.path.length > 0
          ? (doc.getIn(issue.path, true) as Node | undefined)
          : null;
      const span = rangeOf(node, block.offset);
      return [
        {
          message: messageFor(issue.path, issue.message, data),
          severity: "error" as const,
          code: issue.code,
          start: span ? offsetToPosition(text, span.start) : wholeBlock.start,
          end: span ? offsetToPosition(text, span.end) : wholeBlock.end,
        },
      ];
    }),
  );
}
