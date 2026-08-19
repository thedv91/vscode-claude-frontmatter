import { z } from "zod";
import { EFFORT_LEVELS, modelValue, stringOrList, yamlBoolean } from "./shared";

/**
 * Frontmatter for a subagent under `.claude/agents/`.
 * Transcribed from https://code.claude.com/docs/en/sub-agents.
 *
 * Unlike skills, `name` and `description` are both required here.
 */
export const agentFrontmatter = z.strictObject({
  name: z
    .string()
    // A `:` is reserved for plugin-scoped identifiers; Claude Code refuses to
    // load a file whose name contains one (v2.1.218+).
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, digits and hyphens only",
    )
    .describe(
      "Unique identifier using lowercase letters and hyphens. Hooks receive this as `agent_type`. The filename does not have to match.",
    ),

  description: z
    .string()
    .describe("When Claude should delegate to this subagent."),

  tools: stringOrList
    .optional()
    .describe(
      "Tools the subagent can use. Omit to inherit every tool available to subagents. If no entry resolves to a real tool the subagent fails to launch. To preload skills, use `skills` rather than listing `Skill` here.",
    ),

  disallowedTools: stringOrList
    .optional()
    .describe("Tools to deny, removed from the inherited or specified list."),

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
    .describe("Model to use. Defaults to `inherit`."),

  permissionMode: z
    .enum([
      "default",
      "manual",
      "acceptEdits",
      "auto",
      "dontAsk",
      "bypassPermissions",
      "plan",
    ])
    .optional()
    .describe(
      "Permission mode for the subagent. `manual` is an alias for `default` and requires v2.1.200+. Ignored for plugin subagents. Default: inherits from the parent session.",
    ),

  maxTurns: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Maximum number of agentic turns before the subagent stops."),

  skills: stringOrList
    .optional()
    .describe(
      "Skills to preload into the subagent’s context at startup. The full skill content is injected, not just the description. Unlisted project, user, and plugin skills remain invocable through the Skill tool.",
    ),

  mcpServers: z
    .array(z.union([z.string(), z.record(z.string(), z.unknown())]))
    .optional()
    .describe(
      "MCP servers available to this subagent. Each entry is either the name of an already-configured server, or an inline definition keyed by server name. Ignored for plugin subagents.",
    ),

  hooks: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Lifecycle hooks scoped to this subagent. Ignored for plugin subagents. See https://code.claude.com/docs/en/sub-agents#define-hooks-for-subagents.",
    ),

  memory: z
    .enum(["user", "project", "local"])
    .optional()
    .describe(
      "Persistent memory scope, enabling cross-session learning. The subagent gets its own memory directory — the main conversation’s auto memory is not loaded into it.",
    ),

  background: yamlBoolean
    .optional()
    .describe(
      "Set true to keep this subagent in the background even when Claude asks to run it in the foreground. Default: false.",
    ),

  effort: z
    .enum(EFFORT_LEVELS)
    .optional()
    .describe(
      "Effort level while this subagent is active; overrides the session level. Available levels depend on the model. Default: inherits from session.",
    ),

  isolation: z
    .literal("worktree")
    .optional()
    .describe(
      "Set to `worktree` to run the subagent in a temporary git worktree — an isolated copy of the repository branched from your default branch rather than the parent session’s HEAD. Cleaned up automatically if the subagent makes no changes.",
    ),

  color: z
    .enum([
      "red",
      "blue",
      "green",
      "yellow",
      "purple",
      "orange",
      "pink",
      "cyan",
    ])
    .optional()
    .describe(
      "Display color for the subagent in the task list and transcript.",
    ),

  initialPrompt: z
    .string()
    .optional()
    .describe(
      "Auto-submitted as the first user turn when this agent runs as the main session agent (via --agent or the `agent` setting). Commands and skills are processed. Prepended to any user-provided prompt.",
    ),
});
