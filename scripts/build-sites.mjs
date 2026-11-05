import {readFile,writeFile,mkdir,rm,cp,readdir} from 'node:fs/promises';
const assets={};const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',svg:'image/svg+xml'};
for(const name of await readdir('public')){const body=await readFile('public/'+name,'utf8');assets['/'+name]={body,type:types[name.split('.').at(-1)]||'text/plain'};}
assets['/lib/domain.mjs']={body:await readFile('lib/domain.mjs','utf8'),type:'text/javascript; charset=utf-8'};
await writeFile('worker/assets.mjs','export const assets='+JSON.stringify(assets)+';\n');
// Bundle the three source modules without adding a runtime dependency.
const domain=(await readFile('lib/domain.mjs','utf8')).replace(/^export /gm,'');
const rosterImport=(await readFile('lib/roster-import.mjs','utf8')).replace(/^import .*;\n/gm,'').replace('export function prepareRosterImport','function prepareRosterImport');
const api=(await readFile('lib/sites-api.mjs','utf8')).replace(/^import .*domain.mjs.*;\n/m,'').replace(/^import .*roster-import.mjs.*;\n/m,'').replace('export function createHandler','function createHandler');
const worker=(await readFile('worker/index.mjs','utf8')).replace(/^import .*;\n/gm,'');
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',domain+'\n'+rosterImport+'\n'+api+'\nconst assets='+JSON.stringify(assets)+';\n'+worker);
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'wakefield-pool-championship',main:'index.js',compatibility_date:'2026-11-04',compatibility_flags:['nodejs_compat']},null,2));
console.log('Built Sites Worker and embedded frontend assets.');

await cp('drizzle','dist/drizzle',{recursive:true});
