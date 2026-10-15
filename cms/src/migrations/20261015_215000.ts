import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`faqs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`question\` text NOT NULL,
  	\`answer\` text NOT NULL,
  	\`group\` text DEFAULT 'general' NOT NULL,
  	\`priority\` numeric DEFAULT 100,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`faqs_updated_at_idx\` ON \`faqs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`faqs_created_at_idx\` ON \`faqs\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`faqs_id\` integer REFERENCES faqs(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_faqs_id_idx\` ON \`payload_locked_documents_rels\` (\`faqs_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`faqs\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
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
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "articles_id", "categories_id", "levels_id", "districts_id", "tags_id", "authors_id", "assignments_id", "pages_id", "fact_checks_id", "scholarships_id", "deadlines_id", "institutions_id", "circulars_id", "result_links_id", "study_abroad_guides_id", "live_blogs_id", "polls_id", "quizzes_id", "media_id", "photo_galleries_id", "live_streams_id", "ad_units_id", "comments_id", "newsletter_subscribers_id", "newsletter_campaigns_id", "saved_deadlines_id", "bookmarks_id", "citizen_submissions_id", "push_subscriptions_id", "readers_id", "poll_votes_id", "reactions_id", "users_id") SELECT "id", "order", "parent_id", "path", "articles_id", "categories_id", "levels_id", "districts_id", "tags_id", "authors_id", "assignments_id", "pages_id", "fact_checks_id", "scholarships_id", "deadlines_id", "institutions_id", "circulars_id", "result_links_id", "study_abroad_guides_id", "live_blogs_id", "polls_id", "quizzes_id", "media_id", "photo_galleries_id", "live_streams_id", "ad_units_id", "comments_id", "newsletter_subscribers_id", "newsletter_campaigns_id", "saved_deadlines_id", "bookmarks_id", "citizen_submissions_id", "push_subscriptions_id", "readers_id", "poll_votes_id", "reactions_id", "users_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
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
}
