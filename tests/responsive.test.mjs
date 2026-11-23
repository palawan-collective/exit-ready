/* Static guard: no component may create horizontal scrolling, and every
 * definition table must stack label/value at every device width.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'site', 'styles.css'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
};

const compact = css.replace(/\s+/g, ' ');

ok('page has no horizontal scrolling', /html,\s*body\s*\{\s*overflow-x:\s*clip/.test(css));
ok('no component enables horizontal scrolling', !/overflow-x\s*:\s*(auto|scroll)/.test(css));
ok('markets strip wraps instead of scrolling', /\.hv2-markets \.container\s*\{[^}]*flex-wrap:\s*wrap/.test(compact));
ok('map chips wrap instead of scrolling', /\.map__chips\s*\{[^}]*flex-wrap:\s*wrap/.test(compact));
ok('deftable is a stacked block', /\.deftable\s*,\s*\.deftable tbody,\s*\.deftable tr,\s*\.deftable th,\s*\.deftable td\s*\{\s*display:\s*block/.test(compact));
ok('stacked table cells use full width', /\.deftable th,\s*\.deftable td\s*\{\s*width:\s*100%/.test(compact));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
