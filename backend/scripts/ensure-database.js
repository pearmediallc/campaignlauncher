/**
 * Database Integrity Check Script
 * Ensures database is properly set up before server starts
 * This prevents foreign key constraint errors
 */

require('dotenv').config();

async function ensureDatabase() {
  // Skip database checks in production with PostgreSQL
  // Migrations will handle table creation
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Skipping database checks in production (PostgreSQL)');
    return;
  }
  
  // Only run MySQL checks in development
  const mysql = require('mysql2/promise');
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fb_campaign_launcher',
      port: process.env.DB_PORT || 3306
    });
    
    // Check if all required tables exist
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('users', 'facebook_auth', 'eligibility_checks', 'auth_audit_logs')",
      [process.env.DB_NAME || 'fb_campaign_launcher']
    );
    
    const existingTables = tables.map(t => t.TABLE_NAME);
    const requiredTables = ['users', 'facebook_auth', 'eligibility_checks', 'auth_audit_logs'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing tables detected:', missingTables.join(', '));
      console.log('Please run: npm run migrate');
      process.exit(1);
    }
    
    // Check column types for critical foreign keys
    const [userIdType] = await connection.execute(
      "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'",
      [process.env.DB_NAME || 'fb_campaign_launcher']
    );
    
    if (userIdType.length > 0) {
      const isInteger = userIdType[0].COLUMN_TYPE.toLowerCase().includes('int');
      if (!isInteger) {
        console.error('❌ User.id is not INTEGER type. Database schema mismatch!');
        console.log('Please run: npm run fix-db');
        process.exit(1);
      }
    }
    
    // Check foreign key constraints
    const [constraints] = await connection.execute(
      `SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND TABLE_NAME IN ('facebook_auth', 'eligibility_checks', 'auth_audit_logs')`,
      [process.env.DB_NAME || 'fb_campaign_launcher']
    );
    
    // Validate foreign key compatibility
    for (const constraint of constraints) {
      const [colType] = await connection.execute(
        "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [process.env.DB_NAME || 'fb_campaign_launcher', constraint.TABLE_NAME, constraint.COLUMN_NAME]
      );
      
      const [refColType] = await connection.execute(
        "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [process.env.DB_NAME || 'fb_campaign_launcher', constraint.REFERENCED_TABLE_NAME, constraint.REFERENCED_COLUMN_NAME]
      );
      
      if (colType[0] && refColType[0] && colType[0].COLUMN_TYPE !== refColType[0].COLUMN_TYPE) {
        console.error(`❌ Foreign key type mismatch in ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME}`);
        console.error(`   Expected: ${refColType[0].COLUMN_TYPE}, Got: ${colType[0].COLUMN_TYPE}`);
        console.log('Please run: npm run fix-db');
        process.exit(1);
      }
    }
    
    console.log('✅ Database schema is valid');
    return true;
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('Database does not exist. Please create it first.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Export for use in server.js
module.exports = ensureDatabase;

// Run if called directly
if (require.main === module) {
  ensureDatabase();
}