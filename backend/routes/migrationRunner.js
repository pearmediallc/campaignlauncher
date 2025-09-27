const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Temporary endpoint to run migrations manually
// This should be removed after fixing the production database
router.post('/run', async (req, res) => {
  try {
    console.log('🔧 Manual migration triggered');

    // Security: Only allow in production with a secret key
    const { secret } = req.body;
    if (process.env.NODE_ENV === 'production' && secret !== process.env.MIGRATION_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Run migrations
    const migrationEnv = process.env.NODE_ENV === 'production' ? 'NODE_ENV=production ' : '';
    const { stdout, stderr } = await execPromise(`${migrationEnv}npx sequelize-cli db:migrate`);

    console.log('Migration output:', stdout);
    if (stderr && !stderr.includes('No migrations were executed')) {
      console.error('Migration warnings:', stderr);
    }

    res.json({
      success: true,
      message: 'Migrations executed successfully',
      output: stdout,
      warnings: stderr
    });
  } catch (error) {
    console.error('Migration execution failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration execution failed',
      error: error.message
    });
  }
});

// Check migration status
router.get('/status', async (req, res) => {
  try {
    const migrationEnv = process.env.NODE_ENV === 'production' ? 'NODE_ENV=production ' : '';
    const { stdout } = await execPromise(`${migrationEnv}npx sequelize-cli db:migrate:status`);

    res.json({
      success: true,
      status: stdout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check migration status',
      error: error.message
    });
  }
});

module.exports = router;