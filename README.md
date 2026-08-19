# Claude Frontmatter

Completion and validation for the YAML frontmatter of [Claude Code](https://code.claude.com/docs)
definition files, in VS Code.

Claude's `SKILL.md`, command, rule, and subagent files are configured through a
YAML frontmatter block whose fields are documented but not schema-checked
anywhere. A misspelt field name does nothing at all — no error, no warning, the
skill just quietly behaves as though you never wrote the line. This extension
makes the block behave like every other config file you edit.

## Features

**Completion** inside the frontmatter block: field names with their
documentation, a pick-list for every enum field, required fields sorted first,
and fields already present filtered out. It stays silent outside the block, on
the `---` delimiters, and in markdown that is not a Claude definition file.

**Diagnostics** on the same files. Unrecognized fields are warnings — Claude
Code ignores a field it does not know, so the file still works, but uploading it
to claude.ai or packaging it fails on the same key. Type and enum violations are
errors, anchored to the offending key or value rather than the whole block.

The schema for each file kind is picked from its path, so a subagent file never
offers `allowed-tools` and a rule file offers only `paths`.

A command file gets its own schema rather than borrowing the skill one. It takes
the same fields, but `name` and `paths` are inert there — a command is named
after its file — so writing either is reported as a warning instead of passing
silently.

| Path | Schema |
| --- | --- |
| `**/SKILL.md` | [skill](https://code.claude.com/docs/en/skills#frontmatter-reference) |
| `.claude/commands/**/*.md` | [command](https://code.claude.com/docs/en/skills#frontmatter-reference) — the skill fields, minus the two that do nothing here |
| `.claude/rules/**/*.md` | [rule](https://code.claude.com/docs/en/memory#path-specific-rules) |
| `.claude/agents/**/*.md` | [subagent](https://code.claude.com/docs/en/sub-agents) |

## Install

Search for **Claude Frontmatter** in the Extensions view, or from a terminal:

```bash
code --install-extension thedv91.claude-frontmatter
```

Cursor, Windsurf, VSCodium and Gitpod install the same extension from
[Open VSX](https://open-vsx.org/extension/thedv91/claude-frontmatter):

```bash
cursor --install-extension thedv91.claude-frontmatter
```

Nothing to configure.

VS Code disables suggestions inside markdown by default, so add this if
completions only appear on <kbd>Ctrl</kbd>+<kbd>Space</kbd>:

```json
"[markdown]": {
  "editor.quickSuggestions": { "other": true }
}
```

## Known quirks

Three places where the extension's behaviour follows something other than the
first line of the documentation:

- `argument-hint: [issue-number]` — the docs' own example — is an unquoted YAML
  flow sequence and parses as a **list**, not a string. Anthropic's own bundled
  `resolve-conflicts` skill ships it this way. Both forms are accepted.
- The docs describe `tools:` for subagents only, yet several first-party plugin
  skills use `tools:` in a `SKILL.md`. It is not part of the skill schema here,
  so it is reported as an unrecognized field.
- The subagent page's field table omits `manual` from `permissionMode`, but the
  permissions page states Claude Code accepts it as an alias for `default`
  (v2.1.200+). The schema follows the permissions page.

## Links

- [Source and issue tracker](https://github.com/thedv91/vscode-claude-frontmatter)
- [Changelog](https://github.com/thedv91/vscode-claude-frontmatter/blob/main/CHANGELOG.md)
- [Contributing](https://github.com/thedv91/vscode-claude-frontmatter/blob/main/CONTRIBUTING.md)

## License

MIT
