# Changelog

## Unreleased

- A schema for `.claude/output-styles/` files, covering `name`, `description`,
  `keep-coding-instructions`, and `force-for-plugin` — the last flagged as
  having no effect outside a plugin.

## 0.1.0

Initial release.

- Completion for the frontmatter of `SKILL.md`, `.claude/commands/`,
  `.claude/rules/`, and `.claude/agents/` files: field names with their
  documentation, a pick-list for every enum field, required fields first, and
  fields already present filtered out.
- Diagnostics for the same files: unrecognized fields as warnings, type and
  enum violations as errors, anchored to the offending key or value.
- A dedicated schema for `.claude/commands/` files: the same fields as a skill,
  but `name` and `paths` are flagged as having no effect there rather than
  accepted silently.
- Marketplace icon, drawn from `scripts/make-icon.py`.
- Schemas defined in zod and introspected for both features, so the two can
  never disagree.
