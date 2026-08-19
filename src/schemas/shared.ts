import { z } from "zod";

/**
 * Claude Code accepts `yes`, `no`, `on`, `off`, `1`, and `0` in any letter case
 * alongside `true`/`false` (v2.1.218+). A YAML 1.1 parser coerces most of these
 * to a real boolean before we ever see them, so both shapes must pass.
 */
export const yamlBoolean = z.union([
  z.boolean(),
  z
    .string()
    .regex(/^(true|false|yes|no|on|off|1|0)$/i, "Expected a YAML boolean"),
]);

/** Several fields accept either a delimited string or a YAML list. */
export const stringOrList = z.union([z.string(), z.array(z.string())]);

/**
 * Model aliases and ids worth suggesting. The trailing `z.string()` is what
 * actually validates — the enum exists so completion has something to offer,
 * since the list of published models changes faster than this extension ships.
 */
export const modelValue = (extra: readonly [string, ...string[]]) =>
  z.union([z.enum(extra), z.string()]);

export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
