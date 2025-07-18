// api/proxy.js
const axios = require('axios');
const btoa = require('btoa'); // For Basic Auth encoding

// Your actual WooCommerce domain
const WOOCOMMERCE_BASE_URL = process.env.WOOCOMMERCE_SITE_URL;

// Retrieve Consumer Key and Secret from Vercel Environment Variables
const CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

module.exports = async (req, res) => {
    // Set CORS headers to allow your Flutter app to access this function
    res.setHeader('Access-Control-Allow-Origin', '*'); // In production, replace '*' with your Flutter app's domain
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    // Validate that keys are set
    if (!CONSUMER_KEY || !CONSUMER_SECRET || !WOOCOMMERCE_BASE_URL) {
        return res.status(500).json({ error: 'Server configuration error: WooCommerce keys or URL not set.' });
    }

    // Construct the full WooCommerce API URL
    // Vercel functions receive the full path, e.g., /api/proxy/products
    // We need to strip the /api/proxy part to get the actual WooCommerce endpoint
    const pathSegments = req.url.split('/');
    // Find the index of 'api' and 'proxy' (or your function name)
    const apiIndex = pathSegments.indexOf('api');
    const proxyIndex = pathSegments.indexOf('proxy'); // Or whatever you named your file, e.g., 'woocommerce'

    let wooPath = '';
    if (apiIndex !== -1 && proxyIndex !== -1 && proxyIndex + 1 < pathSegments.length) {
        // Reconstruct path from after the function name
        wooPath = '/' + pathSegments.slice(proxyIndex + 1).join('/');
    } else {
        // Fallback if path parsing fails, or if you call it directly without sub-paths
        wooPath = req.url.replace('/api/proxy', ''); // Adjust if your function name is different
    }


    const wooApiUrl = `${WOOCOMMERCE_BASE_URL}/wp-json/wc/v3${wooPath}`;

    // Prepare headers for WooCommerce request (Basic Auth)
    const authHeader = `Basic ${btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        // Add any other headers your WooCommerce API might need
    };

    try {
        let wooResponse;
        const requestConfig = { headers, params: req.query }; // req.query contains URL parameters

        if (req.method === 'GET') {
            wooResponse = await axios.get(wooApiUrl, requestConfig);
        } else if (req.method === 'POST') {
            wooResponse = await axios.post(wooApiUrl, req.body, requestConfig);
        } else if (req.method === 'PUT') {
            wooResponse = await axios.put(wooApiUrl, req.body, requestConfig);
        } else if (req.method === 'DELETE') {
            wooResponse = await axios.delete(wooApiUrl, requestConfig);
        } else {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        // Forward WooCommerce response back to Flutter app
        res.status(wooResponse.status).json(wooResponse.data);

    } catch (error) {
        console.error('Error proxying WooCommerce request:', error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('WooCommerce API Error Response:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from WooCommerce API');
            res.status(503).json({ error: 'Service Unavailable: No response from WooCommerce API' });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Request setup error:', error.message);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};