// api/index.js
// This is a Vercel Serverless Function acting as a proxy for WooCommerce API.

const fetch = require('node-fetch'); // For making HTTP requests in Node.js

// IMPORTANT: Replace with your actual WooCommerce Consumer Key and Secret
// These should be set as Environment Variables in Vercel for security.
// For testing, you can hardcode them here, but NEVER do this in production.
const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || 'ck_dd8d6bcd7e5c426609d192e8f9088b0cb55b1db4'; // <-- REPLACE THIS
const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || 'cs_5f2739e4fa312f94e38dd0983da45ce4cd3c2aa1'; // <-- REPLACE THIS

// Your actual WooCommerce base URL
const WOOCOMMERCE_SITE_URL = 'https://kaaduorganics.com';

module.exports = async (req, res) => {
  // Extract the path from the incoming request (e.g., /products, /products/categories)
  // req.url will be something like '/api/products' or '/api/products/categories'
  // We need to remove the '/api' prefix.
  const path = req.url.replace('/api', '');

  // Construct the full WooCommerce API URL
  // Example: https://kaaduorganics.com/wp-json/wc/v3/products
  const targetUrl = `${WOOCOMMERCE_SITE_URL}/wp-json/wc/v3${path}`;

  // Encode Consumer Key and Secret for Basic Authentication
  const authString = Buffer.from(`${WOOCOMMERCE_CONSUMER_KEY}:${WOOCOMMERCE_CONSUMER_SECRET}`).toString('base64');

  try {
    // Forward the request to WooCommerce, explicitly using the imported 'fetch'
    const response = await fetch(targetUrl, { // <--- FIXED: Using imported 'fetch'
      method: req.method, // Use the same HTTP method as the incoming request (GET, POST, etc.)
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        // Forward other relevant headers if needed, e.g., 'User-Agent'
      },
      // For POST, PUT, PATCH requests, include the body
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Set the response status code and headers from the WooCommerce response
    res.status(response.status);
    response.headers.forEach((value, name) => {
      // Avoid setting duplicate or problematic headers
      if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    // Send the WooCommerce response body back to the client
    const data = await response.json(); // Assuming JSON response from WooCommerce
    res.json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      code: 'proxy_error',
      message: 'Failed to proxy request to WooCommerce.',
      details: error.message,
    });
  }
};
