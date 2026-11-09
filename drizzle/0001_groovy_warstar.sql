CREATE TABLE `club_backups` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL,
	`reason` text NOT NULL,
	`data` text NOT NULL
);
