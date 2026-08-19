import { stringOrList } from "./shared";
import { skillFrontmatter } from "./skill";

/**
 * Frontmatter for a file under `.claude/commands/`.
 *
 * The docs put it plainly: "Files in `.claude/commands/` support the same
 * frontmatter, except `name` and `paths`, which Claude Code ignores in a
 * command file. You invoke a command file by its file name."
 *
 * So both fields stay in the schema — writing them is not an error and must not
 * be reported as one — but their descriptions say they do nothing, and
 * `IGNORED_FIELDS` drives a warning when either actually appears. Silently
 * accepting `name:` here is how someone ends up believing they renamed a
 * command that still answers to its filename.
 */
export const commandFrontmatter = skillFrontmatter.extend({
  name: skillFrontmatter.shape.name.describe(
    "Ignored in a command file — the command is named after the file, so `deploy.md` is always `/deploy`. Move the file to `.claude/skills/<name>/SKILL.md` if you need a name of your own.",
  ),
  paths: stringOrList
    .optional()
    .describe(
      "Ignored in a command file. Path-scoped activation only applies to a skill; a command runs when you type its name.",
    ),
});
