import {randomBytes,scryptSync} from 'node:crypto';
const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);
const password=Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/,'');
if(password.length<12||password.length>256)throw Error('Supply a 12–256 character administrator password through stdin.');
const salt=randomBytes(16).toString('hex');
// Output is a private password verifier for Functions configuration, not a
// browser asset. Do not commit it or paste it into a chat.
process.stdout.write(salt+':'+scryptSync(password,salt,32).toString('hex')+'\n');
