import { z } from "zod";
import { EFFORT_LEVELS, modelValue, stringOrList, yamlBoolean } from "./shared";

/**
 * Frontmatter for a Claude Code `SKILL.md`, and for a file under
 * `.claude/commands/` where `name` and `paths` are accepted but ignored.
 *
 * Transcribed from https://code.claude.com/docs/en/skills#frontmatter-reference.
 * Every field is optional; only `description` is recommended.
 */
export const skillFrontmatter = z.strictObject({
  name: z
    .string()
    .optional()
    .describe(
      "Display name shown in skill listings. Defaults to the directory name. In a personal or project skill this sets only the display label — the command still comes from the directory name. In a plugin skill it sets the last segment of the command.",
    ),

  description: z
    .string()
    .optional()
    .describe(
      "What the skill does and when to use it. Claude uses this to decide when to apply the skill. If omitted, the first paragraph of the markdown body is used. Put the key use case first: `description` + `when_to_use` are truncated at 1536 characters in the skill listing.",
    ),

  when_to_use: z
    .string()
    .optional()
    .describe(
      "Additional context for when Claude should invoke the skill — trigger phrases or example requests. Appended to `description` in the listing and counts toward the shared 1536-character cap.",
    ),

  "argument-hint": stringOrList
    .optional()
    .describe(
      "Hint shown during autocomplete to indicate expected arguments. Documented as a string, but the docs' own example `[issue-number]` is an unquoted YAML flow sequence and parses as a list — as do real skills such as the bundled resolve-conflicts. Quote the value to keep it a string.",
    ),

  arguments: stringOrList
    .optional()
    .describe(
      "Named positional arguments for `$name` substitution in the skill body. Space-separated string or a YAML list; names map to argument positions in order.",
    ),

  "disable-model-invocation": yamlBoolean
    .optional()
    .describe(
      "Set true to stop Claude loading this skill automatically — invoke it manually with /name. Also blocks preloading into subagents and running from a scheduled task. Default: false.",
    ),

  "user-invocable": yamlBoolean
    .optional()
    .describe(
      "Set false when only Claude should invoke the skill: it is hidden from the / menu and typing /name does nothing. Use for background knowledge. Default: true.",
    ),

  "allowed-tools": stringOrList
    .optional()
    .describe(
      "Tools Claude may use without a permission prompt during the turn that invokes this skill. The grant clears on your next message. Space- or comma-separated string, or a YAML list.",
    ),

  "disallowed-tools": stringOrList
    .optional()
    .describe(
      "Tools removed from Claude’s pool while this skill is active — e.g. AskUserQuestion for an autonomous loop. Clears on your next message. Cannot remove EndConversation while any other tool remains.",
    ),

  model: modelValue([
    "inherit",
    "opus",
    "sonnet",
    "haiku",
    "fable",
    "claude-opus-5",
    "claude-sonnet-5",
    "claude-fable-5",
    "claude-haiku-4-5-20251001",
  ])
    .optional()
    .describe(
      "Model to use while this skill is active. Applies for the rest of the current turn only; not saved to settings. Accepts the same values as /model, or `inherit`. With `context: fork` it sets the forked subagent’s model instead.",
    ),

  effort: z
    .enum(EFFORT_LEVELS)
    .optional()
    .describe(
      "Effort level while this skill is active; overrides the session level. Available levels depend on the model. Default: inherits from session.",
    ),

  context: z
    .literal("fork")
    .optional()
    .describe("Set to `fork` to run the skill in a forked subagent context."),

  agent: z
    .string()
    .optional()
    .describe(
      "Which subagent type to use. Only meaningful with `context: fork`.",
    ),

  background: yamlBoolean
    .optional()
    .describe(
      "Only applies with `context: fork`. Set false to wait for the forked subagent’s result in the invoking turn instead of running it in the background. Default: true. Requires Claude Code v2.1.218+.",
    ),

  hooks: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Hooks registered when the skill is invoked, kept for the rest of the session. See https://code.claude.com/docs/en/hooks#hooks-in-skills-and-agents for the configuration format and the `once` option.",
    ),

  paths: stringOrList
    .optional()
    .describe(
      "Glob patterns limiting when the skill activates automatically. Comma-separated string or a YAML list. Same format as path-specific rules.",
    ),

  shell: z
    .enum(["bash", "powershell"])
    .optional()
    .describe(
      "Shell used for inline `!` commands in this skill. Default: bash. `powershell` requires the PowerShell tool to be enabled.",
    ),

  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Free-form map for your own tooling — entitlement or catalog fields. Claude Code does not act on it and drops a value that is not a map. Do not reuse frontmatter field names such as `paths` as keys.",
    ),

  license: z
    .string()
    .optional()
    .describe(
      "License covering the skill. Part of the Agent Skills spec; Claude Code accepts but does not act on it.",
    ),

  compatibility: z
    .string()
    .max(500)
    .optional()
    .describe(
      "Environment requirements — intended products or system prerequisites — per the Agent Skills spec. Claude Code accepts but does not act on it.",
    ),
});
