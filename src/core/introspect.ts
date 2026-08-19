import { z } from "zod";
import type { FrontmatterKind } from "../schemas";
import { SCHEMAS } from "../schemas";

export interface FieldInfo {
  name: string;
  description: string;
  /** Values worth offering: enum members, a literal, or booleans. */
  values: string[];
  /** Short type hint for the right-hand side of a completion row. */
  detail: string;
  required: boolean;
}

type JsonSchema = {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

/**
 * zod is the source of truth, but its internal `.def` shape is awkward to walk
 * and unstable across minor versions. `toJSONSchema` gives a documented,
 * flattened view with exactly the metadata completion needs — enum members,
 * literals as `const`, unions as `anyOf`, and `.describe()` text carried
 * through — so it serves as the intermediate representation.
 */
const cache = new Map<FrontmatterKind, FieldInfo[]>();

function valuesFor(node: JsonSchema | undefined): string[] {
  if (!node) return [];
  if (Array.isArray(node.enum)) return node.enum.map(String);
  if (node.const !== undefined) return [String(node.const)];

  const branches = node.anyOf ?? node.oneOf;
  if (branches) {
    const collected = branches.flatMap(valuesFor);
    // A `{type: 'boolean'}` branch carries no enum, so nothing above catches it.
    if (branches.some((branch) => branch.type === "boolean")) {
      return [...new Set(["true", "false", ...collected])];
    }
    return [...new Set(collected)];
  }
  if (node.type === "boolean") return ["true", "false"];
  return [];
}

function detailFor(node: JsonSchema | undefined): string {
  if (!node) return "";
  if (Array.isArray(node.enum)) return node.enum.join(" | ");
  if (node.const !== undefined) return String(node.const);
  if (node.anyOf ?? node.oneOf) {
    const types = (node.anyOf ?? node.oneOf ?? []).map((b) =>
      b.type === "array" ? "list" : (b.type ?? "value"),
    );
    return [...new Set(types)].join(" | ");
  }
  if (node.type === "array") return "list";
  return typeof node.type === "string" ? node.type : "";
}

export function fieldsFor(kind: FrontmatterKind): FieldInfo[] {
  const cached = cache.get(kind);
  if (cached) return cached;

  const json = z.toJSONSchema(SCHEMAS[kind], {
    // Descriptions are the whole point here; without this an `.optional()`
    // wrapper can swallow the text into a `$ref`.
    io: "input",
  }) as JsonSchema;

  const required = new Set(json.required ?? []);
  const fields = Object.entries(json.properties ?? {}).map(([name, node]) => ({
    name,
    description: node.description ?? "",
    values: valuesFor(node),
    detail: detailFor(node),
    required: required.has(name),
  }));

  cache.set(kind, fields);
  return fields;
}

/** The JSON Schema for a kind, for anyone who wants to consume it externally. */
export function jsonSchemaFor(kind: FrontmatterKind): unknown {
  return z.toJSONSchema(SCHEMAS[kind], { io: "input" });
}
