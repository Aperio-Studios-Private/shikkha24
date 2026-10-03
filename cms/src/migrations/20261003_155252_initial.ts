import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`articles_photo_story\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`caption\` text,
  	\`credit\` text,
  	\`full_bleed\` integer DEFAULT false,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`articles_photo_story_order_idx\` ON \`articles_photo_story\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`articles_photo_story_parent_id_idx\` ON \`articles_photo_story\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_photo_story_image_idx\` ON \`articles_photo_story\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`articles_key_takeaways\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`point\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`articles_key_takeaways_order_idx\` ON \`articles_key_takeaways\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`articles_key_takeaways_parent_id_idx\` ON \`articles_key_takeaways\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`articles_timeline_milestones\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`date\` text,
  	\`title\` text,
  	\`detail\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`articles_timeline_milestones_order_idx\` ON \`articles_timeline_milestones\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`articles_timeline_milestones_parent_id_idx\` ON \`articles_timeline_milestones\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`articles\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`title_en\` text,
  	\`slug\` text,
  	\`excerpt\` text,
  	\`featured_image_id\` integer,
  	\`layout\` text DEFAULT 'standard',
  	\`video_provider\` text DEFAULT 'youtube',
  	\`video_url\` text,
  	\`body\` text,
  	\`category_id\` integer,
  	\`subcategory_id\` integer,
  	\`university_id\` integer,
  	\`author_id\` integer,
  	\`review_status\` text DEFAULT 'draft',
  	\`review_note\` text,
  	\`is_breaking\` integer DEFAULT false,
  	\`is_lead\` integer DEFAULT false,
  	\`is_sponsored\` integer DEFAULT false,
  	\`sponsor_name\` text,
  	\`published_at\` text,
  	\`reading_time_minutes\` numeric,
  	\`correction_notice_has_correction\` integer DEFAULT false,
  	\`correction_notice_note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`featured_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`subcategory_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`university_id\`) REFERENCES \`institutions\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`articles_title_idx\` ON \`articles\` (\`title\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`articles_slug_idx\` ON \`articles\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`articles_featured_image_idx\` ON \`articles\` (\`featured_image_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_layout_idx\` ON \`articles\` (\`layout\`);`)
  await db.run(sql`CREATE INDEX \`articles_category_idx\` ON \`articles\` (\`category_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_subcategory_idx\` ON \`articles\` (\`subcategory_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_university_idx\` ON \`articles\` (\`university_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_author_idx\` ON \`articles\` (\`author_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_review_status_idx\` ON \`articles\` (\`review_status\`);`)
  await db.run(sql`CREATE INDEX \`articles_is_breaking_idx\` ON \`articles\` (\`is_breaking\`);`)
  await db.run(sql`CREATE INDEX \`articles_is_lead_idx\` ON \`articles\` (\`is_lead\`);`)
  await db.run(sql`CREATE INDEX \`articles_is_sponsored_idx\` ON \`articles\` (\`is_sponsored\`);`)
  await db.run(sql`CREATE INDEX \`articles_published_at_idx\` ON \`articles\` (\`published_at\`);`)
  await db.run(sql`CREATE INDEX \`articles_updated_at_idx\` ON \`articles\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`articles_created_at_idx\` ON \`articles\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`articles__status_idx\` ON \`articles\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`articles_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`levels_id\` integer,
  	\`districts_id\` integer,
  	\`tags_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`levels_id\`) REFERENCES \`levels\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`districts_id\`) REFERENCES \`districts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`articles_rels_order_idx\` ON \`articles_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`articles_rels_parent_idx\` ON \`articles_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_rels_path_idx\` ON \`articles_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`articles_rels_levels_id_idx\` ON \`articles_rels\` (\`levels_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_rels_districts_id_idx\` ON \`articles_rels\` (\`districts_id\`);`)
  await db.run(sql`CREATE INDEX \`articles_rels_tags_id_idx\` ON \`articles_rels\` (\`tags_id\`);`)
  await db.run(sql`CREATE TABLE \`_articles_v_version_photo_story\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`caption\` text,
  	\`credit\` text,
  	\`full_bleed\` integer DEFAULT false,
  	\`_uuid\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_articles_v_version_photo_story_order_idx\` ON \`_articles_v_version_photo_story\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_photo_story_parent_id_idx\` ON \`_articles_v_version_photo_story\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_photo_story_image_idx\` ON \`_articles_v_version_photo_story\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_articles_v_version_key_takeaways\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`point\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_articles_v_version_key_takeaways_order_idx\` ON \`_articles_v_version_key_takeaways\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_key_takeaways_parent_id_idx\` ON \`_articles_v_version_key_takeaways\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_articles_v_version_timeline_milestones\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`date\` text,
  	\`title\` text,
  	\`detail\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_articles_v_version_timeline_milestones_order_idx\` ON \`_articles_v_version_timeline_milestones\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_timeline_milestones_parent_id_idx\` ON \`_articles_v_version_timeline_milestones\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_articles_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_title_en\` text,
  	\`version_slug\` text,
  	\`version_excerpt\` text,
  	\`version_featured_image_id\` integer,
  	\`version_layout\` text DEFAULT 'standard',
  	\`version_video_provider\` text DEFAULT 'youtube',
  	\`version_video_url\` text,
  	\`version_body\` text,
  	\`version_category_id\` integer,
  	\`version_subcategory_id\` integer,
  	\`version_university_id\` integer,
  	\`version_author_id\` integer,
  	\`version_review_status\` text DEFAULT 'draft',
  	\`version_review_note\` text,
  	\`version_is_breaking\` integer DEFAULT false,
  	\`version_is_lead\` integer DEFAULT false,
  	\`version_is_sponsored\` integer DEFAULT false,
  	\`version_sponsor_name\` text,
  	\`version_published_at\` text,
  	\`version_reading_time_minutes\` numeric,
  	\`version_correction_notice_has_correction\` integer DEFAULT false,
  	\`version_correction_notice_note\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_featured_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_subcategory_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_university_id\`) REFERENCES \`institutions\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_author_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_articles_v_parent_idx\` ON \`_articles_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_title_idx\` ON \`_articles_v\` (\`version_title\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_slug_idx\` ON \`_articles_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_featured_image_idx\` ON \`_articles_v\` (\`version_featured_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_layout_idx\` ON \`_articles_v\` (\`version_layout\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_category_idx\` ON \`_articles_v\` (\`version_category_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_subcategory_idx\` ON \`_articles_v\` (\`version_subcategory_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_university_idx\` ON \`_articles_v\` (\`version_university_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_author_idx\` ON \`_articles_v\` (\`version_author_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_review_status_idx\` ON \`_articles_v\` (\`version_review_status\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_is_breaking_idx\` ON \`_articles_v\` (\`version_is_breaking\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_is_lead_idx\` ON \`_articles_v\` (\`version_is_lead\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_is_sponsored_idx\` ON \`_articles_v\` (\`version_is_sponsored\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_published_at_idx\` ON \`_articles_v\` (\`version_published_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_updated_at_idx\` ON \`_articles_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_created_at_idx\` ON \`_articles_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version__status_idx\` ON \`_articles_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_created_at_idx\` ON \`_articles_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_updated_at_idx\` ON \`_articles_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_latest_idx\` ON \`_articles_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_autosave_idx\` ON \`_articles_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_articles_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`levels_id\` integer,
  	\`districts_id\` integer,
  	\`tags_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`levels_id\`) REFERENCES \`levels\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`districts_id\`) REFERENCES \`districts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_articles_v_rels_order_idx\` ON \`_articles_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_rels_parent_idx\` ON \`_articles_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_rels_path_idx\` ON \`_articles_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_rels_levels_id_idx\` ON \`_articles_v_rels\` (\`levels_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_rels_districts_id_idx\` ON \`_articles_v_rels\` (\`districts_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_rels_tags_id_idx\` ON \`_articles_v_rels\` (\`tags_id\`);`)
  await db.run(sql`CREATE TABLE \`categories\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name_bn\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`parent_id\` integer,
  	\`description\` text,
  	\`icon\` text,
  	\`color_accent\` text,
  	\`sort_order\` numeric DEFAULT 0 NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`categories_name_bn_idx\` ON \`categories\` (\`name_bn\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`categories_slug_idx\` ON \`categories\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`categories_parent_idx\` ON \`categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`categories_sort_order_idx\` ON \`categories\` (\`sort_order\`);`)
  await db.run(sql`CREATE INDEX \`categories_is_active_idx\` ON \`categories\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`categories_updated_at_idx\` ON \`categories\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`categories_created_at_idx\` ON \`categories\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`levels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name_bn\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`sort_order\` numeric DEFAULT 0 NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`levels_slug_idx\` ON \`levels\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`levels_updated_at_idx\` ON \`levels\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`levels_created_at_idx\` ON \`levels\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`districts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name_bn\` text NOT NULL,
  	\`name_en\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`division_bn\` text NOT NULL,
  	\`division_en\` text NOT NULL,
  	\`sort_order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`districts_slug_idx\` ON \`districts\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`districts_division_bn_idx\` ON \`districts\` (\`division_bn\`);`)
  await db.run(sql`CREATE INDEX \`districts_updated_at_idx\` ON \`districts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`districts_created_at_idx\` ON \`districts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`tags\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name_bn\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`tags_name_bn_idx\` ON \`tags\` (\`name_bn\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`tags_slug_idx\` ON \`tags\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`tags_updated_at_idx\` ON \`tags\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tags_created_at_idx\` ON \`tags\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`authors_beat\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`authors_beat_order_idx\` ON \`authors_beat\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`authors_beat_parent_idx\` ON \`authors_beat\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`authors\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name_bn\` text NOT NULL,
  	\`name_en\` text,
  	\`slug\` text NOT NULL,
  	\`designation\` text,
  	\`bio\` text,
  	\`photo_id\` integer,
  	\`email\` text,
  	\`press_card_no\` text,
  	\`blood_group\` text,
  	\`reporter_id\` text,
  	\`verification_status\` text DEFAULT 'unverified' NOT NULL,
  	\`verified_at\` text,
  	\`verified_by_id\` integer,
  	\`valid_until\` text,
  	\`verification_note\` text,
  	\`joining_date\` text,
  	\`district_id\` integer,
  	\`social_facebook\` text,
  	\`social_twitter\` text,
  	\`social_linkedin\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`photo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`verified_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`district_id\`) REFERENCES \`districts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`authors_name_bn_idx\` ON \`authors\` (\`name_bn\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`authors_slug_idx\` ON \`authors\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`authors_photo_idx\` ON \`authors\` (\`photo_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`authors_reporter_id_idx\` ON \`authors\` (\`reporter_id\`);`)
  await db.run(sql`CREATE INDEX \`authors_verification_status_idx\` ON \`authors\` (\`verification_status\`);`)
  await db.run(sql`CREATE INDEX \`authors_verified_by_idx\` ON \`authors\` (\`verified_by_id\`);`)
  await db.run(sql`CREATE INDEX \`authors_district_idx\` ON \`authors\` (\`district_id\`);`)
  await db.run(sql`CREATE INDEX \`authors_updated_at_idx\` ON \`authors\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`authors_created_at_idx\` ON \`authors\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`assignments\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`brief\` text,
  	\`assigned_to_id\` integer NOT NULL,
  	\`assigned_by_id\` integer,
  	\`due_at\` text,
  	\`priority\` text DEFAULT 'normal' NOT NULL,
  	\`status\` text DEFAULT 'assigned' NOT NULL,
  	\`filed_article_id\` integer,
  	\`district_id\` integer,
  	\`editor_note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`assigned_to_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`assigned_by_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`filed_article_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`district_id\`) REFERENCES \`districts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`assignments_assigned_to_idx\` ON \`assignments\` (\`assigned_to_id\`);`)
  await db.run(sql`CREATE INDEX \`assignments_assigned_by_idx\` ON \`assignments\` (\`assigned_by_id\`);`)
  await db.run(sql`CREATE INDEX \`assignments_due_at_idx\` ON \`assignments\` (\`due_at\`);`)
  await db.run(sql`CREATE INDEX \`assignments_status_idx\` ON \`assignments\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`assignments_filed_article_idx\` ON \`assignments\` (\`filed_article_id\`);`)
  await db.run(sql`CREATE INDEX \`assignments_district_idx\` ON \`assignments\` (\`district_id\`);`)
  await db.run(sql`CREATE INDEX \`assignments_updated_at_idx\` ON \`assignments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`assignments_created_at_idx\` ON \`assignments\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`body\` text,
  	\`show_in_footer\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft'
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_show_in_footer_idx\` ON \`pages\` (\`show_in_footer\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_body\` text,
  	\`version_show_in_footer\` integer DEFAULT false,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_show_in_footer_idx\` ON \`_pages_v\` (\`version_show_in_footer\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`fact_checks_source_urls\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	\`label\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fact_checks\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fact_checks_source_urls_order_idx\` ON \`fact_checks_source_urls\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fact_checks_source_urls_parent_id_idx\` ON \`fact_checks_source_urls\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`fact_checks_comparison_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`caption\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`fact_checks\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`fact_checks_comparison_images_order_idx\` ON \`fact_checks_comparison_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`fact_checks_comparison_images_parent_id_idx\` ON \`fact_checks_comparison_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`fact_checks_comparison_images_image_idx\` ON \`fact_checks_comparison_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`fact_checks\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`claim\` text NOT NULL,
  	\`verdict\` text NOT NULL,
  	\`evidence\` text,
  	\`related_article_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`related_article_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`fact_checks_verdict_idx\` ON \`fact_checks\` (\`verdict\`);`)
  await db.run(sql`CREATE INDEX \`fact_checks_related_article_idx\` ON \`fact_checks\` (\`related_article_id\`);`)
  await db.run(sql`CREATE INDEX \`fact_checks_updated_at_idx\` ON \`fact_checks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`fact_checks_created_at_idx\` ON \`fact_checks\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`scholarships\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`provider\` text NOT NULL,
  	\`country\` text,
  	\`funding_type\` text DEFAULT 'partial' NOT NULL,
  	\`amount\` text,
  	\`deadline\` text NOT NULL,
  	\`eligibility\` text,
  	\`apply_url\` text,
  	\`description\` text,
  	\`is_international\` integer DEFAULT false,
  	\`is_active\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`scholarships_title_idx\` ON \`scholarships\` (\`title\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_country_idx\` ON \`scholarships\` (\`country\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_funding_type_idx\` ON \`scholarships\` (\`funding_type\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_deadline_idx\` ON \`scholarships\` (\`deadline\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_is_international_idx\` ON \`scholarships\` (\`is_international\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_is_active_idx\` ON \`scholarships\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_updated_at_idx\` ON \`scholarships\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_created_at_idx\` ON \`scholarships\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`scholarships_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`levels_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`scholarships\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`levels_id\`) REFERENCES \`levels\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`scholarships_rels_order_idx\` ON \`scholarships_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_rels_parent_idx\` ON \`scholarships_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_rels_path_idx\` ON \`scholarships_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`scholarships_rels_levels_id_idx\` ON \`scholarships_rels\` (\`levels_id\`);`)
  await db.run(sql`CREATE TABLE \`deadlines\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`type\` text NOT NULL,
  	\`date_start\` text NOT NULL,
  	\`date_end\` text,
  	\`description\` text,
  	\`related_article_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`related_article_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`deadlines_title_idx\` ON \`deadlines\` (\`title\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_type_idx\` ON \`deadlines\` (\`type\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_date_start_idx\` ON \`deadlines\` (\`date_start\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_related_article_idx\` ON \`deadlines\` (\`related_article_id\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_updated_at_idx\` ON \`deadlines\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_created_at_idx\` ON \`deadlines\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`deadlines_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`levels_id\` integer,
  	\`districts_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`deadlines\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`levels_id\`) REFERENCES \`levels\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`districts_id\`) REFERENCES \`districts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`deadlines_rels_order_idx\` ON \`deadlines_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_rels_parent_idx\` ON \`deadlines_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_rels_path_idx\` ON \`deadlines_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_rels_levels_id_idx\` ON \`deadlines_rels\` (\`levels_id\`);`)
  await db.run(sql`CREATE INDEX \`deadlines_rels_districts_id_idx\` ON \`deadlines_rels\` (\`districts_id\`);`)
  await db.run(sql`CREATE TABLE \`institutions_faculties_departments\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`institutions_faculties\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`institutions_faculties_departments_order_idx\` ON \`institutions_faculties_departments\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`institutions_faculties_departments_parent_id_idx\` ON \`institutions_faculties_departments\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`institutions_faculties\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`institutions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`institutions_faculties_order_idx\` ON \`institutions_faculties\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`institutions_faculties_parent_id_idx\` ON \`institutions_faculties\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`institutions_admission_info\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`value\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`institutions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`institutions_admission_info_order_idx\` ON \`institutions_admission_info\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`institutions_admission_info_parent_id_idx\` ON \`institutions_admission_info\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`institutions_tuition_fees\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`programme\` text NOT NULL,
  	\`amount\` text NOT NULL,
  	\`period\` text NOT NULL,
  	\`academic_year\` text NOT NULL,
  	\`note\` text,
  	\`source_url\` text,
  	\`verified_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`institutions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`institutions_tuition_fees_order_idx\` ON \`institutions_tuition_fees\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`institutions_tuition_fees_parent_id_idx\` ON \`institutions_tuition_fees\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`institutions_important_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`institutions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`institutions_important_links_order_idx\` ON \`institutions_important_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`institutions_important_links_parent_id_idx\` ON \`institutions_important_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`institutions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name_bn\` text NOT NULL,
  	\`name_en\` text,
  	\`acronym\` text,
  	\`slug\` text NOT NULL,
  	\`type\` text NOT NULL,
  	\`discipline\` text,
  	\`district_id\` integer,
  	\`established\` numeric,
  	\`website\` text,
  	\`logo_id\` integer,
  	\`description\` text,
  	\`contact_address\` text,
  	\`contact_phone\` text,
  	\`contact_email\` text,
  	\`contact_map_url\` text,
  	\`admission_url\` text,
  	\`is_verified\` integer DEFAULT false,
  	\`last_verified_at\` text,
  	\`data_source\` text,
  	\`wikidata_id\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`district_id\`) REFERENCES \`districts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`institutions_name_bn_idx\` ON \`institutions\` (\`name_bn\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`institutions_slug_idx\` ON \`institutions\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`institutions_type_idx\` ON \`institutions\` (\`type\`);`)
  await db.run(sql`CREATE INDEX \`institutions_discipline_idx\` ON \`institutions\` (\`discipline\`);`)
  await db.run(sql`CREATE INDEX \`institutions_district_idx\` ON \`institutions\` (\`district_id\`);`)
  await db.run(sql`CREATE INDEX \`institutions_logo_idx\` ON \`institutions\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`institutions_is_verified_idx\` ON \`institutions\` (\`is_verified\`);`)
  await db.run(sql`CREATE INDEX \`institutions_wikidata_id_idx\` ON \`institutions\` (\`wikidata_id\`);`)
  await db.run(sql`CREATE INDEX \`institutions_updated_at_idx\` ON \`institutions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`institutions_created_at_idx\` ON \`institutions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`institutions_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`levels_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`institutions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`levels_id\`) REFERENCES \`levels\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`institutions_rels_order_idx\` ON \`institutions_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`institutions_rels_parent_idx\` ON \`institutions_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`institutions_rels_path_idx\` ON \`institutions_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`institutions_rels_levels_id_idx\` ON \`institutions_rels\` (\`levels_id\`);`)
  await db.run(sql`CREATE TABLE \`circulars\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`organisation\` text NOT NULL,
  	\`type\` text NOT NULL,
  	\`published_date\` text,
  	\`deadline\` text,
  	\`vacancy_count\` numeric,
  	\`circular_image_id\` integer,
  	\`apply_url\` text,
  	\`description\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`circular_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`circulars_title_idx\` ON \`circulars\` (\`title\`);`)
  await db.run(sql`CREATE INDEX \`circulars_organisation_idx\` ON \`circulars\` (\`organisation\`);`)
  await db.run(sql`CREATE INDEX \`circulars_type_idx\` ON \`circulars\` (\`type\`);`)
  await db.run(sql`CREATE INDEX \`circulars_deadline_idx\` ON \`circulars\` (\`deadline\`);`)
  await db.run(sql`CREATE INDEX \`circulars_circular_image_idx\` ON \`circulars\` (\`circular_image_id\`);`)
  await db.run(sql`CREATE INDEX \`circulars_updated_at_idx\` ON \`circulars\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`circulars_created_at_idx\` ON \`circulars\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`circulars_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`levels_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`circulars\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`levels_id\`) REFERENCES \`levels\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`circulars_rels_order_idx\` ON \`circulars_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`circulars_rels_parent_idx\` ON \`circulars_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`circulars_rels_path_idx\` ON \`circulars_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`circulars_rels_levels_id_idx\` ON \`circulars_rels\` (\`levels_id\`);`)
  await db.run(sql`CREATE TABLE \`result_links\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`exam_name\` text NOT NULL,
  	\`board_or_institution\` text,
  	\`level_id\` integer,
  	\`publication_date\` text,
  	\`official_url\` text NOT NULL,
  	\`how_to_steps\` text,
  	\`merit_list_url\` text,
  	\`is_published\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`level_id\`) REFERENCES \`levels\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`result_links_title_idx\` ON \`result_links\` (\`title\`);`)
  await db.run(sql`CREATE INDEX \`result_links_exam_name_idx\` ON \`result_links\` (\`exam_name\`);`)
  await db.run(sql`CREATE INDEX \`result_links_level_idx\` ON \`result_links\` (\`level_id\`);`)
  await db.run(sql`CREATE INDEX \`result_links_publication_date_idx\` ON \`result_links\` (\`publication_date\`);`)
  await db.run(sql`CREATE INDEX \`result_links_is_published_idx\` ON \`result_links\` (\`is_published\`);`)
  await db.run(sql`CREATE INDEX \`result_links_updated_at_idx\` ON \`result_links\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`result_links_created_at_idx\` ON \`result_links\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`study_abroad_guides\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`country\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`visa_requirements\` text,
  	\`tuition_range\` text,
  	\`living_cost_range\` text,
  	\`intakes\` text,
  	\`application_steps\` text,
  	\`scholarship_notes\` text,
  	\`is_featured\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`study_abroad_guides_country_idx\` ON \`study_abroad_guides\` (\`country\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`study_abroad_guides_slug_idx\` ON \`study_abroad_guides\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`study_abroad_guides_is_featured_idx\` ON \`study_abroad_guides\` (\`is_featured\`);`)
  await db.run(sql`CREATE INDEX \`study_abroad_guides_updated_at_idx\` ON \`study_abroad_guides\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`study_abroad_guides_created_at_idx\` ON \`study_abroad_guides\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`live_blogs_entries\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`timestamp\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`is_key_event\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`live_blogs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`live_blogs_entries_order_idx\` ON \`live_blogs_entries\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`live_blogs_entries_parent_id_idx\` ON \`live_blogs_entries\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`live_blogs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`live_blogs_title_idx\` ON \`live_blogs\` (\`title\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`live_blogs_slug_idx\` ON \`live_blogs\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`live_blogs_is_active_idx\` ON \`live_blogs\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`live_blogs_updated_at_idx\` ON \`live_blogs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`live_blogs_created_at_idx\` ON \`live_blogs\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`polls_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`vote_count\` numeric DEFAULT 0,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`polls\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`polls_options_order_idx\` ON \`polls_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`polls_options_parent_id_idx\` ON \`polls_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`polls\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`question_bn\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`expires_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`polls_is_active_idx\` ON \`polls\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`polls_updated_at_idx\` ON \`polls\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`polls_created_at_idx\` ON \`polls\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`quizzes_questions_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`quizzes_questions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`quizzes_questions_options_order_idx\` ON \`quizzes_questions_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`quizzes_questions_options_parent_id_idx\` ON \`quizzes_questions_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`quizzes_questions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`correct_answer\` text NOT NULL,
  	\`explanation\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`quizzes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`quizzes_questions_order_idx\` ON \`quizzes_questions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`quizzes_questions_parent_id_idx\` ON \`quizzes_questions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`quizzes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`date\` text NOT NULL,
  	\`is_active\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`quizzes_date_idx\` ON \`quizzes\` (\`date\`);`)
  await db.run(sql`CREATE INDEX \`quizzes_is_active_idx\` ON \`quizzes\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`quizzes_updated_at_idx\` ON \`quizzes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`quizzes_created_at_idx\` ON \`quizzes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text NOT NULL,
  	\`caption\` text,
  	\`credit\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_thumbnail_url\` text,
  	\`sizes_thumbnail_width\` numeric,
  	\`sizes_thumbnail_height\` numeric,
  	\`sizes_thumbnail_mime_type\` text,
  	\`sizes_thumbnail_filesize\` numeric,
  	\`sizes_thumbnail_filename\` text,
  	\`sizes_card_url\` text,
  	\`sizes_card_width\` numeric,
  	\`sizes_card_height\` numeric,
  	\`sizes_card_mime_type\` text,
  	\`sizes_card_filesize\` numeric,
  	\`sizes_card_filename\` text,
  	\`sizes_hero_url\` text,
  	\`sizes_hero_width\` numeric,
  	\`sizes_hero_height\` numeric,
  	\`sizes_hero_mime_type\` text,
  	\`sizes_hero_filesize\` numeric,
  	\`sizes_hero_filename\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_thumbnail_sizes_thumbnail_filename_idx\` ON \`media\` (\`sizes_thumbnail_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_hero_sizes_hero_filename_idx\` ON \`media\` (\`sizes_hero_filename\`);`)
  await db.run(sql`CREATE TABLE \`photo_galleries_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`caption\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`photo_galleries\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`photo_galleries_images_order_idx\` ON \`photo_galleries_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`photo_galleries_images_parent_id_idx\` ON \`photo_galleries_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`photo_galleries_images_image_idx\` ON \`photo_galleries_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`photo_galleries\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`description\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`photo_galleries_title_idx\` ON \`photo_galleries\` (\`title\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`photo_galleries_slug_idx\` ON \`photo_galleries\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`photo_galleries_updated_at_idx\` ON \`photo_galleries\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`photo_galleries_created_at_idx\` ON \`photo_galleries\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`live_streams\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`provider\` text DEFAULT 'youtube' NOT NULL,
  	\`video_id\` text,
  	\`page_url\` text,
  	\`is_live\` integer DEFAULT false,
  	\`scheduled_start\` text,
  	\`scheduled_end\` text,
  	\`description\` text,
  	\`poster_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`poster_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`live_streams_title_idx\` ON \`live_streams\` (\`title\`);`)
  await db.run(sql`CREATE INDEX \`live_streams_provider_idx\` ON \`live_streams\` (\`provider\`);`)
  await db.run(sql`CREATE INDEX \`live_streams_is_live_idx\` ON \`live_streams\` (\`is_live\`);`)
  await db.run(sql`CREATE INDEX \`live_streams_poster_idx\` ON \`live_streams\` (\`poster_id\`);`)
  await db.run(sql`CREATE INDEX \`live_streams_updated_at_idx\` ON \`live_streams\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`live_streams_created_at_idx\` ON \`live_streams\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`ad_units\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`position\` text NOT NULL,
  	\`ad_type\` text DEFAULT 'adsense' NOT NULL,
  	\`adsense_slot_id\` text,
  	\`image_id\` integer,
  	\`target_url\` text,
  	\`sponsor_name\` text,
  	\`campaign_start\` text,
  	\`campaign_end\` text,
  	\`is_active\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`ad_units_position_idx\` ON \`ad_units\` (\`position\`);`)
  await db.run(sql`CREATE INDEX \`ad_units_image_idx\` ON \`ad_units\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`ad_units_campaign_end_idx\` ON \`ad_units\` (\`campaign_end\`);`)
  await db.run(sql`CREATE INDEX \`ad_units_is_active_idx\` ON \`ad_units\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`ad_units_updated_at_idx\` ON \`ad_units\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`ad_units_created_at_idx\` ON \`ad_units\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`comments\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`article_id\` integer NOT NULL,
  	\`reader_id\` integer,
  	\`user_name\` text NOT NULL,
  	\`user_email\` text,
  	\`user_avatar\` text,
  	\`body\` text NOT NULL,
  	\`is_approved\` integer DEFAULT false,
  	\`social_provider\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`article_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reader_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`comments_article_idx\` ON \`comments\` (\`article_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_reader_idx\` ON \`comments\` (\`reader_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_is_approved_idx\` ON \`comments\` (\`is_approved\`);`)
  await db.run(sql`CREATE INDEX \`comments_updated_at_idx\` ON \`comments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`comments_created_at_idx\` ON \`comments\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`newsletter_subscribers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`email\` text NOT NULL,
  	\`is_active\` integer DEFAULT false,
  	\`subscribed_at\` text,
  	\`confirmed_at\` text,
  	\`unsubscribed_at\` text,
  	\`confirmation_token\` text,
  	\`confirmation_expires_at\` text,
  	\`unsubscribe_token\` text,
  	\`consent_source\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`newsletter_subscribers_email_idx\` ON \`newsletter_subscribers\` (\`email\`);`)
  await db.run(sql`CREATE INDEX \`newsletter_subscribers_is_active_idx\` ON \`newsletter_subscribers\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`newsletter_subscribers_confirmation_token_idx\` ON \`newsletter_subscribers\` (\`confirmation_token\`);`)
  await db.run(sql`CREATE INDEX \`newsletter_subscribers_unsubscribe_token_idx\` ON \`newsletter_subscribers\` (\`unsubscribe_token\`);`)
  await db.run(sql`CREATE INDEX \`newsletter_subscribers_updated_at_idx\` ON \`newsletter_subscribers\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`newsletter_subscribers_created_at_idx\` ON \`newsletter_subscribers\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`newsletter_campaigns\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`subject\` text NOT NULL,
  	\`preheader\` text,
  	\`body\` text NOT NULL,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`sent_at\` text,
  	\`recipient_count\` numeric DEFAULT 0,
  	\`sent_count\` numeric DEFAULT 0,
  	\`deferred_count\` numeric DEFAULT 0,
  	\`sent_through_id\` numeric DEFAULT 0,
  	\`last_error\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`newsletter_campaigns_status_idx\` ON \`newsletter_campaigns\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`newsletter_campaigns_updated_at_idx\` ON \`newsletter_campaigns\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`newsletter_campaigns_created_at_idx\` ON \`newsletter_campaigns\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`saved_deadlines\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`reader_id\` integer NOT NULL,
  	\`deadline_id\` integer NOT NULL,
  	\`remind_at\` text,
  	\`notified\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`reader_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`deadline_id\`) REFERENCES \`deadlines\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`saved_deadlines_reader_idx\` ON \`saved_deadlines\` (\`reader_id\`);`)
  await db.run(sql`CREATE INDEX \`saved_deadlines_deadline_idx\` ON \`saved_deadlines\` (\`deadline_id\`);`)
  await db.run(sql`CREATE INDEX \`saved_deadlines_notified_idx\` ON \`saved_deadlines\` (\`notified\`);`)
  await db.run(sql`CREATE INDEX \`saved_deadlines_updated_at_idx\` ON \`saved_deadlines\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`saved_deadlines_created_at_idx\` ON \`saved_deadlines\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`bookmarks\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`reader_id\` integer NOT NULL,
  	\`kind\` text NOT NULL,
  	\`article_id\` integer,
  	\`deadline_id\` integer,
  	\`title\` text,
  	\`slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`reader_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`article_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`deadline_id\`) REFERENCES \`deadlines\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`bookmarks_reader_idx\` ON \`bookmarks\` (\`reader_id\`);`)
  await db.run(sql`CREATE INDEX \`bookmarks_kind_idx\` ON \`bookmarks\` (\`kind\`);`)
  await db.run(sql`CREATE INDEX \`bookmarks_article_idx\` ON \`bookmarks\` (\`article_id\`);`)
  await db.run(sql`CREATE INDEX \`bookmarks_deadline_idx\` ON \`bookmarks\` (\`deadline_id\`);`)
  await db.run(sql`CREATE INDEX \`bookmarks_updated_at_idx\` ON \`bookmarks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`bookmarks_created_at_idx\` ON \`bookmarks\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`citizen_submissions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`body\` text NOT NULL,
  	\`district_id\` integer,
  	\`media_id\` integer,
  	\`reporter_name\` text NOT NULL,
  	\`reporter_email\` text NOT NULL,
  	\`reporter_phone\` text,
  	\`status\` text DEFAULT 'new' NOT NULL,
  	\`editor_note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`district_id\`) REFERENCES \`districts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`citizen_submissions_district_idx\` ON \`citizen_submissions\` (\`district_id\`);`)
  await db.run(sql`CREATE INDEX \`citizen_submissions_media_idx\` ON \`citizen_submissions\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`citizen_submissions_status_idx\` ON \`citizen_submissions\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`citizen_submissions_updated_at_idx\` ON \`citizen_submissions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`citizen_submissions_created_at_idx\` ON \`citizen_submissions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`push_subscriptions_reminders\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`deadline_id\` integer NOT NULL,
  	\`remind_at\` text NOT NULL,
  	\`notified\` integer DEFAULT false,
  	FOREIGN KEY (\`deadline_id\`) REFERENCES \`deadlines\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`push_subscriptions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`push_subscriptions_reminders_order_idx\` ON \`push_subscriptions_reminders\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`push_subscriptions_reminders_parent_id_idx\` ON \`push_subscriptions_reminders\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`push_subscriptions_reminders_deadline_idx\` ON \`push_subscriptions_reminders\` (\`deadline_id\`);`)
  await db.run(sql`CREATE INDEX \`push_subscriptions_reminders_remind_at_idx\` ON \`push_subscriptions_reminders\` (\`remind_at\`);`)
  await db.run(sql`CREATE INDEX \`push_subscriptions_reminders_notified_idx\` ON \`push_subscriptions_reminders\` (\`notified\`);`)
  await db.run(sql`CREATE TABLE \`push_subscriptions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`endpoint\` text NOT NULL,
  	\`p256dh\` text NOT NULL,
  	\`auth\` text NOT NULL,
  	\`reader_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`reader_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`push_subscriptions_endpoint_idx\` ON \`push_subscriptions\` (\`endpoint\`);`)
  await db.run(sql`CREATE INDEX \`push_subscriptions_reader_idx\` ON \`push_subscriptions\` (\`reader_id\`);`)
  await db.run(sql`CREATE INDEX \`push_subscriptions_updated_at_idx\` ON \`push_subscriptions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`push_subscriptions_created_at_idx\` ON \`push_subscriptions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`readers_push_subscriptions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`endpoint\` text NOT NULL,
  	\`keys\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`readers_push_subscriptions_order_idx\` ON \`readers_push_subscriptions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`readers_push_subscriptions_parent_id_idx\` ON \`readers_push_subscriptions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`readers_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`readers_sessions_order_idx\` ON \`readers_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`readers_sessions_parent_id_idx\` ON \`readers_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`readers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`display_name\` text NOT NULL,
  	\`avatar_url\` text,
  	\`provider\` text,
  	\`provider_id\` text,
  	\`bookmarks_synced_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`readers_provider_id_idx\` ON \`readers\` (\`provider_id\`);`)
  await db.run(sql`CREATE INDEX \`readers_updated_at_idx\` ON \`readers\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`readers_created_at_idx\` ON \`readers\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`poll_votes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`poll_id\` integer NOT NULL,
  	\`voter_hash\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`poll_id\`) REFERENCES \`polls\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`poll_votes_poll_idx\` ON \`poll_votes\` (\`poll_id\`);`)
  await db.run(sql`CREATE INDEX \`poll_votes_voter_hash_idx\` ON \`poll_votes\` (\`voter_hash\`);`)
  await db.run(sql`CREATE INDEX \`poll_votes_updated_at_idx\` ON \`poll_votes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`poll_votes_created_at_idx\` ON \`poll_votes\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`poll_voterHash_idx\` ON \`poll_votes\` (\`poll_id\`,\`voter_hash\`);`)
  await db.run(sql`CREATE TABLE \`reactions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`article_id\` integer NOT NULL,
  	\`type\` text NOT NULL,
  	\`reader_id\` integer,
  	\`fingerprint\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`article_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reader_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`reactions_article_idx\` ON \`reactions\` (\`article_id\`);`)
  await db.run(sql`CREATE INDEX \`reactions_type_idx\` ON \`reactions\` (\`type\`);`)
  await db.run(sql`CREATE INDEX \`reactions_reader_idx\` ON \`reactions\` (\`reader_id\`);`)
  await db.run(sql`CREATE INDEX \`reactions_fingerprint_idx\` ON \`reactions\` (\`fingerprint\`);`)
  await db.run(sql`CREATE INDEX \`reactions_updated_at_idx\` ON \`reactions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`reactions_created_at_idx\` ON \`reactions\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`article_type_reader_idx\` ON \`reactions\` (\`article_id\`,\`type\`,\`reader_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`article_type_fingerprint_idx\` ON \`reactions\` (\`article_id\`,\`type\`,\`fingerprint\`);`)
  await db.run(sql`CREATE TABLE \`users_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_roles_order_idx\` ON \`users_roles\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_roles_parent_idx\` ON \`users_roles\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`users_roles_value_idx\` ON \`users_roles\` (\`value\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name_bn\` text NOT NULL,
  	\`author_profile_id\` integer,
  	\`phone\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text,
  	FOREIGN KEY (\`author_profile_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`users_author_profile_idx\` ON \`users\` (\`author_profile_id\`);`)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_jobs_log\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`executed_at\` text NOT NULL,
  	\`completed_at\` text NOT NULL,
  	\`task_slug\` text NOT NULL,
  	\`task_i_d\` text NOT NULL,
  	\`input\` text,
  	\`output\` text,
  	\`state\` text NOT NULL,
  	\`error\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`payload_jobs\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_jobs_log_order_idx\` ON \`payload_jobs_log\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_log_parent_id_idx\` ON \`payload_jobs_log\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_jobs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`input\` text,
  	\`completed_at\` text,
  	\`total_tried\` numeric DEFAULT 0,
  	\`has_error\` integer DEFAULT false,
  	\`error\` text,
  	\`task_slug\` text,
  	\`queue\` text DEFAULT 'default',
  	\`wait_until\` text,
  	\`processing\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_jobs_completed_at_idx\` ON \`payload_jobs\` (\`completed_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_total_tried_idx\` ON \`payload_jobs\` (\`total_tried\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_has_error_idx\` ON \`payload_jobs\` (\`has_error\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_task_slug_idx\` ON \`payload_jobs\` (\`task_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_queue_idx\` ON \`payload_jobs\` (\`queue\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_wait_until_idx\` ON \`payload_jobs\` (\`wait_until\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_processing_idx\` ON \`payload_jobs\` (\`processing\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_updated_at_idx\` ON \`payload_jobs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_jobs_created_at_idx\` ON \`payload_jobs\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`articles_id\` integer,
  	\`categories_id\` integer,
  	\`levels_id\` integer,
  	\`districts_id\` integer,
  	\`tags_id\` integer,
  	\`authors_id\` integer,
  	\`assignments_id\` integer,
  	\`pages_id\` integer,
  	\`fact_checks_id\` integer,
  	\`scholarships_id\` integer,
  	\`deadlines_id\` integer,
  	\`institutions_id\` integer,
  	\`circulars_id\` integer,
  	\`result_links_id\` integer,
  	\`study_abroad_guides_id\` integer,
  	\`live_blogs_id\` integer,
  	\`polls_id\` integer,
  	\`quizzes_id\` integer,
  	\`media_id\` integer,
  	\`photo_galleries_id\` integer,
  	\`live_streams_id\` integer,
  	\`ad_units_id\` integer,
  	\`comments_id\` integer,
  	\`newsletter_subscribers_id\` integer,
  	\`newsletter_campaigns_id\` integer,
  	\`saved_deadlines_id\` integer,
  	\`bookmarks_id\` integer,
  	\`citizen_submissions_id\` integer,
  	\`push_subscriptions_id\` integer,
  	\`readers_id\` integer,
  	\`poll_votes_id\` integer,
  	\`reactions_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`levels_id\`) REFERENCES \`levels\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`districts_id\`) REFERENCES \`districts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`authors_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`assignments_id\`) REFERENCES \`assignments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fact_checks_id\`) REFERENCES \`fact_checks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`scholarships_id\`) REFERENCES \`scholarships\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`deadlines_id\`) REFERENCES \`deadlines\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`institutions_id\`) REFERENCES \`institutions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`circulars_id\`) REFERENCES \`circulars\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`result_links_id\`) REFERENCES \`result_links\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`study_abroad_guides_id\`) REFERENCES \`study_abroad_guides\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`live_blogs_id\`) REFERENCES \`live_blogs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`polls_id\`) REFERENCES \`polls\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`quizzes_id\`) REFERENCES \`quizzes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`photo_galleries_id\`) REFERENCES \`photo_galleries\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`live_streams_id\`) REFERENCES \`live_streams\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`ad_units_id\`) REFERENCES \`ad_units\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`comments_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`newsletter_subscribers_id\`) REFERENCES \`newsletter_subscribers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`newsletter_campaigns_id\`) REFERENCES \`newsletter_campaigns\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`saved_deadlines_id\`) REFERENCES \`saved_deadlines\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`bookmarks_id\`) REFERENCES \`bookmarks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`citizen_submissions_id\`) REFERENCES \`citizen_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`push_subscriptions_id\`) REFERENCES \`push_subscriptions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`readers_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`poll_votes_id\`) REFERENCES \`poll_votes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`reactions_id\`) REFERENCES \`reactions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_levels_id_idx\` ON \`payload_locked_documents_rels\` (\`levels_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_districts_id_idx\` ON \`payload_locked_documents_rels\` (\`districts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tags_id_idx\` ON \`payload_locked_documents_rels\` (\`tags_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_authors_id_idx\` ON \`payload_locked_documents_rels\` (\`authors_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_assignments_id_idx\` ON \`payload_locked_documents_rels\` (\`assignments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_fact_checks_id_idx\` ON \`payload_locked_documents_rels\` (\`fact_checks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_scholarships_id_idx\` ON \`payload_locked_documents_rels\` (\`scholarships_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_deadlines_id_idx\` ON \`payload_locked_documents_rels\` (\`deadlines_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_institutions_id_idx\` ON \`payload_locked_documents_rels\` (\`institutions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_circulars_id_idx\` ON \`payload_locked_documents_rels\` (\`circulars_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_result_links_id_idx\` ON \`payload_locked_documents_rels\` (\`result_links_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_study_abroad_guides_id_idx\` ON \`payload_locked_documents_rels\` (\`study_abroad_guides_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_live_blogs_id_idx\` ON \`payload_locked_documents_rels\` (\`live_blogs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_polls_id_idx\` ON \`payload_locked_documents_rels\` (\`polls_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_quizzes_id_idx\` ON \`payload_locked_documents_rels\` (\`quizzes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_photo_galleries_id_idx\` ON \`payload_locked_documents_rels\` (\`photo_galleries_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_live_streams_id_idx\` ON \`payload_locked_documents_rels\` (\`live_streams_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_ad_units_id_idx\` ON \`payload_locked_documents_rels\` (\`ad_units_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`comments_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_newsletter_subscribers_id_idx\` ON \`payload_locked_documents_rels\` (\`newsletter_subscribers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_newsletter_campaigns_id_idx\` ON \`payload_locked_documents_rels\` (\`newsletter_campaigns_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_saved_deadlines_id_idx\` ON \`payload_locked_documents_rels\` (\`saved_deadlines_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bookmarks_id_idx\` ON \`payload_locked_documents_rels\` (\`bookmarks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_citizen_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`citizen_submissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_push_subscriptions_id_idx\` ON \`payload_locked_documents_rels\` (\`push_subscriptions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_readers_id_idx\` ON \`payload_locked_documents_rels\` (\`readers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_poll_votes_id_idx\` ON \`payload_locked_documents_rels\` (\`poll_votes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_reactions_id_idx\` ON \`payload_locked_documents_rels\` (\`reactions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`readers_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`readers_id\`) REFERENCES \`readers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_readers_id_idx\` ON \`payload_preferences_rels\` (\`readers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_name\` text DEFAULT 'শিক্ষা২৪' NOT NULL,
  	\`site_name_en\` text DEFAULT 'Shikkha24',
  	\`tagline\` text DEFAULT 'দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ',
  	\`logo_id\` integer,
  	\`show_name_with_logo\` integer DEFAULT true,
  	\`favicon_id\` integer,
  	\`contact_email\` text,
  	\`contact_news_email\` text,
  	\`contact_editor_email\` text,
  	\`contact_ads_email\` text,
  	\`contact_phone\` text,
  	\`contact_address\` text,
  	\`social_facebook\` text,
  	\`social_youtube\` text,
  	\`social_twitter\` text,
  	\`social_instagram\` text,
  	\`footer_text\` text,
  	\`legal_trade_license\` text,
  	\`legal_tin\` text,
  	\`legal_ministry_registration\` text,
  	\`tracking_adsense_client_id\` text,
  	\`tracking_custom_head_code\` text,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`favicon_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_logo_idx\` ON \`site_settings\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_favicon_idx\` ON \`site_settings\` (\`favicon_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`articles_photo_story\`;`)
  await db.run(sql`DROP TABLE \`articles_key_takeaways\`;`)
  await db.run(sql`DROP TABLE \`articles_timeline_milestones\`;`)
  await db.run(sql`DROP TABLE \`articles\`;`)
  await db.run(sql`DROP TABLE \`articles_rels\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_version_photo_story\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_version_key_takeaways\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_version_timeline_milestones\`;`)
  await db.run(sql`DROP TABLE \`_articles_v\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_rels\`;`)
  await db.run(sql`DROP TABLE \`categories\`;`)
  await db.run(sql`DROP TABLE \`levels\`;`)
  await db.run(sql`DROP TABLE \`districts\`;`)
  await db.run(sql`DROP TABLE \`tags\`;`)
  await db.run(sql`DROP TABLE \`authors_beat\`;`)
  await db.run(sql`DROP TABLE \`authors\`;`)
  await db.run(sql`DROP TABLE \`assignments\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`fact_checks_source_urls\`;`)
  await db.run(sql`DROP TABLE \`fact_checks_comparison_images\`;`)
  await db.run(sql`DROP TABLE \`fact_checks\`;`)
  await db.run(sql`DROP TABLE \`scholarships\`;`)
  await db.run(sql`DROP TABLE \`scholarships_rels\`;`)
  await db.run(sql`DROP TABLE \`deadlines\`;`)
  await db.run(sql`DROP TABLE \`deadlines_rels\`;`)
  await db.run(sql`DROP TABLE \`institutions_faculties_departments\`;`)
  await db.run(sql`DROP TABLE \`institutions_faculties\`;`)
  await db.run(sql`DROP TABLE \`institutions_admission_info\`;`)
  await db.run(sql`DROP TABLE \`institutions_tuition_fees\`;`)
  await db.run(sql`DROP TABLE \`institutions_important_links\`;`)
  await db.run(sql`DROP TABLE \`institutions\`;`)
  await db.run(sql`DROP TABLE \`institutions_rels\`;`)
  await db.run(sql`DROP TABLE \`circulars\`;`)
  await db.run(sql`DROP TABLE \`circulars_rels\`;`)
  await db.run(sql`DROP TABLE \`result_links\`;`)
  await db.run(sql`DROP TABLE \`study_abroad_guides\`;`)
  await db.run(sql`DROP TABLE \`live_blogs_entries\`;`)
  await db.run(sql`DROP TABLE \`live_blogs\`;`)
  await db.run(sql`DROP TABLE \`polls_options\`;`)
  await db.run(sql`DROP TABLE \`polls\`;`)
  await db.run(sql`DROP TABLE \`quizzes_questions_options\`;`)
  await db.run(sql`DROP TABLE \`quizzes_questions\`;`)
  await db.run(sql`DROP TABLE \`quizzes\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`photo_galleries_images\`;`)
  await db.run(sql`DROP TABLE \`photo_galleries\`;`)
  await db.run(sql`DROP TABLE \`live_streams\`;`)
  await db.run(sql`DROP TABLE \`ad_units\`;`)
  await db.run(sql`DROP TABLE \`comments\`;`)
  await db.run(sql`DROP TABLE \`newsletter_subscribers\`;`)
  await db.run(sql`DROP TABLE \`newsletter_campaigns\`;`)
  await db.run(sql`DROP TABLE \`saved_deadlines\`;`)
  await db.run(sql`DROP TABLE \`bookmarks\`;`)
  await db.run(sql`DROP TABLE \`citizen_submissions\`;`)
  await db.run(sql`DROP TABLE \`push_subscriptions_reminders\`;`)
  await db.run(sql`DROP TABLE \`push_subscriptions\`;`)
  await db.run(sql`DROP TABLE \`readers_push_subscriptions\`;`)
  await db.run(sql`DROP TABLE \`readers_sessions\`;`)
  await db.run(sql`DROP TABLE \`readers\`;`)
  await db.run(sql`DROP TABLE \`poll_votes\`;`)
  await db.run(sql`DROP TABLE \`reactions\`;`)
  await db.run(sql`DROP TABLE \`users_roles\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_jobs_log\`;`)
  await db.run(sql`DROP TABLE \`payload_jobs\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
}
