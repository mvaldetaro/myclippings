CREATE TABLE `file_index` (
	`user_id` text NOT NULL,
	`book_id` text PRIMARY KEY NOT NULL,
	`relative_path` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`clipping_count` integer DEFAULT 0 NOT NULL,
	`file_hash` text,
	`file_modified_at` text,
	`indexed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `imports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`file_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_records` integer DEFAULT 0 NOT NULL,
	`imported_records` integer DEFAULT 0 NOT NULL,
	`duplicate_records` integer DEFAULT 0 NOT NULL,
	`invalid_records` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`error_message` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`interface_preferences` text NOT NULL,
	`quote_preferences` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);