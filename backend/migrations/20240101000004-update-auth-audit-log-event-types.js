'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update the event_type ENUM to include new values
    await queryInterface.changeColumn('auth_audit_logs', 'event_type', {
      type: Sequelize.ENUM(
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
      ),
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to original ENUM values
    await queryInterface.changeColumn('auth_audit_logs', 'event_type', {
      type: Sequelize.ENUM(
        'login_attempt',
        'login_success',
        'login_failure',
        'token_refresh',
        'eligibility_check',
        'permission_grant',
        'permission_revoke',
        'logout',
        'token_expired',
        'suspicious_activity'
      ),
      allowNull: false
    });
  }
};