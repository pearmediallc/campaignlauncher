'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get super_admin role ID (try both capitalized and lowercase table names)
      let roles;
      try {
        [roles] = await queryInterface.sequelize.query(
          "SELECT id FROM \"Roles\" WHERE name = 'super_admin' LIMIT 1"
        );
      } catch (e) {
        // Try lowercase table name
        [roles] = await queryInterface.sequelize.query(
          "SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1"
        );
      }

      if (roles.length === 0) {
        console.log('⚠️  super_admin role not found, skipping permission grant');
        return;
      }

      const superAdminRoleId = roles[0].id;
      console.log(`✅ Found super_admin role (ID: ${superAdminRoleId})`);

      // Define all permissions super_admin should have
      const permissions = [
        // User management
        { resource: 'user', action: 'create', description: 'Create new users' },
        { resource: 'user', action: 'read', description: 'View users' },
        { resource: 'user', action: 'update', description: 'Update user details and reset passwords' },
        { resource: 'user', action: 'delete', description: 'Delete users' },

        // Role management
        { resource: 'role', action: 'create', description: 'Create new roles' },
        { resource: 'role', action: 'read', description: 'View roles' },
        { resource: 'role', action: 'update', description: 'Update role permissions' },
        { resource: 'role', action: 'delete', description: 'Delete roles' },
        { resource: 'role', action: 'assign', description: 'Assign roles to users' },

        // Resource management
        { resource: 'resource', action: 'read', description: 'View resources' },
        { resource: 'resource', action: 'grant', description: 'Grant resource access' },
        { resource: 'resource', action: 'revoke', description: 'Revoke resource access' },

        // Audit logs
        { resource: 'audit', action: 'read', description: 'View audit logs' },

        // Campaign management
        { resource: 'campaign', action: 'create', description: 'Create campaigns' },
        { resource: 'campaign', action: 'read', description: 'View campaigns' },
        { resource: 'campaign', action: 'update', description: 'Update campaigns' },
        { resource: 'campaign', action: 'delete', description: 'Delete campaigns' },

        // Template management
        { resource: 'template', action: 'create', description: 'Create templates' },
        { resource: 'template', action: 'read', description: 'View templates' },
        { resource: 'template', action: 'update', description: 'Update templates' },
        { resource: 'template', action: 'delete', description: 'Delete templates' }
      ];

      let insertedCount = 0;
      let skippedCount = 0;

      // Insert permissions (skip duplicates)
      for (const perm of permissions) {
        try {
          // Check if permission already exists (lowercase column names)
          const [existing] = await queryInterface.sequelize.query(
            `SELECT id FROM permissions
             WHERE roleid = ${superAdminRoleId}
             AND resource = '${perm.resource}'
             AND action = '${perm.action}'
             LIMIT 1`
          );

          if (existing.length > 0) {
            console.log(`  ⏭️  ${perm.resource}:${perm.action} already exists`);
            skippedCount++;
          } else {
            await queryInterface.sequelize.query(
              `INSERT INTO permissions (roleid, resource, action, createdat, updatedat)
               VALUES (${superAdminRoleId}, '${perm.resource}', '${perm.action}', NOW(), NOW())`
            );
            console.log(`  ✅ ${perm.resource}:${perm.action} - ${perm.description}`);
            insertedCount++;
          }
        } catch (error) {
          console.log(`  ❌ Failed to add ${perm.resource}:${perm.action}:`, error.message);
        }
      }

      console.log('\n📊 Summary:');
      console.log(`  ✅ Inserted: ${insertedCount} permission(s)`);
      console.log(`  ⏭️  Skipped: ${skippedCount} permission(s) (already exist)`);
      console.log(`  📝 Total: ${permissions.length} permission(s)`);
      console.log('\n✅ Super admin permissions migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Get super_admin role ID (lowercase table name)
      let roles;
      try {
        [roles] = await queryInterface.sequelize.query(
          "SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1"
        );
      } catch (e) {
        console.log('⚠️  Could not query roles table:', e.message);
        return;
      }

      if (roles.length > 0) {
        const superAdminRoleId = roles[0].id;
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE roleid = ${superAdminRoleId}`
        );
        console.log(`✅ Removed all permissions for super_admin role`);
      } else {
        console.log('⚠️  super_admin role not found, nothing to rollback');
      }
    } catch (error) {
      console.error('❌ Rollback error:', error);
      throw error;
    }
  }
};
