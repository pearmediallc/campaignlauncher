/**
 * Fix for camelCase vs snake_case field mapping issues
 * This updates all models to properly map to snake_case database columns
 */

const fs = require('fs');
const path = require('path');

const fixes = {
  'FacebookAuth.js': {
    fields: [
      'user_id', 'facebook_user_id', 'access_token', 'refresh_token',
      'token_expires_at', 'ad_accounts', 'business_accounts',
      'last_verified_at', 'is_active', 'created_at', 'updated_at'
    ]
  },
  'EligibilityCheck.js': {
    fields: [
      'user_id', 'facebook_auth_id', 'check_type', 'has_active_ad_account',
      'has_no_restrictions', 'account_age', 'has_spending_history',
      'has_payment_method', 'business_verification_status', 'total_spend',
      'ad_account_count', 'failure_reasons', 'expires_at', 'checked_at',
      'created_at', 'updated_at'
    ]
  },
  'AuthAuditLog.js': {
    fields: [
      'user_id', 'event_type', 'event_status', 'ip_address',
      'user_agent', 'facebook_user_id', 'error_message', 'created_at'
    ]
  }
};

// Add underscoreTrue to model options
const addUnderscored = () => {
  const modelsPath = path.join(__dirname, '..', 'models');
  
  // FacebookAuth
  let content = fs.readFileSync(path.join(modelsPath, 'FacebookAuth.js'), 'utf8');
  content = content.replace(
    "tableName: 'facebook_auth',",
    "tableName: 'facebook_auth',\n  underscored: true,"
  );
  fs.writeFileSync(path.join(modelsPath, 'FacebookAuth.js'), content);
  
  // EligibilityCheck
  content = fs.readFileSync(path.join(modelsPath, 'EligibilityCheck.js'), 'utf8');
  content = content.replace(
    "tableName: 'eligibility_checks',",
    "tableName: 'eligibility_checks',\n  underscored: true,"
  );
  fs.writeFileSync(path.join(modelsPath, 'EligibilityCheck.js'), content);
  
  // AuthAuditLog - already has field mappings
  
  console.log('✅ Models updated with underscored option');
};

addUnderscored();