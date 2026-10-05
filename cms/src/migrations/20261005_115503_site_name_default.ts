import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_name\` text DEFAULT 'শিক্ষা২৪.কম' NOT NULL,
  	\`site_name_en\` text DEFAULT 'Shikkha24.com',
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
  await db.run(sql`INSERT INTO \`__new_site_settings\`("id", "site_name", "site_name_en", "tagline", "logo_id", "show_name_with_logo", "favicon_id", "contact_email", "contact_news_email", "contact_editor_email", "contact_ads_email", "contact_phone", "contact_address", "social_facebook", "social_youtube", "social_twitter", "social_instagram", "footer_text", "legal_trade_license", "legal_tin", "legal_ministry_registration", "tracking_adsense_client_id", "tracking_custom_head_code", "updated_at", "created_at") SELECT "id", "site_name", "site_name_en", "tagline", "logo_id", "show_name_with_logo", "favicon_id", "contact_email", "contact_news_email", "contact_editor_email", "contact_ads_email", "contact_phone", "contact_address", "social_facebook", "social_youtube", "social_twitter", "social_instagram", "footer_text", "legal_trade_license", "legal_tin", "legal_ministry_registration", "tracking_adsense_client_id", "tracking_custom_head_code", "updated_at", "created_at" FROM \`site_settings\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
  await db.run(sql`ALTER TABLE \`__new_site_settings\` RENAME TO \`site_settings\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`site_settings_logo_idx\` ON \`site_settings\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_favicon_idx\` ON \`site_settings\` (\`favicon_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_site_settings\` (
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
  await db.run(sql`INSERT INTO \`__new_site_settings\`("id", "site_name", "site_name_en", "tagline", "logo_id", "show_name_with_logo", "favicon_id", "contact_email", "contact_news_email", "contact_editor_email", "contact_ads_email", "contact_phone", "contact_address", "social_facebook", "social_youtube", "social_twitter", "social_instagram", "footer_text", "legal_trade_license", "legal_tin", "legal_ministry_registration", "tracking_adsense_client_id", "tracking_custom_head_code", "updated_at", "created_at") SELECT "id", "site_name", "site_name_en", "tagline", "logo_id", "show_name_with_logo", "favicon_id", "contact_email", "contact_news_email", "contact_editor_email", "contact_ads_email", "contact_phone", "contact_address", "social_facebook", "social_youtube", "social_twitter", "social_instagram", "footer_text", "legal_trade_license", "legal_tin", "legal_ministry_registration", "tracking_adsense_client_id", "tracking_custom_head_code", "updated_at", "created_at" FROM \`site_settings\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
  await db.run(sql`ALTER TABLE \`__new_site_settings\` RENAME TO \`site_settings\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`site_settings_logo_idx\` ON \`site_settings\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_favicon_idx\` ON \`site_settings\` (\`favicon_id\`);`)
}
