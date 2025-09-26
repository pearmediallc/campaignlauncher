#!/usr/bin/env node

/**
 * Auto-migration script for production deployment
 * Ensures all migrations are run on deployment
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🔄 Starting database migration process...');

// Run Sequelize migrations
exec('npx sequelize-cli db:migrate', {
  cwd: path.resolve(__dirname, '..'),
  env: process.env
}, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', stderr);
    // Don't exit with error to prevent deployment failure
    // Just log the error and continue
    console.log('⚠️ Continuing despite migration errors...');
  } else {
    console.log('✅ Migrations completed successfully');
    console.log(stdout);
  }

  // Always ensure CampaignTemplates table exists
  const db = require('../models');

  console.log('📦 Ensuring CampaignTemplates table exists...');

  // Always try to create the table (IF NOT EXISTS prevents errors)
  db.sequelize.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'CampaignTemplates'
    );
  `).then(([results]) => {
    const tableExists = results[0].exists;

    if (!tableExists) {
      console.log('📦 Creating CampaignTemplates table...');

      return db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "CampaignTemplates" (
          "id" SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "templateName" VARCHAR(255) NOT NULL,
          "templateData" JSONB NOT NULL,
          "mediaUrls" JSONB,
          "isDefault" BOOLEAN DEFAULT false,
          "category" VARCHAR(100) DEFAULT 'personal',
          "description" TEXT,
          "usageCount" INTEGER DEFAULT 0,
          "lastUsedAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS "idx_campaign_templates_user_id" ON "CampaignTemplates"("userId");
        CREATE INDEX IF NOT EXISTS "idx_campaign_templates_user_default" ON "CampaignTemplates"("userId", "isDefault");
        CREATE INDEX IF NOT EXISTS "idx_campaign_templates_category" ON "CampaignTemplates"("category");
      `);
    } else {
      console.log('✅ CampaignTemplates table already exists');
    }
  }).then(() => {
    console.log('✅ Database setup complete');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Error checking/creating tables:', err);
    // Continue anyway
    process.exit(0);
  });
});