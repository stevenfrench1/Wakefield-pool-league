import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const clubState=sqliteTable('club_state',{id:integer('id').primaryKey(),revision:integer('revision').notNull().default(0),data:text('data').notNull()});
export const clubAttempts=sqliteTable('club_attempts',{key:text('key').primaryKey(),started:integer('started').notNull(),attempts:integer('attempts').notNull()});
export const clubAdmin=sqliteTable('club_admin_identity',{id:integer('id').primaryKey(),userId:text('user_id').notNull()});
export const clubBackups=sqliteTable('club_backups',{id:text('id').primaryKey(),revision:integer('revision').notNull(),createdAt:text('created_at').notNull(),reason:text('reason').notNull(),data:text('data').notNull()});
