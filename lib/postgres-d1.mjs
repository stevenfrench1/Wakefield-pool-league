// Keep the existing, tested club API while moving its storage to PostgreSQL.
// Parameters remain separate from SQL. Only application-owned SQL is accepted.
export function postgresSQL(query){
 let n=0;
 let sql=query.replace(/\?/g,()=>`$${++n}`);
 if(/^INSERT OR IGNORE INTO /i.test(sql))sql=sql.replace(/^INSERT OR IGNORE INTO /i,'INSERT INTO ')+' ON CONFLICT DO NOTHING';
 // SQLite permits unqualified columns here; PostgreSQL requires the target
 // alias when excluded has columns with the same names.
 if(sql.startsWith('INSERT INTO club_attempts '))sql=sql.replace('INSERT INTO club_attempts (','INSERT INTO club_attempts AS current_attempt (').replaceAll('WHEN started <=','WHEN current_attempt.started <=').replaceAll('ELSE attempts + 1','ELSE current_attempt.attempts + 1').replaceAll('ELSE started END','ELSE current_attempt.started END');
 return sql;
}
export function postgresD1(pool){
 const statement=(query,values=[])=>({
  query:postgresSQL(query),values,
  bind(...args){return statement(query,args);},
  async first(){const r=await pool.query(this.query,this.values);return r.rows[0]||null;},
  async all(){const r=await pool.query(this.query,this.values);return {results:r.rows};},
  async run(){const r=await pool.query(this.query,this.values);return {success:true,meta:{changes:r.rowCount}};}
 });
 return {prepare:statement,async batch(statements){
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   // Concurrent result saves must see one locked state revision for both the
   // recovery snapshot and the compare-and-swap update.
   await client.query('SELECT id FROM club_state WHERE id = 1 FOR UPDATE');
   const results=[];
   for(const s of statements){const r=await client.query(s.query,s.values);results.push({success:true,meta:{changes:r.rowCount}});}
   await client.query('COMMIT');return results;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }};
}
