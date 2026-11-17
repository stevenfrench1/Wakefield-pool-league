// The operator supplies the transfer token through stdin, never a command-line
// argument or tracked file. No pupil data or token is printed by this script.
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);
const token=Buffer.concat(chunks).toString('utf8').trim();
const target=new URL(process.argv[2]||'https://wakefield-pool-championship.netlify.app');
if(token.length<32||target.origin!=='https://wakefield-pool-championship.netlify.app')throw Error('Supply the configured transfer token through stdin and use the expected Netlify site.');
const response=await fetch(new URL('/api/migration-import',target),{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:'{}',redirect:'error',signal:AbortSignal.timeout(60000)});
const result=await response.json();
if(!response.ok)throw Error(result.error||'The transfer failed. The source must remain available.');
console.log(JSON.stringify(result,null,2));
