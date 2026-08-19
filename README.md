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

## Setup

Install the extension. Nothing to configure.

VS Code disables suggestions inside markdown by default, so add this if
completions only appear on <kbd>Ctrl</kbd>+<kbd>Space</kbd>:

```json
"[markdown]": {
  "editor.quickSuggestions": { "other": true }
}
```

## How it is built

The schemas live in `src/schemas/` as [zod](https://zod.dev) objects and are the
single source of truth. Completion reads them through `z.toJSONSchema()`;
diagnostics run `safeParse` against the same objects. The two cannot drift.

`src/core/` holds the real logic and imports nothing from `vscode`, so it is
tested directly with `bun test`. `src/extension.ts` is a thin adapter.

```bash
bun install
bun run check          # typecheck, unit tests, build, then smoke-test the bundle
bun run install:local  # package and install into your own VS Code
bun run schema:emit    # regenerate schemas/*.json from the zod definitions
```

`schemas/*.json` are generated for consumers that cannot import TypeScript —
`remark-lint-frontmatter-schema`, a CI validator, or another editor. Never edit
them by hand; CI fails if they are stale.

### Notes for anyone transcribing the docs

Three places the documentation misleads, each of which cost real debugging time:

- `argument-hint: [issue-number]` — the docs' own example — is an unquoted YAML
  flow sequence and parses as a **list**, not a string. Anthropic's own bundled
  `resolve-conflicts` skill ships it this way. The schema accepts both.
- The docs describe `tools:` for subagents only, yet several first-party plugin
  skills use `tools:` in a `SKILL.md`. It is not in the skill schema here, so it
  is reported as an unrecognized field. If that turns out to be a supported
  alias rather than a mistake in those plugins, the schema should change.
- The subagent page's field table omits `manual` from `permissionMode`, but the
  permissions page states Claude Code accepts it as an alias for `default`
  (v2.1.200+). The schema follows the permissions page.

## Publishing

Publishing needs a Marketplace publisher and a token, neither of which lives in
this repo:

1. Create a publisher at <https://marketplace.visualstudio.com/manage> and set
   `publisher` in `package.json` to its id.
2. Create an Azure DevOps personal access token with **Marketplace → Manage**,
   and save it as the `VSCE_PAT` repository secret.
3. Add a 128×128 `icon.png` and reference it from `package.json`. The listing
   works without one but looks unfinished.
4. Bump the version, tag it `vX.Y.Z`, and push the tag. `.github/workflows/release.yml`
   verifies the tag matches `package.json`, publishes, and attaches the vsix to
   a GitHub release.

## License

MIT
