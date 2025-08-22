'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/database.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  const dbUrl = process.env[config.use_env_variable];
  if (!dbUrl) {
    console.error(`ERROR: Environment variable ${config.use_env_variable} is not set`);
    console.error('Please ensure your database is connected in Render');
    process.exit(1);
  }
  console.log('Using DATABASE_URL for connection');
  // Parse URL to check components
  try {
    const url = new URL(dbUrl);
    console.log('Database connection details:');
    console.log('  Protocol:', url.protocol);
    console.log('  Host:', url.hostname);
    console.log('  Port:', url.port || '5432');
    console.log('  Database:', url.pathname.slice(1));
  } catch (e) {
    console.error('Invalid DATABASE_URL format');
  }
  sequelize = new Sequelize(dbUrl, config);
} else {
  console.log('Using individual database credentials');
  console.log('Database host:', config.host);
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;