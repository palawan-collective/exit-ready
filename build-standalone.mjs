/* Build one self-contained HTML file: all CSS, all data modules, all pages,
 * with a hash router. No build step, no dependencies, no server needed.
 *
 *   node build-standalone.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, 'site');
const out = join(here, 'exit-ready-standalone.html');

const css = readFileSync(join(site, 'styles.css'), 'utf8');
const roleJs = readFileSync(join(site, 'role.js'), 'utf8');

/* ---------- bundle the data modules onto window.ER ---------- */
const dataFiles = ['config.js', 'format.js', 'listings.js', 'tracker.js',
  'verification.js', 'package.js', 'db.js', 'store.js'];

let bundle = 'window.ER = window.ER || {};\n';
for (const f of dataFiles) {
  const src = readFileSync(join(site, 'data', f), 'utf8');
  const names = [...src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var)\s+(\w+)/gm)]
    .map((m) => m[1]);
  const body = src
    .replace(/^export\s+/gm, '')
    // Sibling modules resolve through the shared ER namespace.
    .replace(/^import\s+\*\s+as\s+(\w+)\s+from\s+'[^']+';?$/gm, 'const $1 = window.ER;')
    .replace(/^import\s+\{([^}]+)\}\s+from\s+'[^']+';?$/gm, (_m, names2) => {
      const cleaned = names2.split(',').map((n) => n.trim()).filter(Boolean).join(', ');
      return `const { ${cleaned} } = window.ER;`;
    })
    .replace(/^import\s+[^;]+;?$/gm, '');
  bundle += `\n/* ---- ${f} ---- */\n(function () {\n${body}\n`;
  for (const n of names) bundle += `  window.ER[${JSON.stringify(n)}] = typeof ${n} !== 'undefined' ? ${n} : undefined;\n`;
  bundle += '})();\n';
}

/* ---------- extract each page ---------- */
const pages = [];
for (const file of readdirSync(site)
  .filter((f) => f.endsWith('.html') && !f.startsWith('exit-ready-standalone'))
  .sort()) {
  const html = readFileSync(join(site, file), 'utf8');

  // The inline module script becomes this page's init function.
  const mod = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)][0];
  let init = '';
  if (mod) {
    init = mod[1]
      .replace(/^import\s+\*\s+as\s+(\w+)\s+from\s+'\.\/data\/\w+\.js';?$/gm, 'const $1 = window.ER;')
      .replace(/^import\s+\{([^}]+)\}\s+from\s+'\.\/data\/\w+\.js';?$/gm, (_m, names) => {
        const cleaned = names.split(',').map((n) => n.trim()).filter(Boolean).join(', ');
        return `const { ${cleaned} } = window.ER;`;
      })
      .replace(/^import\s+[^;]+;?$/gm, '')
      // hash routing carries the query string
      .replace(/location\.search/g, '(location.hash.split("?")[1] || "")')
      .replace(/URLSearchParams\(location\.search\)/g, 'URLSearchParams(location.hash.split("?")[1] || "")');
    init = init.trim();
  }

  // Everything else becomes a <template>.
  let body = html
    .replace(/<link rel="stylesheet" href="styles\.css">/g, '')
    .replace(/<script src="role\.js"><\/script>/g, '')
    .replace(/<script type="module">[\s\S]*?<\/script>/g, '')
    .replace('<div class="role-switch" data-role-switch role="group" aria-label="Viewing as">\n        <span class="role-switch__label">Viewing as</span>\n        <button type="button" data-role="buyer">Buyer</button>\n        <button type="button" data-role="owner">Seller</button>\n      </div>\n      ', '')
    .trim();

  const title = (/<title>([\s\S]*?)<\/title>/.exec(html) || [, file])[1];
  const name = file.replace(/\.html$/, '');
  pages.push({ name, title, body, init });
}

const templates = pages.map((p) => `<template id="t-${p.name}">\n${p.body}\n</template>`).join('\n');
const inits = pages.map((p) => `  ${JSON.stringify(p.name)}: function () {\n${p.init}\n  },`).join('\n');
const titles = pages.map((p) => `  ${JSON.stringify(p.name)}: ${JSON.stringify(p.title)},`).join('\n');

const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Exit-Ready</title>
<style>
${css}
.router { max-width: var(--container); margin: 0 auto; padding: var(--s-5); }
</style>
</head>
<body>
<div id="app"></div>

${templates}

<script>
${bundle}
</script>

<script>
${roleJs.replace(/document\.querySelector\('\[data-role-switch\]'\)/g, "document.querySelector('[data-role-switch]')")}
</script>

<script>
var PAGE_TITLES = {
${titles}
};
var PAGE_INIT = {
${inits}
};

function route() {
  var raw = location.hash.replace(/^#\\/?/, '') || 'index';
  var name = raw.split('?')[0];
  var query = (raw.split('?')[1] || '');
  if (!PAGE_INIT[name]) { name = 'index'; query = ''; }
  location.hash = '#' + name + (query ? '?' + query : '');

  // Put the role switch in every page's masthead.
  var tpl = document.getElementById('t-' + name);
  var node = tpl.content.cloneNode(true);
  var nav = node.querySelector('.masthead__nav');
  if (nav && !nav.querySelector('[data-role-switch]')) {
    var sw = document.createElement('div');
    sw.className = 'role-switch';
    sw.setAttribute('data-role-switch', '');
    sw.setAttribute('role', 'group');
    sw.setAttribute('aria-label', 'Viewing as');
    sw.innerHTML = '<span class="role-switch__label">Viewing as</span>'
      + '<button type="button" data-role="buyer">Buyer</button>'
      + '<button type="button" data-role="owner">Seller</button>';
    nav.appendChild(sw);
  }

  var app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(node);
  document.title = PAGE_TITLES[name] || PAGE_TITLES.index;
  window.scrollTo(0, 0);

  try { PAGE_INIT[name](); } catch (e) {
    var pre = document.createElement('pre');
    pre.style.cssText = 'padding:2rem;font:12px monospace;color:#8C3A2E;white-space:pre-wrap';
    pre.textContent = 'Page "' + name + '" failed: ' + (e && e.stack || e);
    app.appendChild(pre);
    console.error(e);
  }
}

window.addEventListener('hashchange', route);
route();
</script>
</body>
</html>
`;

writeFileSync(out, doc, 'utf8');
const kb = (doc.length / 1024).toFixed(0);
console.log(`wrote ${out} — ${kb} KB, ${pages.length} pages, ${dataFiles.length} data modules`);
console.log('pages: ' + pages.map((p) => p.name).join(', '));