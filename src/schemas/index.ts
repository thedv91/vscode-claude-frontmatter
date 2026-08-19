import { z } from "zod";
import { stringOrList } from "./shared";
import { skillFrontmatter } from "./skill";
import { agentFrontmatter } from "./agent";
import { commandFrontmatter } from "./command";

/**
 * Frontmatter for a rule under `.claude/rules/`. Only `paths` is documented,
 * and the block is optional entirely — a rule with no frontmatter loads
 * unconditionally at launch, at the same priority as `.claude/CLAUDE.md`.
 */
export const ruleFrontmatter = z.strictObject({
  paths: stringOrList
    .optional()
    .describe(
      "Glob patterns scoping the rule to matching files. When set, the rule loads only when Claude reads a matching file, rather than at launch. Brace expansion is supported; the whole list shares a budget of 1000 expanded patterns and 4 MiB.",
    ),
});

export type FrontmatterKind = "skill" | "command" | "rule" | "agent";

export const SCHEMAS = {
  skill: skillFrontmatter,
  command: commandFrontmatter,
  rule: ruleFrontmatter,
  agent: agentFrontmatter,
} as const;

/**
 * Fields a kind accepts without complaint but never acts on. These are not
 * schema violations — they parse fine — so they are reported separately, as a
 * warning, rather than through zod.
 */
export const IGNORED_FIELDS: Partial<
  Record<FrontmatterKind, readonly string[]>
> = {
  command: ["name", "paths"],
};

/**
 * Which schema governs a file, decided purely by its path. Returns null for
 * markdown that is not a Claude definition file, which is most of it — the
 * providers stay silent in that case rather than guessing.
 *
 * `SKILL.md` is tested first so a `SKILL.md` placed inside `.claude/commands/`
 * still reads as a skill.
 */
export function kindForPath(filePath: string): FrontmatterKind | null {
  const posix = filePath.replaceAll("\\", "/");
  if (/(^|\/)SKILL\.md$/.test(posix)) return "skill";
  if (posix.includes("/.claude/commands/")) return "command";
  if (posix.includes("/.claude/rules/")) return "rule";
  if (posix.includes("/.claude/agents/")) return "agent";
  return null;
}

export { skillFrontmatter, agentFrontmatter, commandFrontmatter };
