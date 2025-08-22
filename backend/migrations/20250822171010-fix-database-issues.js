'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Add missing business_verification_status column to eligibility_checks
    const eligibilityTable = await queryInterface.describeTable('eligibility_checks');
    if (!eligibilityTable.business_verification_status) {
      await queryInterface.addColumn('eligibility_checks', 'business_verification_status', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      });
    }

    // 2. Fix the auth_audit_logs enum to include missing values
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
      // Check if resources_selected exists in the enum
      const [enumValues] = await queryInterface.sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_auth_audit_logs_event_type'
        )
      `);
      
      const existingValues = enumValues.map(row => row.enumlabel);
      
      // Add missing enum values
      const requiredValues = [
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
      ];
      
      for (const value of requiredValues) {
        if (!existingValues.includes(value)) {
          try {
            await queryInterface.sequelize.query(`
              ALTER TYPE "enum_auth_audit_logs_event_type" 
              ADD VALUE IF NOT EXISTS '${value}'
            `);
          } catch (e) {
            console.log(`Value ${value} might already exist or enum doesn't exist`);
          }
        }
      }
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove business_verification_status column
    const eligibilityTable = await queryInterface.describeTable('eligibility_checks');
    if (eligibilityTable.business_verification_status) {
      await queryInterface.removeColumn('eligibility_checks', 'business_verification_status');
    }
    
    // Note: We can't easily remove enum values in PostgreSQL
  }
};
