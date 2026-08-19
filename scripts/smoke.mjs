#!/usr/bin/env node
/**
 * Loads the built bundle with a stubbed `vscode` and drives it the way the
 * editor would. The unit tests cover `src/core` directly; this covers the thing
 * that actually ships — catching a broken bundle, a mis-set `main`, or a
 * dependency that does not survive bundling.
 *
 * Deliberately run under Node rather than Bun: VS Code executes extensions on
 * Node, and Bun's loader does not honour the `Module._load` hook this needs.
 */
import Module from 'node:module';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

class Range {
  constructor(sl, sc, el, ec) {
    Object.assign(this, { sl, sc, el, ec });
  }
}
class Diagnostic {
  constructor(range, message, severity) {
    Object.assign(this, { range, message, severity });
  }
}

const registered = {};
const diagnostics = new Map();

const vscodeStub = {
  CompletionItem: class {
    constructor(label, kind) {
      Object.assign(this, { label, kind });
    }
  },
  CompletionItemKind: { Property: 9, EnumMember: 19 },
  MarkdownString: class {
    constructor(value) {
      this.value = value;
    }
  },
  SnippetString: class {
    constructor(value) {
      this.value = value;
    }
  },
  Diagnostic,
  Range,
  DiagnosticSeverity: { Error: 0, Warning: 1 },
  languages: {
    registerCompletionItemProvider: (_selector, provider) => {
      registered.completion = provider;
      return { dispose() {} };
    },
    createDiagnosticCollection: () => ({
      set: (uri, items) => diagnostics.set(uri.fsPath, items),
      delete: (uri) => diagnostics.delete(uri.fsPath),
      dispose() {},
    }),
  },
  workspace: {
    textDocuments: [],
    onDidOpenTextDocument: () => ({ dispose() {} }),
    onDidChangeTextDocument: () => ({ dispose() {} }),
    onDidCloseTextDocument: () => ({ dispose() {} }),
  },
};

const realLoad = Module._load;
Module._load = (request, ...rest) =>
  request === 'vscode' ? vscodeStub : realLoad(request, ...rest);

const require = createRequire(import.meta.url);
const extension = require('../dist/extension.js');

const doc = (fsPath, text) => ({
  uri: { fsPath },
  languageId: 'markdown',
  getText: () => text,
});

const SKILL = '/w/.claude/skills/x/SKILL.md';
vscodeStub.workspace.textDocuments = [doc(SKILL, '---\nname: x\neffort: insane\n---\nbody')];

extension.activate({ subscriptions: [] });

const items =
  registered.completion.provideCompletionItems(doc(SKILL, '---\n\n---'), {
    line: 1,
    character: 0,
  }) ?? [];
assert.ok(
  items.some((i) => i.label === 'allowed-tools'),
  'expected skill field completions from the bundle',
);

const reported = diagnostics.get(SKILL) ?? [];
assert.equal(reported.length, 1, 'expected exactly one diagnostic');
assert.match(reported[0].message, /effort/);
assert.equal(reported[0].range.sl, 2, 'expected the diagnostic anchored to line 2');

console.log(
  `smoke: OK — ${items.length} completions, ${reported.length} diagnostic from dist/extension.js`,
);
