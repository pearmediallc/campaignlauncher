require('dotenv').config();

module.exports = {
  production: {
    use_env_variable: 'DATABASE_URL', // Render provides this automatically
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};