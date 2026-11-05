import { describe, expect, it } from "bun:test";
import { diagnosticsFor } from "../src/core/diagnostics";

const messages = (kind: Parameters<typeof diagnosticsFor>[0], text: string) =>
  diagnosticsFor(kind, text).map((d) => d.message);

describe("clean input", () => {
  it("reports nothing for a valid skill", () => {
    const text =
      "---\nname: react-spring\ndescription: does things\nlicense: MIT\n---\nbody";
    expect(diagnosticsFor("skill", text)).toEqual([]);
  });

  it("reports nothing for a file with no frontmatter", () => {
    expect(diagnosticsFor("skill", "# heading\n\ntext")).toEqual([]);
  });

  it("reports nothing for an empty block on an all-optional schema", () => {
    expect(diagnosticsFor("rule", "---\n---\nbody")).toEqual([]);
  });

  it("accepts a yaml boolean written as `no`", () => {
    expect(diagnosticsFor("skill", "---\nuser-invocable: no\n---")).toEqual([]);
  });

  it("accepts argument-hint as an unquoted flow sequence", () => {
    // `[issue-number]` is the docs' own example and parses as a list, not a
    // string — a real skill (resolve-conflicts) ships it this way.
    expect(
      diagnosticsFor("skill", "---\nargument-hint: [issue-number]\n---"),
    ).toEqual([]);
  });

  it("accepts an agent with the fields added in v2.1.248 to v2.1.296", () => {
    const text =
      "---\nname: Log_Reader2\ndescription: x\nautoCompactWindow: 200000\nomitClaudeMd: true\nexperimental:\n  cacheTtl: 1h\n---";
    expect(diagnosticsFor("agent", text)).toEqual([]);
  });

  it("accepts a skill name with single spaces between words", () => {
    expect(diagnosticsFor("skill", "---\nname: Deploy staging\n---")).toEqual([]);
  });

  it("accepts a model id outside the suggested list", () => {
    expect(
      diagnosticsFor("skill", "---\nmodel: some-future-model\n---"),
    ).toEqual([]);
  });
});

describe("schema violations", () => {
  it("flags an unrecognized field as a warning, naming it", () => {
    const [diagnostic] = diagnosticsFor(
      "skill",
      "---\nallowed_tools: Read\n---",
    );
    expect(diagnostic!.severity).toBe("warning");
    expect(diagnostic!.message).toContain("allowed_tools");
  });

  it("flags a bad enum value as an error", () => {
    const [diagnostic] = diagnosticsFor("skill", "---\neffort: insane\n---");
    expect(diagnostic!.severity).toBe("error");
    expect(diagnostic!.message).toContain("low");
  });

  it("flags a missing required agent field", () => {
    expect(messages("agent", "---\ndescription: x\n---").join()).toContain(
      "name",
    );
  });

  it("flags an agent name containing a colon", () => {
    expect(
      messages("agent", '---\nname: "bad:name"\ndescription: x\n---').join(),
    ).toContain("`:`");
  });

  it("flags an agent name starting with a hyphen", () => {
    expect(
      messages("agent", '---\nname: "-reviewer"\ndescription: x\n---').join(),
    ).toContain("`-`");
  });

  it("flags an agent name over 256 characters", () => {
    const text = `---\nname: ${"a".repeat(257)}\ndescription: x\n---`;
    expect(messages("agent", text).join()).toContain("256");
  });

  it("flags an empty agent name", () => {
    expect(
      messages("agent", '---\nname: ""\ndescription: x\n---').join(),
    ).toContain("empty");
  });

  it("accepts autoCompactWindow at both inclusive bounds", () => {
    for (const value of [100000, 1000000]) {
      const text = `---\nname: a\ndescription: x\nautoCompactWindow: ${value}\n---`;
      expect(diagnosticsFor("agent", text)).toEqual([]);
    }
  });

  it("flags autoCompactWindow outside 100000 to 1000000", () => {
    for (const value of [99999, 1000001]) {
      const text = `---\nname: a\ndescription: x\nautoCompactWindow: ${value}\n---`;
      expect(messages("agent", text)).toHaveLength(1);
    }
  });

  it("flags an experimental.cacheTtl that is not 5m or 1h", () => {
    const text = "---\nname: a\ndescription: x\nexperimental:\n  cacheTtl: 2h\n---";
    const [diagnostic] = diagnosticsFor("agent", text);
    expect(diagnostic!.severity).toBe("error");
    expect(diagnostic!.message).toContain("experimental.cacheTtl");
  });

  it("flags an unknown key inside experimental at the key itself", () => {
    //  line 3: experimental:
    //  line 4:   cacheTTL: 1h
    const text = "---\nname: a\ndescription: x\nexperimental:\n  cacheTTL: 1h\n---";
    const [diagnostic] = diagnosticsFor("agent", text);
    expect(diagnostic!.severity).toBe("warning");
    expect(diagnostic!.message).toContain('"experimental.cacheTTL"');
    expect(diagnostic!.start.line).toBe(4);
    expect(diagnostic!.start.character).toBe(2);
  });

  it("flags a skill name holding < or >", () => {
    expect(messages("skill", '---\nname: "a<b"\n---').join()).toContain("`<`");
  });

  it("flags a skill name with a zero-width space", () => {
    expect(messages("skill", '---\nname: "dep​loy"\n---')).toHaveLength(1);
  });

  it("flags a skill name with a right-to-left override", () => {
    expect(messages("skill", '---\nname: "dep‮loy"\n---')).toHaveLength(1);
  });

  it("flags a skill name with a private-use glyph", () => {
    expect(messages("skill", '---\nname: "deploy "\n---')).toHaveLength(1);
  });

  it("flags blanks other than single spaces between words in a skill name", () => {
    for (const name of ["a b", "a  b", " a", "a "]) {
      expect(messages("skill", `---\nname: "${name}"\n---`)).toHaveLength(1);
    }
  });

  it("flags a skill name over 256 characters", () => {
    const text = `---\nname: ${"a".repeat(257)}\n---`;
    expect(messages("skill", text).join()).toContain("256");
  });

  it("flags maxTurns below 1", () => {
    expect(
      messages("agent", "---\nname: a\ndescription: x\nmaxTurns: 0\n---")
        .length,
    ).toBe(1);
  });

  it("flags a non-map metadata value", () => {
    expect(diagnosticsFor("skill", "---\nmetadata: nope\n---").length).toBe(1);
  });

  it("flags compatibility over 500 characters", () => {
    const text = `---\ncompatibility: "${"x".repeat(501)}"\n---`;
    expect(diagnosticsFor("skill", text).length).toBe(1);
  });

  it("flags every unrecognized key, not just the first", () => {
    const found = diagnosticsFor("rule", "---\npath: a\ndescriptions: b\n---");
    expect(found.length).toBe(2);
  });
});

describe("ranges", () => {
  it("points at the offending value, offset by the frontmatter position", () => {
    //  line 0: ---
    //  line 1: name: x
    //  line 2: effort: insane
    const [diagnostic] = diagnosticsFor(
      "skill",
      "---\nname: x\neffort: insane\n---",
    );
    expect(diagnostic!.start.line).toBe(2);
    expect(diagnostic!.start.character).toBe(8);
    expect(diagnostic!.end.character).toBe(14);
  });

  it("points at the key itself for an unrecognized field", () => {
    const [diagnostic] = diagnosticsFor("skill", "---\nname: x\nbogus: 1\n---");
    expect(diagnostic!.start.line).toBe(2);
    expect(diagnostic!.start.character).toBe(0);
    expect(diagnostic!.end.character).toBe(5);
  });

  it("reports malformed YAML as an error with a position", () => {
    const found = diagnosticsFor("skill", "---\nname: [unclosed\n---");
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]!.severity).toBe("error");
  });
});

describe("command files", () => {
  // "Files in .claude/commands/ support the same frontmatter, except `name`
  // and `paths`, which Claude Code ignores in a command file."
  it("warns that name has no effect, without calling it invalid", () => {
    const found = diagnosticsFor("command", "---\nname: deploy\n---\nbody");
    expect(found).toHaveLength(1);
    expect(found[0]!.severity).toBe("warning");
    expect(found[0]!.code).toBe("ignored_field");
    expect(found[0]!.message).toContain("no effect");
  });

  it("does not apply the skill name rules to an ignored command name", () => {
    const found = diagnosticsFor("command", '---\nname: "a<b"\n---');
    expect(found).toHaveLength(1);
    expect(found[0]!.code).toBe("ignored_field");
  });

  it("warns about paths too", () => {
    const found = diagnosticsFor("command", '---\npaths: "src/**"\n---');
    expect(found).toHaveLength(1);
    expect(found[0]!.code).toBe("ignored_field");
  });

  it("anchors the warning to the key, not the value", () => {
    const [d] = diagnosticsFor("command", "---\ndescription: x\nname: deploy\n---");
    expect(d!.start.line).toBe(2);
    expect(d!.start.character).toBe(0);
    expect(d!.end.character).toBe(4);
  });

  it("leaves a command with no ignored fields clean", () => {
    expect(diagnosticsFor("command", "---\ndescription: deploys\n---")).toEqual([]);
  });

  it("still reports real violations alongside the ignored-field warning", () => {
    const found = diagnosticsFor("command", "---\nname: x\neffort: insane\n---");
    expect(found.map((d) => d.severity).sort()).toEqual(["error", "warning"]);
  });

  it("does not warn about name in a skill file", () => {
    expect(diagnosticsFor("skill", "---\nname: x\n---")).toEqual([]);
  });
});

describe("output styles", () => {
  it("accepts the documented example", () => {
    const text =
      "---\nname: Diagrams first\ndescription: Lead every explanation with a diagram\nkeep-coding-instructions: true\n---\nbody";
    expect(diagnosticsFor("output-style", text)).toEqual([]);
  });

  it("accepts a name that is not kebab-case", () => {
    expect(diagnosticsFor("output-style", "---\nname: Diagrams first\n---")).toEqual(
      [],
    );
  });

  // `force-for-plugin` only does anything for a style shipped inside a plugin,
  // and a plugin never keeps its styles under `.claude/output-styles/`.
  it("warns that force-for-plugin has no effect here", () => {
    const found = diagnosticsFor("output-style", "---\nforce-for-plugin: true\n---");
    expect(found).toHaveLength(1);
    expect(found[0]!.severity).toBe("warning");
    expect(found[0]!.code).toBe("ignored_field");
  });

  it("flags a field borrowed from the skill schema", () => {
    const [diagnostic] = diagnosticsFor("output-style", "---\nmodel: opus\n---");
    expect(diagnostic!.severity).toBe("warning");
    expect(diagnostic!.message).toContain("model");
  });
});
