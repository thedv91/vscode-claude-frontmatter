import { describe, expect, it } from "bun:test";
import { completionsAt } from "../src/core/completion";
import { kindForPath } from "../src/schemas";

const labels = (
  kind: Parameters<typeof completionsAt>[0],
  text: string,
  line: number,
  ch = 0,
) => completionsAt(kind, text, line, ch).map((s) => s.label);

describe("kindForPath", () => {
  it.each([
    ["/w/.claude/skills/x/SKILL.md", "skill"],
    ["/w/plugin/skills/x/SKILL.md", "skill"],
    ["/w/.claude/commands/deploy.md", "command"],
    ["/w/.claude/rules/style.md", "rule"],
    ["/w/.claude/agents/reviewer.md", "agent"],
    ["/w/README.md", null],
    ["/w/docs/.claude-notes/x.md", null],
  ])("maps %s", (path, expected) => {
    expect(kindForPath(path)).toBe(expected as never);
  });

  it("reads a SKILL.md inside commands/ as a skill", () => {
    expect(kindForPath("/w/.claude/commands/SKILL.md")).toBe("skill");
  });

  it("handles Windows separators", () => {
    expect(kindForPath(String.raw`C:\w\.claude\agents\r.md`)).toBe("agent");
  });
});

describe("completion position", () => {
  it("suggests skill fields on a blank line inside the block", () => {
    const got = labels("skill", "---\n\n---\nbody", 1);
    expect(got).toEqual(
      expect.arrayContaining(["description", "allowed-tools", "effort"]),
    );
  });

  it("stays silent outside the block", () => {
    expect(labels("skill", "---\nname: x\n---\nbody", 3)).toEqual([]);
  });

  it("stays silent on both delimiter lines", () => {
    const text = "---\nname: x\n---\nbody";
    expect(labels("skill", text, 0)).toEqual([]);
    expect(labels("skill", text, 2)).toEqual([]);
  });

  it("stays silent with no frontmatter at all", () => {
    expect(labels("skill", "# heading\ntext", 1)).toEqual([]);
  });

  it("stays silent while the block is still unterminated", () => {
    expect(labels("skill", "---\nname: x\n", 1)).toEqual([]);
  });

  it("stays silent on an indented line", () => {
    expect(labels("skill", "---\nmetadata:\n  \n---", 2, 2)).toEqual([]);
  });
});

describe("field suggestions", () => {
  it("hides fields already present", () => {
    const got = labels("skill", "---\nname: x\ndescription: y\n\n---", 3);
    expect(got).not.toContain("name");
    expect(got).not.toContain("description");
    expect(got).toContain("effort");
  });

  it("sorts required agent fields first", () => {
    const items = completionsAt("agent", "---\n\n---", 1, 0);
    const name = items.find((i) => i.label === "name");
    const color = items.find((i) => i.label === "color");
    expect(name!.sortText < color!.sortText).toBe(true);
  });

  it("offers only paths for a rule", () => {
    expect(labels("rule", "---\n\n---", 1)).toEqual(["paths"]);
  });

  it("keeps skill and agent fields apart", () => {
    expect(labels("agent", "---\n\n---", 1)).toContain("permissionMode");
    expect(labels("agent", "---\n\n---", 1)).not.toContain("allowed-tools");
    expect(labels("skill", "---\n\n---", 1)).not.toContain("permissionMode");
  });

  it("builds a choice snippet for an enum field", () => {
    const effort = completionsAt("skill", "---\n\n---", 1, 0).find(
      (i) => i.label === "effort",
    );
    expect(effort!.insertText).toBe("effort: ${1|low,medium,high,xhigh,max|}");
  });

  it("builds a plain placeholder for a free-text field", () => {
    const item = completionsAt("skill", "---\n\n---", 1, 0).find(
      (i) => i.label === "description",
    );
    expect(item!.insertText).toBe("description: ${1}");
  });

  it("carries the zod description through to the docs", () => {
    const item = completionsAt("skill", "---\n\n---", 1, 0).find(
      (i) => i.label === "when_to_use",
    );
    expect(item!.documentation).toContain("trigger phrases");
  });
});

describe("value suggestions", () => {
  it("completes enum members after the colon", () => {
    expect(labels("skill", "---\neffort: \n---", 1, 8)).toEqual([
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ]);
  });

  it("completes a literal", () => {
    expect(labels("skill", "---\ncontext: \n---", 1, 9)).toEqual(["fork"]);
  });

  it("completes booleans for a yaml-boolean union", () => {
    const got = labels("skill", "---\nuser-invocable: \n---", 1, 16);
    expect(got).toContain("true");
    expect(got).toContain("false");
  });

  it("offers model aliases even though any string validates", () => {
    expect(labels("skill", "---\nmodel: \n---", 1, 7)).toContain("inherit");
  });

  it("offers nothing for a free-text field", () => {
    expect(labels("skill", "---\ndescription: \n---", 1, 13)).toEqual([]);
  });

  it("offers nothing for an unknown field", () => {
    expect(labels("skill", "---\nnonsense: \n---", 1, 10)).toEqual([]);
  });

  it("completes agent colors", () => {
    expect(labels("agent", "---\ncolor: \n---", 1, 7)).toContain("cyan");
  });
});
