'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the unique constraint from facebook_user_id
    // This allows multiple users to connect the same Facebook account
    await queryInterface.removeConstraint(
      'facebook_auth',
      'facebook_auth_facebook_user_id_key'
    );

    console.log('✅ Removed unique constraint from facebook_auth.facebook_user_id');
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add the unique constraint if rollback is needed
    await queryInterface.addConstraint('facebook_auth', {
      fields: ['facebook_user_id'],
      type: 'unique',
      name: 'facebook_auth_facebook_user_id_key'
    });

    console.log('⏪ Re-added unique constraint to facebook_auth.facebook_user_id');
  }
};
