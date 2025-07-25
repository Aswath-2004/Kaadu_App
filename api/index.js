// api/index.js
// This is a Vercel Serverless Function acting as a proxy for WooCommerce API.

const axios = require('axios'); 
// IMPORTANT: Replace with your actual WooCommerce Consumer Key and Secret
// These should be set as Environment Variables in Vercel for security.
// If not set as environment variables, the default values will be used.
const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || 'YOUR_WOOCOMMERCE_CONSUMER_KEY_PLACEHOLDER'; // <-- ENSURE THIS IS REPLACED OR SET IN VERCEL ENV
const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || 'YOUR_WOOCOMMERCE_CONSUMER_SECRET_PLACEHOLDER'; // <-- ENSURE THIS IS REPLACED OR SET IN VERCEL ENV

// Your actual WooCommerce base URL
const WOOCOMMERCE_SITE_URL = 'https://kaaduorganics.com'; // <--- REPLACE THIS WITH YOUR ACTUAL WOOCOMMERCE STORE URL

module.exports = async (req, res) => {
  console.log('--- Vercel Proxy Function Invoked ---');
  console.log(`Request Method: ${req.method}`);
  console.log(`Incoming Request URL: ${req.url}`);

  // Set CORS headers to allow your Flutter app to access this function
  res.setHeader('Access-Control-Allow-Origin', '*'); // In production, replace '*' with your Flutter app's domain
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
  }

  // Extract the path from the incoming request (e.g., /products, /products/categories)
  // req.url will be something like '/api/proxy/products' or '/api/proxy/products/categories?someParam=value'
  // We need to remove the '/api/proxy' prefix AND any query parameters from the path itself.
  const urlParts = req.url.split('?');
  const pathWithoutQuery = urlParts[0].replace('/api/proxy/', '');
  console.log(`Extracted API Path (cleaned): ${pathWithoutQuery}`);

  // Construct the full WooCommerce API URL.
  // We explicitly add req.query as parameters, so they aren't duplicated if already in the path.
  const targetUrl = `${WOOCOMMERCE_SITE_URL}/wp-json/wc/v3/${pathWithoutQuery}`;
  console.log(`Target WooCommerce URL (base): ${targetUrl}`);

  // Check if keys are loaded from environment variables or placeholders
  if (WOOCOMMERCE_CONSUMER_KEY === 'YOUR_WOOCOMMERCE_CONSUMER_KEY_PLACEHOLDER' || WOOCOMMERCE_CONSUMER_SECRET === 'YOUR_WOOCOMMERCE_CONSUMER_SECRET_PLACEHOLDER') {
    console.error('ERROR: WooCommerce API keys are not set as environment variables in Vercel!');
    return res.status(500).json({
      code: 'missing_api_keys',
      message: 'WooCommerce API keys are not configured on the Vercel server.',
      details: 'Please set WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET as environment variables in your Vercel project settings.'
    });
  }

  // Encode Consumer Key and Secret for Basic Authentication using Buffer
  const authString = Buffer.from(`${WOOCOMMERCE_CONSUMER_KEY}:${WOOCOMMERCE_CONSUMER_SECRET}`).toString('base64');
  console.log(`Auth String (masked): ${authString.substring(0, 10)}...`); // Log masked string for security

  try {
    // Prepare headers for WooCommerce request (Basic Auth)
    const headers = {
        'Authorization': `Basic ${authString}`,
        'Content-Type': req.headers['content-type'] || 'application/json', // Preserve original or default to JSON
    };

    let wooResponse;
    // Pass req.query directly as Axios params, it handles encoding
    const requestConfig = { headers, params: req.query }; 

    // Determine request body for non-GET/HEAD methods
    let requestBody = req.body; // Axios handles JSON bodies directly if Content-Type is application/json

    if (req.method === 'GET') {
        wooResponse = await axios.get(targetUrl, requestConfig);
    } else if (req.method === 'POST') {
        wooResponse = await axios.post(targetUrl, requestBody, requestConfig);
    } else if (req.method === 'PUT') {
        wooResponse = await axios.put(targetUrl, requestBody, requestConfig);
    } else if (req.method === 'DELETE') {
        wooResponse = await axios.delete(targetUrl, requestConfig);
    } else {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    console.log(`WooCommerce Response Status: ${wooResponse.status}`);
    console.log(`WooCommerce Response Data (first 500 chars): ${JSON.stringify(wooResponse.data).substring(0, 500)}...`);


    // Check for non-2xx responses from WooCommerce
    if (wooResponse.status < 200 || wooResponse.status >= 300) {
      console.error('WooCommerce API returned an error:', wooResponse.data);
      return res.status(wooResponse.status).json({
        code: 'woocommerce_api_error',
        message: `WooCommerce API responded with status ${wooResponse.status}`,
        details: wooResponse.data,
      });
    }

    // Forward WooCommerce response back to Flutter app
    console.log('Successfully proxied and returned data.');
    res.status(wooResponse.status).json(wooResponse.data);

  } catch (error) {
    console.error('CRITICAL PROXY ERROR:', error);
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('WooCommerce API Error Response (from Axios):', error.response.data);
        res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from WooCommerce API (from Axios)');
        res.status(503).json({ error: 'Service Unavailable: No response from WooCommerce API' });
    } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message, stack: error.stack });
    }
  }
};
