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
    ).toContain("lowercase");
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
