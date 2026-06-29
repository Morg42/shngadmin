/**
 * Pre-build script: injects git version info into src/app/git-version.auto.ts.
 *
 * Generates a version string that matches the format SmartHomeNG core uses:
 *   v{semver}-{short-hash}.{branch}
 * plus separate ref and path constants for the detail display.
 *
 * Run automatically via the `prebuild` and `prestart` npm hooks.
 * The generated file is committed with placeholder values so fresh clones
 * compile without running this script first.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: __dirname + '/..', encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const pkg        = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const appVersion = pkg.internalVersion || pkg.version || '0.0.0';
const shortHash = git('rev-parse --short HEAD') || 'unknown';
const branch    = git('rev-parse --abbrev-ref HEAD') || 'unknown';
// symbolic-ref gives e.g. "refs/heads/work"; strip "refs/" → "heads/work"
const fullRef   = (git('symbolic-ref HEAD') || '').replace(/^refs\//, '') || branch;

const output = `\
// Auto-generated at build time by scripts/generate-version.js — do not edit.
// Committed with placeholder values so fresh clones compile without a build step.
export const APP_VERSION = '${appVersion}';
export const GIT_COMMIT = '${shortHash}';
export const GIT_BRANCH = '${branch}';
export const GIT_REF    = '${fullRef}';   // e.g. "heads/work"
`;

const dest = path.join(__dirname, '..', 'src', 'app', 'git-version.auto.ts');
fs.writeFileSync(dest, output, 'utf8');
console.log(`[generate-version] v${appVersion}  ${shortHash}.${branch}  (${fullRef})`);
