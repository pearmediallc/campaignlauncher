const db = require('../models');
const crypto = require('crypto');

// Encryption functions
const algorithm = 'aes-256-gcm';
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');

function isEncrypted(token) {
  try {
    const parsed = JSON.parse(token);
    return parsed.encrypted && parsed.authTag && parsed.iv;
  } catch {
    return false;
  }
}

function encryptToken(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
}

async function fixTokens() {
  try {
    console.log('🔍 Checking Facebook authentication tokens...');
    
    const facebookAuths = await db.FacebookAuth.findAll();
    
    for (const auth of facebookAuths) {
      if (auth.accessToken) {
        // Check if token is already encrypted
        if (!isEncrypted(auth.accessToken)) {
          console.log(`\n❌ Found unencrypted token for user ${auth.userId}`);
          console.log('   Token starts with:', auth.accessToken.substring(0, 10) + '...');
          
          // Option 1: Clear the token (user will need to reconnect)
          console.log('   🗑️  Clearing invalid token - user will need to reconnect Facebook');
          await auth.update({ 
            accessToken: null,
            isActive: false 
          });
          
          // Option 2: If you want to encrypt the existing token instead, uncomment below:
          // const encryptedToken = encryptToken(auth.accessToken);
          // await auth.update({ accessToken: encryptedToken });
          // console.log('   ✅ Token encrypted successfully');
        } else {
          console.log(`✅ Token for user ${auth.userId} is already encrypted`);
        }
      }
    }
    
    console.log('\n✨ Token fix complete!');
    console.log('📌 Users with cleared tokens will need to reconnect their Facebook accounts.');
    
  } catch (error) {
    console.error('Error fixing tokens:', error);
  } finally {
    await db.sequelize.close();
  }
}

// Run the fix
fixTokens();