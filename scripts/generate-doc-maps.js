/**
 * Generates doc/maps.md: the reference maps of shngAdmin, derived from src/app.
 *
 *   npm run doc:maps
 *   node scripts/generate-doc-maps.js [--out <file>]
 *
 * Maps: routes, backend endpoints per API service, model shapes, source
 * file catalogue, and what each class injects. The source is parsed with
 * regular expressions, not a TypeScript parser: a construct the patterns do
 * not know shows up as "?" or is missing, so skim the result after larger
 * refactorings (see doc/architecture.md, "Reference maps").
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'src', 'app');
const outIndex = process.argv.indexOf('--out');
const OUT =
  outIndex > -1 ? path.resolve(process.argv[outIndex + 1]) : path.join(ROOT, 'doc', 'maps.md');

/** Lists the files below dir whose name passes accept(), sorted, as paths relative to APP. */
function walk(dir, accept) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(full, accept));
    } else if (accept(entry.name)) {
      found.push(path.relative(APP, full));
    }
  }
  return found.sort();
}

const isSource = (name) =>
  name.endsWith('.ts') && !name.endsWith('.spec.ts') && !name.endsWith('.d.ts');
const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');
const table = (header, rows) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');

/**
 * First sentence of the JSDoc block that precedes the symbol at index (decorators may sit in between),
 * or an empty string.
 */
function leadingComment(text, index) {
  const before = text.slice(0, index);
  const end = before.lastIndexOf('*/');
  if (end < 0) return '';
  const start = before.lastIndexOf('/**', end);
  if (start < 0 || /[;]|\bimport\b|\nexport\b/.test(before.slice(end + 2))) return '';
  const lines = before
    .slice(start + 3, end)
    .split('\n')
    .map((l) => l.replace(/^\s*\*?\s?/, '').trim())
    .filter((l) => l && !l.startsWith('@'));
  const sentence = lines.join(' ').split(/\.\s/)[0].replace(/\.$/, '');
  return sentence.length > 110 ? `${sentence.slice(0, 107)}...` : sentence;
}

/** Splits s at the given separator, ignoring separators inside quotes and brackets. */
function splitTopLevel(s, separator) {
  const parts = [];
  let depth = 0;
  let quote = '';
  let current = '';
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    } else if ('([{<'.includes(ch)) {
      depth++;
    } else if (')]}>'.includes(ch)) {
      depth--;
    } else if (ch === separator && depth <= 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** Parameter names of a method signature, without types and defaults. */
function argNames(signature) {
  return splitTopLevel(signature, ',')
    .map((p) =>
      p
        .trim()
        .replace(/^(?:private|public|readonly)\s+/, '')
        .split(/[:=?]/)[0]
        .trim(),
    )
    .filter(Boolean)
    .join(', ');
}

/** Renders a URL expression ('items/' + encodeURIComponent(path) + '/rename') as items/{path}/rename. */
function renderUrl(expression) {
  return splitTopLevel(expression, '+')
    .map((term) => {
      const t = term.trim();
      const literal = t.match(/^(['"`])([\s\S]*)\1$/);
      if (literal) return literal[2].replace(/\$\{([^}]*)\}/g, '{$1}');
      const encoded = t.match(/^encodeURIComponent\(([\s\S]*)\)$/);
      return `{${(encoded ? encoded[1] : t).replace(/\s+/g, ' ')}}`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// 1. Routes
// ---------------------------------------------------------------------------

function routesMap() {
  const rows = [];
  for (const rel of walk(APP, (n) => n.endsWith('.routes.ts'))) {
    const text = read(rel);
    const prefix = rel === 'app.routes.ts' ? '' : path.dirname(rel).split(path.sep)[0];
    // each route object: { path: '...', ... component: X | loadChildren/loadComponent ... }
    for (const m of text.matchAll(/\{\s*path:\s*'([^']*)'([\s\S]*?)\}(?=\s*,?\s*(?:\{|\]))/g)) {
      const body = m[2];
      const computedRedirect = /redirectTo:\s*(?!')/.test(body);
      const target = computedRedirect
        ? 'redirect (computed)'
        : (body.match(/redirectTo:\s*'([^']*)'/) || [])[1]
          ? `redirect to \`${body.match(/redirectTo:\s*'([^']*)'/)[1]}\``
          : (body.match(/component:\s*(\w+)/) || [])[1] ||
            (body.match(/loadChildren:[\s\S]*?import\('([^']+)'\)/) || [])[1] ||
            (body.match(/loadComponent:[\s\S]*?\.then\(\s*\(?\w*\)?\s*=>\s*\w+\.(\w+)/) || [])[1] ||
            '?';
      const guards = (body.match(/canActivate:\s*\[([^\]]*)\]/) || [])[1];
      rows.push([
        `\`/${[prefix, m[1]].filter(Boolean).join('/')}\``,
        `\`${rel}\``,
        target.startsWith('redirect') || target === '?' ? target : `\`${target}\``,
        guards ? guards.trim().replace(/\s+/g, ' ') : '',
      ]);
    }
  }
  return table(['URL', 'Routes file', 'Component / target', 'Guards'], rows);
}

// ---------------------------------------------------------------------------
// 2. Endpoints per API service
// ---------------------------------------------------------------------------

function endpointsMap() {
  const out = [];
  for (const rel of walk(path.join(APP, 'common', 'services'), (n) =>
    n.endsWith('-api.service.ts'),
  )) {
    const text = read(rel);
    const cls = (text.match(/export class (\w+)/) || [])[1];
    const methods = [
      ...text.matchAll(
        /^ {2}(?:(?:private|public|protected) )?(?:async )?(\w+)\(([^)]*(?:\n[^)]*)*?)\)[^{;\n]*\{/gm,
      ),
    ].filter((m) => m[1] !== 'constructor');
    const rows = [];
    methods.forEach((m, i) => {
      const body = text.slice(m.index, i + 1 < methods.length ? methods[i + 1].index : text.length);
      const verb = (body.match(/this\.http\s*\.\s*(get|put|post|patch|delete)/) || [])[1];
      let url = (body.match(/(?:this\.appConfig\.apiUrl|apiUrl)\s*\+\s*([^;]+);/) || [])[1];
      if (!url) {
        const tpl = body.match(/apiUrl\s*\+\s*(`[^`]*`)/);
        url = tpl ? tpl[1] : undefined;
      }
      const wrapped = body.match(/this\.putServerAction\('([^']+)'\)/);
      if (wrapped) {
        rows.push([`\`${m[1]}(${argNames(m[2])})\``, 'PUT', `\`/api/server/${wrapped[1]}/\``]);
        return;
      }
      if (!verb && !url) return;
      const cleaned = url ? renderUrl(url) : '?';
      const args = argNames(m[2]);
      rows.push([`\`${m[1]}(${args})\``, verb ? verb.toUpperCase() : '?', `\`/api/${cleaned}\``]);
    });
    out.push(
      `#### \`${cls}\` (\`${rel}\`)\n\n${rows.length ? table(['Method', 'HTTP', 'URL'], rows) : '_no HTTP calls found_'}`,
    );
  }
  return out.join('\n\n');
}

// ---------------------------------------------------------------------------
// 3. Models
// ---------------------------------------------------------------------------

function modelsMap() {
  const rows = [];
  for (const rel of walk(path.join(APP, 'common', 'models'), isSource)) {
    const text = read(rel);
    for (const m of text.matchAll(/export\s+(interface|type|class|enum)\s+(\w+)[^{=]*([{=])/g)) {
      let detail = '';
      if (m[1] === 'interface' || m[1] === 'class') {
        const start = text.indexOf('{', m.index);
        let depth = 0;
        let end = start;
        for (; end < text.length; end++) {
          if (text[end] === '{') depth++;
          if (text[end] === '}' && --depth === 0) break;
        }
        const body = text.slice(start + 1, end);
        const names = [];
        let level = 0;
        for (const line of body.split('\n')) {
          if (level === 0) {
            const f = line.match(/^\s*(?:readonly\s+)?['"]?([\w-]+)['"]?\??\s*:/);
            if (f) names.push(f[1]);
          }
          level += (line.match(/[{[(]/g) || []).length - (line.match(/[}\])]/g) || []).length;
        }
        detail = names.join(', ');
      }
      rows.push([`\`${m[2]}\``, m[1], `\`${rel}\``, detail]);
    }
  }
  return table(['Name', 'Kind', 'File', 'Fields'], rows);
}

// ---------------------------------------------------------------------------
// 4. File catalogue
// ---------------------------------------------------------------------------

function exportsOf(text) {
  const syms = [];
  for (const m of text.matchAll(
    /^export\s+(?:default\s+)?(?:abstract\s+)?(?:declare\s+)?(class|interface|type|enum|const|function|async function)\s+(\w+)/gm,
  )) {
    syms.push({ kind: m[1], name: m[2], index: m.index });
  }
  return syms;
}

function filesMap() {
  const rows = [];
  for (const rel of walk(APP, isSource)) {
    const text = read(rel);
    const syms = exportsOf(text);
    const first = syms.find((s) => s.kind === 'class') || syms[0];
    const summary = first ? leadingComment(text, first.index) : '';
    rows.push([
      `\`${rel}\``,
      syms.map((s) => `\`${s.name}\``).join(', '),
      summary.replace(/\|/g, '\\|'),
    ]);
  }
  return table(['File', 'Exports', 'Summary (leading comment)'], rows);
}

// ---------------------------------------------------------------------------
// 5. Dependencies (inject() and constructor parameters)
// ---------------------------------------------------------------------------

function dependenciesMap() {
  const rows = [];
  for (const rel of walk(APP, isSource)) {
    const text = read(rel);
    const cls = (text.match(/export class (\w+)/) || [])[1];
    if (!cls) continue;
    const injected = new Set();
    for (const m of text.matchAll(/inject(?:<[^>]*>)?\(\s*(\w+)\s*\)/g)) injected.add(m[1]);
    const ctor = text.match(/constructor\(([^)]*)\)/);
    if (ctor) {
      for (const p of ctor[1].matchAll(/:\s*(\w+)/g)) injected.add(p[1]);
    }
    const providers = (text.match(/providers:\s*\[([^\]]*)\]/) || [])[1];
    const names = [...injected].filter((n) => /^[A-Z]/.test(n)).sort();
    if (!names.length && !providers) continue;
    const own = providers ? [...new Set(providers.match(/\b[A-Z][A-Za-z]+\b/g) || [])] : [];
    rows.push([
      `\`${cls}\``,
      names.map((n) => `\`${n}\``).join(', '),
      own.map((n) => `\`${n}\``).join(', '),
    ]);
  }
  return table(['Class', 'Injects', 'Own providers'], rows);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const header = `# shngAdmin reference maps

> Generated by \`scripts/generate-doc-maps.js\` (\`npm run doc:maps\`) from \`src/app\` at commit
> \`${git('rev-parse --short HEAD')}\` on branch \`${git('rev-parse --abbrev-ref HEAD')}\`. Do not edit by hand; regenerate.
> The source is parsed with regular expressions, so a \`?\` or a missing row marks a construct the
> script does not know. Concepts and rationale are in [architecture.md](architecture.md).
`;

const sections = [
  ['## Routes', routesMap()],
  ['## Backend endpoints per API service', endpointsMap()],
  ['## Models (`src/app/common/models`)', modelsMap()],
  ['## Dependencies (`inject()` and constructor parameters)', dependenciesMap()],
  ['## Source files', filesMap()],
];

fs.writeFileSync(
  OUT,
  `${header}\n${sections.map(([title, body]) => `${title}\n\n${body}\n`).join('\n')}`,
);
console.log(`wrote ${path.relative(ROOT, OUT)}`);
