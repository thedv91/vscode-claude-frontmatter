import * as vscode from "vscode";
import { kindForPath } from "./schemas";
import { completionsAt } from "./core/completion";
import { diagnosticsFor } from "./core/diagnostics";

/**
 * Thin adapter over `src/core`, which is deliberately free of any `vscode`
 * import so the real logic is testable with plain `bun test`.
 */

const SELECTOR: vscode.DocumentSelector = { language: "markdown" };

const completionProvider: vscode.CompletionItemProvider = {
  provideCompletionItems(document, position) {
    const kind = kindForPath(document.uri.fsPath);
    if (!kind) return undefined;

    return completionsAt(
      kind,
      document.getText(),
      position.line,
      position.character,
    ).map((suggestion) => {
      const item = new vscode.CompletionItem(
        suggestion.label,
        suggestion.kind === "field"
          ? vscode.CompletionItemKind.Property
          : vscode.CompletionItemKind.EnumMember,
      );
      item.detail = suggestion.detail;
      item.documentation = new vscode.MarkdownString(suggestion.documentation);
      item.insertText = new vscode.SnippetString(suggestion.insertText);
      item.sortText = suggestion.sortText;
      return item;
    });
  },
};

function refresh(
  collection: vscode.DiagnosticCollection,
  document: vscode.TextDocument,
): void {
  if (document.languageId !== "markdown") return;

  const kind = kindForPath(document.uri.fsPath);
  if (!kind) {
    collection.delete(document.uri);
    return;
  }

  collection.set(
    document.uri,
    diagnosticsFor(kind, document.getText()).map((diagnostic) => {
      const item = new vscode.Diagnostic(
        new vscode.Range(
          diagnostic.start.line,
          diagnostic.start.character,
          diagnostic.end.line,
          diagnostic.end.character,
        ),
        diagnostic.message,
        diagnostic.severity === "error"
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning,
      );
      item.source = "claude-frontmatter";
      if (diagnostic.code) item.code = diagnostic.code;
      return item;
    }),
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const collection =
    vscode.languages.createDiagnosticCollection("claude-frontmatter");

  context.subscriptions.push(
    collection,
    vscode.languages.registerCompletionItemProvider(
      SELECTOR,
      completionProvider,
      ":",
      " ",
    ),
    vscode.workspace.onDidOpenTextDocument((document) =>
      refresh(collection, document),
    ),
    vscode.workspace.onDidChangeTextDocument((event) =>
      refresh(collection, event.document),
    ),
    vscode.workspace.onDidCloseTextDocument((document) =>
      collection.delete(document.uri),
    ),
  );

  // Documents already open when the extension activates never fire onDidOpen.
  for (const document of vscode.workspace.textDocuments)
    refresh(collection, document);
}

export function deactivate(): void {}
