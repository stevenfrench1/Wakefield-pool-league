import {pgTable,integer,text} from 'drizzle-orm/pg-core';
export const clubState=pgTable('club_state',{id:integer('id').primaryKey(),revision:integer('revision').notNull().default(0),data:text('data').notNull()});
export const clubAttempts=pgTable('club_attempts',{key:text('key').primaryKey(),started:integer('started').notNull(),attempts:integer('attempts').notNull()});
export const clubAdmin=pgTable('club_admin_identity',{id:integer('id').primaryKey(),userId:text('user_id').notNull()});
export const clubBackups=pgTable('club_backups',{id:text('id').primaryKey(),revision:integer('revision').notNull(),createdAt:text('created_at').notNull(),reason:text('reason').notNull(),data:text('data').notNull()});
export const clubPlatform=pgTable('club_platform',{key:text('key').primaryKey(),value:text('value').notNull()});
