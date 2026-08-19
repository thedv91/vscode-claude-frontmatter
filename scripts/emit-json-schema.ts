#!/usr/bin/env bun
/**
 * Emits the zod schemas as JSON Schema into `schemas/`, for consumers that
 * cannot import TypeScript — remark-lint-frontmatter-schema, a CI validator,
 * or any editor that takes a schema file. zod stays the source of truth; these
 * files are generated and should never be hand-edited.
 */
import { mkdir } from "node:fs/promises";
import { jsonSchemaFor } from "../src/core/introspect";
import type { FrontmatterKind } from "../src/schemas";

const OUT = new URL("../schemas/", import.meta.url);

// `command` shares the skill schema, so emitting it would duplicate the file.
const KINDS: FrontmatterKind[] = ["skill", "rule", "agent"];

await mkdir(OUT, { recursive: true });

for (const kind of KINDS) {
  const path = new URL(`${kind}-frontmatter.schema.json`, OUT);
  await Bun.write(path, `${JSON.stringify(jsonSchemaFor(kind), null, 2)}\n`);
  console.log(`wrote schemas/${kind}-frontmatter.schema.json`);
}
