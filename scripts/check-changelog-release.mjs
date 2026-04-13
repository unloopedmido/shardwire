#!/usr/bin/env node
/**
 * Ensures CHANGELOG.md documents package.json version as released (not "(unreleased)").
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const unreleasedHeader = new RegExp(`^##\\s+${escapeRegExp(version)}\\s*\\(unreleased\\)`, "m");
if (unreleasedHeader.test(changelog)) {
  console.error(
    `CHANGELOG.md lists version ${version} as "(unreleased)" but package.json is also ${version}. ` +
      `Remove "(unreleased)" from that section before release.`,
  );
  process.exit(1);
}

const releasedHeader = new RegExp(`^##\\s+${escapeRegExp(version)}\\b`, "m");
if (!releasedHeader.test(changelog)) {
  console.error(`CHANGELOG.md must contain a section header "## ${version}" for the current package version.`);
  process.exit(1);
}

console.log(`CHANGELOG release check passed for ${version}.`);
