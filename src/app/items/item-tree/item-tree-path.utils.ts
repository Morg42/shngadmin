import { TreeNode } from 'primeng/api';

/** Depth-first search for the node whose `path` matches, expanding every
 *  ancestor node along the way down so the match ends up visible in a
 *  PrimeNG tree. Mutates `expanded` on ancestor nodes as a side effect. */
export function findAndExpandNodeByPath(
  nodes: (TreeNode & { path: string })[],
  path: string,
): (TreeNode & { path: string }) | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findAndExpandNodeByPath(node.children as (TreeNode & { path: string })[], path);
      if (found) {
        node.expanded = true;
        return found;
      }
    }
  }
  return null;
}

/** Walks *path*'s dot-separated ancestor chain (excluding the leaf
 *  itself, which always gets created fresh, never treated as an
 *  "ancestor") and returns the ones not present in *known*, shallow to
 *  deep — the order createItemChain() needs to create them in. */
export function computeMissingAncestors(path: string, known: Set<string>): string[] {
  const segments = path.split('.');
  segments.pop();
  const missing: string[] = [];
  let current = '';
  for (const segment of segments) {
    current = current ? current + '.' + segment : segment;
    if (!known.has(current)) missing.push(current);
  }
  return missing;
}
