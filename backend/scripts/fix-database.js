#!/usr/bin/env node

/**
 * Database Fix Script
 * This script drops and recreates tables with correct schema
 * Run this if you encounter foreign key constraint errors
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabase() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fb_campaign_launcher',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('Connected to database');
    
    // Disable foreign key checks temporarily
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop problematic tables if they exist
    const tablesToDrop = [
      'auth_audit_logs',
      'eligibility_checks', 
      'facebook_auth'
    ];
    
    for (const table of tablesToDrop) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`Dropped table: ${table}`);
      } catch (error) {
        console.log(`Table ${table} might not exist, skipping...`);
      }
    }
    
    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Tables cleaned up successfully');
    
    // Run migrations to recreate tables with correct schema
    console.log('Running migrations to recreate tables...');
    const { stdout, stderr } = await execPromise('npx sequelize-cli db:migrate');
    
    if (stdout) console.log('Migration output:', stdout);
    if (stderr && !stderr.includes('No migrations were executed')) {
      console.error('Migration warnings:', stderr);
    }
    
    console.log('✅ Database fixed successfully!');
    console.log('You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
fixDatabase();