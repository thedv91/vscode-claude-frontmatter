import { z } from "zod";
import { yamlBoolean } from "./shared";

/**
 * Frontmatter for a custom output style under `.claude/output-styles/`.
 * Transcribed from https://code.claude.com/docs/en/output-styles#frontmatter.
 *
 * Every field is optional: a style with no frontmatter at all is named after
 * its file and replaces Claude Code's software engineering instructions.
 */
export const outputStyleFrontmatter = z.strictObject({
  name: z
    .string()
    .optional()
    .describe(
      "Name of the output style, shown in the `/config` picker and matched by the `outputStyle` setting. Defaults to the file name.",
    ),

  description: z
    .string()
    .optional()
    .describe(
      "Description of the output style, shown in the `/config` picker.",
    ),

  "keep-coding-instructions": yamlBoolean
    .optional()
    .describe(
      "Set true to keep Claude Code's built-in software engineering instructions — how to scope changes, write comments, verify work — alongside your own. Leave it out when Claude is not doing software engineering at all. Default: false.",
    ),

  "force-for-plugin": yamlBoolean
    .optional()
    .describe(
      "Plugin output styles only: apply this style automatically whenever the plugin is enabled, overriding the user's `outputStyle` setting. Where several enabled plugins set it, the first one loaded wins. Default: false.",
    ),
});
