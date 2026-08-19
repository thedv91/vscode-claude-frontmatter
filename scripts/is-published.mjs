#!/usr/bin/env node
/**
 * Prints `true` when this package's version is already on the given registry,
 * `false` otherwise. The release workflow uses it to skip publishing rather
 * than fail on a version that is already up — which happens whenever a build
 * was uploaded by hand, or a release is re-run.
 *
 *   node scripts/is-published.mjs            # VS Code Marketplace (default)
 *   node scripts/is-published.mjs --ovsx     # Open VSX
 *
 * On any network or API trouble it prints `false`: not knowing is not a reason
 * to skip the job's whole purpose, and the publisher CLI reports the real error
 * far better than a guess here would.
 */
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const { publisher, name, version } = manifest;
const id = `${publisher}.${name}`;
const useOvsx = process.argv.includes("--ovsx");

/** Every published version, so the log shows what the registry actually holds. */
async function marketplaceVersions() {
  const response = await fetch(
    "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery",
    {
      method: "POST",
      headers: {
        Accept: "application/json;api-version=7.2-preview.1",
        "Content-Type": "application/json",
      },
      // filterType 7 is "extension name"; flag 914 asks for the version list.
      body: JSON.stringify({
        filters: [{ criteria: [{ filterType: 7, value: id }] }],
        flags: 914,
      }),
    },
  );
  if (!response.ok) throw new Error(`gallery responded ${response.status}`);
  const body = await response.json();
  const extension = body.results?.[0]?.extensions?.[0];
  return (extension?.versions ?? []).map((v) => v.version);
}

async function openVsxVersions() {
  const response = await fetch(`https://open-vsx.org/api/${publisher}/${name}`);
  // A namespace or extension that does not exist yet is a normal first-publish
  // state, not an error.
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`open-vsx responded ${response.status}`);
  const body = await response.json();
  return Object.keys(body.allVersions ?? {}).filter((v) => v !== "latest");
}

try {
  const registry = useOvsx ? "open-vsx" : "marketplace";
  const versions = useOvsx ? await openVsxVersions() : await marketplaceVersions();
  console.error(
    `${id}: manifest ${version}, ${registry} [${versions.join(", ") || "none"}]`,
  );
  console.log(versions.includes(version) ? "true" : "false");
} catch (error) {
  console.error(
    `could not reach the registry (${error.message}); assuming not published`,
  );
  console.log("false");
}
