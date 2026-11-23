/* Static syntax + import check for every inline module script in site/*.html.
 * Extracts each <script type="module"> block, rewrites relative imports to
 * absolute ones, and asks Node to parse it. */
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..', 'site');
const tmp = mkdtempSync(join(here, '..', 'tmp-check-'));

const files = readdirSync(site).filter((f) => f.endsWith('.html')).sort();
let pass = 0, fail = 0;

try {
  const check = (label, code, base = site) => {
    const rewritten = code
      .replace(/from '\.\//g, `from 'file:///${base.replace(/\\/g, '/')}/`)
      .replace(/await import\('\.\//g, `await import('file:///${base.replace(/\\/g, '/')}/`);
    const out = join(tmp, `${label.replace(/[^a-z0-9]+/gi, '_')}.mjs`);
    writeFileSync(out, rewritten, 'utf8');
    try {
      execFileSync(process.execPath, ['--check', out], { stdio: 'pipe' });
      const imports = [...rewritten.matchAll(/from '([^']+)'/g)]
        .map((m) => m[1])
        .filter((s) => s.startsWith('file:///') || s.startsWith('./'));
      const missing = imports.filter((spec) => {
        const abs = spec.startsWith('file:///')
          ? spec.replace('file:///', '').replace(/\//g, '\\')
          : join(site, spec);
        return !existsSync(abs);
      });
      if (missing.length) throw new Error('unresolved imports: ' + missing.join(', '));
      pass++;
      console.log(`  ok  ${label} (${imports.length} imports)`);
    } catch (e) {
      fail++;
      const msg = String(e.stderr || e.message).split('\n').slice(0, 6).join('\n');
      console.log(`FAIL  ${label}\n      ${msg}`);
    }
  };

  for (const file of files) {
    const html = readFileSync(join(site, file), 'utf8');
    const blocks = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
    if (blocks.length === 0) { console.log(`SKIP  ${file} — no module script`); continue; }
    for (const [i, m] of blocks.entries()) check(`${file} script ${i}`, m[1]);
  }

  /* External scripts added for the world map / admin seam. */
  for (const file of ['data/admin.js', 'data/map.js', 'data/worldmap.js']) {
    const base = file.startsWith('data/') ? join(site, 'data') : site;
    check(file, readFileSync(join(site, file), 'utf8'), base);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${pass} scripts parsed, ${fail} failed`);
process.exit(fail ? 1 : 0);
