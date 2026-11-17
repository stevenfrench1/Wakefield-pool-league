import {cp,mkdir,rm} from 'node:fs/promises';
await rm('netlify-dist',{recursive:true,force:true});
await mkdir('netlify-dist/lib',{recursive:true});
await cp('public','netlify-dist',{recursive:true});
await cp('lib/domain.mjs','netlify-dist/lib/domain.mjs');
console.log('Built Netlify frontend. Functions and migrations remain outside the public directory.');
