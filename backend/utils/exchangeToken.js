const axios = require('axios');

/**
 * Exchange a short-lived Facebook token for a long-lived token
 * Short-lived tokens expire in ~2 hours
 * Long-lived tokens expire in ~60 days
 */
async function exchangeForLongLivedToken(shortLivedToken) {
  try {
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    
    console.log('Exchanging short-lived token for long-lived token...');
    
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken
      }
    });
    
    if (response.data.access_token) {
      console.log('Successfully obtained long-lived token');
      console.log('Long-lived token expires in:', response.data.expires_in, 'seconds');
      console.log('That\'s approximately', Math.floor(response.data.expires_in / 86400), 'days');
      
      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in || 5184000 // Default 60 days
      };
    }
    
    throw new Error('No access token in response');
    
  } catch (error) {
    console.error('Failed to exchange token:', error.response?.data || error.message);
    // Return original token if exchange fails
    return null;
  }
}

module.exports = { exchangeForLongLivedToken };