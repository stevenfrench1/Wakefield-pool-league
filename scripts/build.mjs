import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/lib', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('lib/domain.mjs', 'dist/lib/domain.mjs');
// A portable, explicitly local demo for file viewers and static-only hosting.
// The production index.html continues to use the server-backed API.
const html = await readFile('public/index.html', 'utf8');
const css = (await readFile('public/style.css', 'utf8')).replace("@import url('/fonts.css');", '');
const domain = (await readFile('lib/domain.mjs', 'utf8')).replace(/^export /gm, '');
const app = (await readFile('public/app.js', 'utf8')).replace(/^import .*;\n/m, '').replace(/boot\(\);\s*$/, `state=stored()||initialState(true);ensureCompetitions(state);persist();route();render();`);
const logo = 'data:image/png;base64,' + (await readFile('public/wakefield-logo.png')).toString('base64');
const portable = html.replace('<link rel="stylesheet" href="/style.css">', `<style>${css}</style>`)
  .replace('href="/wakefield-logo.png"', `href="${logo}"`)
  .replace('<script type="module" src="/app.js"></script>', () => `<script type="module">${domain}\n${app.replaceAll("'/wakefield-logo.png'", JSON.stringify(logo))}</script>`);
await writeFile('dist/demo.html', portable);
const hash = value => createHash('sha256').update(value).digest('base64');
const inlineScript = portable.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const policy = `default-src 'self'; script-src 'self' 'sha256-${hash(inlineScript)}'; style-src 'self' 'sha256-${hash(css)}'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
await writeFile('dist/_headers', `/*\n  Content-Security-Policy: ${policy}\n`);
console.log('Built static app in dist/');
