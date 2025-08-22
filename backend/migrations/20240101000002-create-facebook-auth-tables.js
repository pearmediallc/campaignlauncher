'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create facebook_auth table
    await queryInterface.createTable('facebook_auth', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      facebook_user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      token_expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      permissions: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      ad_accounts: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      pages: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      business_accounts: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      last_verified_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('facebook_auth', ['user_id']);
    await queryInterface.addIndex('facebook_auth', ['facebook_user_id']);
    await queryInterface.addIndex('facebook_auth', ['is_active']);

    // Create eligibility_checks table
    await queryInterface.createTable('eligibility_checks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      facebook_auth_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'facebook_auth',
          key: 'id'
        }
      },
      check_type: {
        type: Sequelize.ENUM('initial', 'periodic', 'manual'),
        defaultValue: 'initial'
      },
      status: {
        type: Sequelize.ENUM('pending', 'eligible', 'ineligible', 'review_required'),
        defaultValue: 'pending'
      },
      criteria: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      has_active_ad_account: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_no_restrictions: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      account_age: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      has_spending_history: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_payment_method: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      business_verification_status: {
        type: Sequelize.STRING,
        allowNull: true
      },
      total_spend: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      ad_account_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      failure_reasons: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      checked_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('eligibility_checks', ['user_id']);
    await queryInterface.addIndex('eligibility_checks', ['facebook_auth_id']);
    await queryInterface.addIndex('eligibility_checks', ['status']);
    await queryInterface.addIndex('eligibility_checks', ['expires_at']);
    await queryInterface.addIndex('eligibility_checks', ['checked_at']);

    // Create auth_audit_logs table
    await queryInterface.createTable('auth_audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      event_type: {
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
      },
      event_status: {
        type: Sequelize.ENUM('success', 'failure', 'pending'),
        allowNull: false
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      facebook_user_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('auth_audit_logs', ['user_id']);
    await queryInterface.addIndex('auth_audit_logs', ['event_type']);
    await queryInterface.addIndex('auth_audit_logs', ['event_status']);
    await queryInterface.addIndex('auth_audit_logs', ['created_at']);
    await queryInterface.addIndex('auth_audit_logs', ['facebook_user_id']);

    // Add facebook_user_id column to users table if it doesn't exist
    const usersTable = await queryInterface.describeTable('users');
    if (!usersTable.facebook_user_id) {
      await queryInterface.addColumn('users', 'facebook_user_id', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
      await queryInterface.addIndex('users', ['facebook_user_id']);
    }

    // Add last_login_at column to users table if it doesn't exist
    if (!usersTable.last_login_at) {
      await queryInterface.addColumn('users', 'last_login_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('auth_audit_logs');
    await queryInterface.dropTable('eligibility_checks');
    await queryInterface.dropTable('facebook_auth');

    // Remove columns from users table
    await queryInterface.removeColumn('users', 'facebook_user_id');
    await queryInterface.removeColumn('users', 'last_login_at');
  }
};