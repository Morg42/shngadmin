/**
 * Report-only translation check: never writes to src/.
 *
 * Runs @vendure/ngx-translate-extract into a temporary file and compares the
 * extracted keys with the keys of src/assets/i18n/{en,de,fr}.json.
 *
 *   npm run i18n:check             print the report
 *   npm run i18n:check -- --strict exit with code 1 if a language lacks keys
 *                                  that en.json has, or the source uses keys
 *                                  that en.json lacks
 *   npm run i18n:check -- --verbose list every key instead of the first few
 *
 * The extractor is not used to update the files: it reorders keys, and its
 * --clean option deletes keys that are built at run time
 * (translate.instant('PREFIX.' + name)). It also reports a few string
 * literals that are not keys, so "used in source" can contain noise.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'src', 'assets', 'i18n');
const LANGUAGES = ['en', 'de', 'fr'];
const strict = process.argv.includes('--strict');
const verbose = process.argv.includes('--verbose');
const PREVIEW = 12;

/** Flattens a nested translation object into a set of dotted keys. */
function flatten(obj, prefix = '', keys = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      flatten(value, full, keys);
    } else {
      keys.add(full);
    }
  }
  return keys;
}

function readKeys(file) {
  return flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function extractKeys() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shng-i18n-'));
  const out = path.join(tmp, 'extracted.json');
  try {
    const bin = path.join(ROOT, 'node_modules', '.bin', 'ngx-translate-extract');
    execFileSync(
      bin,
      [
        '--input',
        path.join(ROOT, 'src'),
        '--output',
        out,
        '--format',
        'namespaced-json',
        '--replace',
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
    return readKeys(out);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function difference(a, b) {
  return [...a].filter((key) => !b.has(key)).sort();
}

function show(title, keys) {
  console.log(`${title}: ${keys.length}`);
  const shown = verbose ? keys : keys.slice(0, PREVIEW);
  for (const key of shown) {
    console.log(`    ${key}`);
  }
  if (shown.length < keys.length) {
    console.log(`    ... ${keys.length - shown.length} more (use --verbose)`);
  }
}

const extracted = extractKeys();
const files = Object.fromEntries(
  LANGUAGES.map((lang) => [lang, readKeys(path.join(I18N_DIR, `${lang}.json`))]),
);
let problems = 0;

console.log(`keys found in src/: ${extracted.size}`);
for (const lang of LANGUAGES) {
  console.log(`keys in ${lang}.json: ${files[lang].size}`);
}
console.log();

const missingInEn = difference(extracted, files.en);
show('used in src/ but missing in en.json (may include non-key string literals)', missingInEn);
problems += missingInEn.length;
console.log();

for (const lang of LANGUAGES.filter((l) => l !== 'en')) {
  const missing = difference(files.en, files[lang]);
  const extra = difference(files[lang], files.en);
  show(`in en.json but missing in ${lang}.json`, missing);
  show(`in ${lang}.json but missing in en.json`, extra);
  problems += missing.length + extra.length;
  console.log();
}

const unused = difference(files.en, extracted);
show(
  'in en.json but not found in src/ (unused, or built at run time - do not delete blindly)',
  unused,
);

if (strict && problems > 0) {
  process.exit(1);
}
