/** Formats the build identification shown next to the version, in the same
 *  semver form the SmartHomeNG core uses: v{version}+{part}.{part}. Characters
 *  outside [0-9A-Za-z-] are replaced by '-' (branch names contain '/' and '_');
 *  empty parts are skipped. */
export function formatVersionDetail(version: string, ...buildParts: string[]): string {
  const build = buildParts
    .filter((part) => part !== '')
    .map((part) => part.replace(/[^0-9A-Za-z-]/g, '-'))
    .join('.');
  return build ? `v${version}+${build}` : `v${version}`;
}
