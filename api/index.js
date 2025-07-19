// api/index.js
const axios = require('axios');
const btoa = require('btoa'); // For Basic Authentication

// Replace with your actual WooCommerce site URL and API Keys
// !!! WARNING: DO NOT USE THESE DIRECTLY IN PRODUCTION CLIENT-SIDE APPS !!!
// Use environment variables or a more secure proxy setup for production.
const WOOCOMMERCE_BASE_URL = 'https://kaaduorganics.com'; // Your WordPress/WooCommerce base URL

// IMPORTANT: For production, store these in Vercel Environment Variables
// and access them via process.env.CONSUMER_KEY, process.env.CONSUMER_SECRET
const CONSUMER_KEY = 'ck_YOUR_CONSUMER_KEY'; // Replace with your actual Consumer Key
const CONSUMER_SECRET = 'cs_YOUR_CONSUMER_SECRET'; // Replace with your actual Consumer Secret

// Basic Authentication Header
const authHeader = 'Basic ' + btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

module.exports = async (req, res) => {
    // Log the incoming request path for debugging
    console.log(`Incoming request path: ${req.url}`);

    // Extract the path after /api/
    // For example, if req.url is /api/products/categories, apiPath will be /products/categories
    // We use req.url directly and ensure it starts with /wp-json/wc/v3
    // If the request is for /api, apiPath will be empty, leading to /wp-json/wc/v3
    // If the request is for /api/products/categories, apiPath will be /products/categories
    const apiPath = req.url.startsWith('/api') ? req.url.substring(4) : req.url; // Remove '/api' prefix

    // Construct the full WooCommerce API URL
    const fullWooCommerceUrl = `${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3${apiPath}`;

    // Log the target WooCommerce URL for debugging
    console.log(`Proxying request to: ${fullWooCommerceUrl}`);

    try {
        // Forward the request to WooCommerce
        const response = await axios({
            method: req.method, // Use the original request method (GET, POST, etc.)
            url: fullWooCommerceUrl,
            headers: {
                'Authorization': authHeader,
                'Content-Type': req.headers['content-type'] || 'application/json', // Preserve content-type
            },
            data: req.method !== 'GET' ? req.body : undefined, // Send body for non-GET requests
        });

        // Set the response status and headers from WooCommerce
        res.status(response.status).send(response.data);
    } catch (error) {
        console.error('Proxy error:', error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('WooCommerce response error:', error.response.data);
            res.status(error.response.status).send(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from WooCommerce:', error.request);
            res.status(500).send('No response received from WooCommerce API.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error setting up proxy request:', error.message);
            res.status(500).send('Error setting up proxy request.');
        }
    }
};
