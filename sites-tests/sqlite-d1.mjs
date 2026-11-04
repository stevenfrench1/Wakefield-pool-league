import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
export async function database(){
 const sql=new DatabaseSync(':memory:');
 for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+name,'utf8'));
 return {sql,prepare(query){let values=[];const self={bind(...args){values=args;return self;},async first(){return sql.prepare(query).get(...values)||null;},async run(){return {success:true,meta:sql.prepare(query).run(...values)};},async all(){return {success:true,results:sql.prepare(query).all(...values)};}};return self;},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
}
