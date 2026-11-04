import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const clubState=sqliteTable('club_state',{id:integer('id').primaryKey(),revision:integer('revision').notNull().default(0),data:text('data').notNull()});
export const clubAttempts=sqliteTable('club_attempts',{key:text('key').primaryKey(),started:integer('started').notNull(),attempts:integer('attempts').notNull()});
export const clubAdmin=sqliteTable('club_admin_identity',{id:integer('id').primaryKey(),userId:text('user_id').notNull()});
