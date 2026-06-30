const axios = require('axios');

const META_WA_URL = process.env.META_WA_URL || 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages';
const META_WA_TOKEN = process.env.META_WA_TOKEN;

// In a real production scenario, use actual Meta APIs. 
// If token is missing, we log it to DB (which acts as our system log).
const sendWhatsAppMessage = async (toPhone, messageText) => {
  if (!META_WA_TOKEN || META_WA_TOKEN === 'your_meta_token_here') {
    console.log(`[WhatsApp Simulation] To: ${toPhone} | Message: ${messageText}`);
    return { status: 'simulated', to: toPhone };
  }

  try {
    const response = await axios.post(
      META_WA_URL,
      {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: messageText }
      },
      {
        headers: {
          'Authorization': `Bearer ${META_WA_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[WhatsApp Sent] To: ${toPhone}`);
    return { status: 'success', data: response.data };
  } catch (err) {
    console.error(`[WhatsApp Error] Failed to send to ${toPhone}:`, err.response?.data || err.message);
    throw new Error('WhatsApp dispatch failed');
  }
};

module.exports = { sendWhatsAppMessage };
