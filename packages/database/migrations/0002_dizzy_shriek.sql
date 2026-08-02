CREATE TABLE IF NOT EXISTS `clipping_favorites` (
	`user_id` text NOT NULL,
	`clipping_id` text NOT NULL,
	`book_id` text NOT NULL,
	`favorited_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `clipping_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
