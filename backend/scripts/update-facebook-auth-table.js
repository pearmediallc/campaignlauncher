/**
 * Migration script to add new columns to facebook_auth table
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fb_campaign_launcher'
  });

  try {
    console.log('🔄 Updating facebook_auth table...\n');

    // Add new columns if they don't exist
    const columnsToAdd = [
      {
        name: 'selected_ad_account',
        definition: 'JSON DEFAULT NULL COMMENT "Currently selected ad account for campaigns"'
      },
      {
        name: 'selected_page',
        definition: 'JSON DEFAULT NULL COMMENT "Currently selected page for campaigns"'
      },
      {
        name: 'pixels',
        definition: 'JSON DEFAULT NULL COMMENT "Array of accessible pixels"'
      },
      {
        name: 'selected_pixel',
        definition: 'JSON DEFAULT NULL COMMENT "Currently selected pixel for tracking"'
      },
      {
        name: 'storage_preference',
        definition: 'ENUM("local", "session") DEFAULT "session" COMMENT "User preference for token storage"'
      }
    ];

    for (const column of columnsToAdd) {
      try {
        // Check if column exists
        const [rows] = await connection.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'facebook_auth' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME || 'fb_campaign_launcher', column.name]
        );

        if (rows.length === 0) {
          // Add column
          await connection.execute(
            `ALTER TABLE facebook_auth ADD COLUMN ${column.name} ${column.definition}`
          );
          console.log(`✅ Added column: ${column.name}`);
        } else {
          console.log(`⏭️  Column already exists: ${column.name}`);
        }
      } catch (error) {
        console.error(`❌ Error adding column ${column.name}:`, error.message);
      }
    }

    console.log('\n✅ Table update completed!');
    
  } catch (error) {
    console.error('❌ Error updating table:', error);
  } finally {
    await connection.end();
  }
}

updateTable();