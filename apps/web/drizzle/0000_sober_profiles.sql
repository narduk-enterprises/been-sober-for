CREATE TABLE IF NOT EXISTS `sober_profiles` (
  `user_id` text PRIMARY KEY NOT NULL,
  `public_slug` text NOT NULL,
  `display_name` text,
  `avatar_url` text,
  `sobriety_started_at` text,
  `short_message` text,
  `page_visibility` text DEFAULT 'unlisted' NOT NULL,
  `allow_search_indexing` integer DEFAULT false NOT NULL,
  `show_start_date` integer DEFAULT true NOT NULL,
  `show_avatar` integer DEFAULT true NOT NULL,
  `show_qr` integer DEFAULT true NOT NULL,
  `share_layout` text DEFAULT 'standard' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `sober_profiles_public_slug_unique` ON `sober_profiles` (`public_slug`);
