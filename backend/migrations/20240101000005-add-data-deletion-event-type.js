'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get current enum values and add the new one
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
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new enum value
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
};