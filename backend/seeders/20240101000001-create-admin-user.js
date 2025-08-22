'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123456', 10);
    
    await queryInterface.bulkInsert('users', [{
      email: 'admin@example.com',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }], {});
    
    // Get the admin user and super_admin role
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'admin@example.com'"
    );
    const [roles] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'super_admin'"
    );
    
    if (users.length > 0 && roles.length > 0) {
      await queryInterface.bulkInsert('user_roles', [{
        user_id: users[0].id,
        role_id: roles[0].id,
        assigned_at: new Date()
      }], {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
  }
};