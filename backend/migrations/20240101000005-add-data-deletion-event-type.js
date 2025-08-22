'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For PostgreSQL, we need to check if we're using PostgreSQL or MySQL
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
      // PostgreSQL: First check if the value already exists
      const [results] = await queryInterface.sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_auth_audit_logs_event_type'
        ) AND enumlabel = 'data_deletion_request'
      `);
      
      if (results.length === 0) {
        // Add new value to the enum type
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_auth_audit_logs_event_type" 
          ADD VALUE IF NOT EXISTS 'data_deletion_request'
        `);
      }
    } else {
      // MySQL syntax
      await queryInterface.sequelize.query(`
        ALTER TABLE auth_audit_logs 
        MODIFY COLUMN event_type 
        ENUM(
          'login_attempt',
          'login_success',
          'login_failure',
          'token_refresh',
          'eligibility_check',
          'permission_grant',
          'permission_revoke',
          'logout',
          'token_expired',
          'suspicious_activity',
          'resources_selected',
          'sdk_login_attempt',
          'sdk_login_failure',
          'sdk_login_success',
          'sdk_login_error',
          'data_deletion_request'
        ) NOT NULL
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This would require recreating the type, which is complex
    // For now, we'll leave the value in place for PostgreSQL
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'mysql') {
      await queryInterface.sequelize.query(`
        ALTER TABLE auth_audit_logs 
        MODIFY COLUMN event_type 
        ENUM(
          'login_attempt',
          'login_success',
          'login_failure',
          'token_refresh',
          'eligibility_check',
          'permission_grant',
          'permission_revoke',
          'logout',
          'token_expired',
          'suspicious_activity',
          'resources_selected',
          'sdk_login_attempt',
          'sdk_login_failure',
          'sdk_login_success',
          'sdk_login_error'
        ) NOT NULL
      `);
    }
    // For PostgreSQL, we can't easily remove enum values
  }
};