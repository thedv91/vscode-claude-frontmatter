#!/usr/bin/env node
/**
 * Prints `true` when this package's version is already on the Marketplace,
 * `false` otherwise. The release workflow uses it to skip publishing rather
 * than fail on a version that is already up — which happens whenever a build
 * was uploaded by hand, or a release is re-run.
 *
 * On any network or API trouble it prints `false`: not knowing is not a reason
 * to skip the job's whole purpose, and `vsce publish` reports the real error
 * far better than a guess here would.
 */
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const id = `${manifest.publisher}.${manifest.name}`;

const QUERY_URL =
  "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";

try {
  const response = await fetch(QUERY_URL, {
    method: "POST",
    headers: {
      Accept: "application/json;api-version=7.2-preview.1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // filterType 7 is "extension name"; flag 914 asks for the version list.
      filters: [{ criteria: [{ filterType: 7, value: id }] }],
      flags: 914,
    }),
  });

  if (!response.ok) throw new Error(`gallery responded ${response.status}`);

  const body = await response.json();
  const extension = body.results?.[0]?.extensions?.[0];
  const versions = (extension?.versions ?? []).map((v) => v.version);
  const published = versions.includes(manifest.version);

  console.error(
    `${id}: manifest ${manifest.version}, marketplace [${versions.join(", ") || "none"}]`,
  );
  console.log(published ? "true" : "false");
} catch (error) {
  console.error(`could not reach the Marketplace (${error.message}); assuming not published`);
  console.log("false");
}
