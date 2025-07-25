// api/index.js
// This file acts as a proxy for your WooCommerce REST API.
// It helps to bypass CORS issues and securely handle your API keys.

const express = require('express');
const fetch = require('node-fetch'); // Use node-fetch for making HTTP requests
const cors = require('cors'); // For handling Cross-Origin Resource Sharing

const app = express();

// Enable CORS for all origins. In a production environment, you might want to restrict this.
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Your WooCommerce Store URL
// IMPORTANT: Replace with your actual WooCommerce store URL
const WOOCOMMERCE_STORE_URL = 'https://kaaduorganics.com'; // <--- REPLACE THIS!

// Proxy endpoint
// This endpoint will catch all requests starting with /api/proxy/
// and forward them to your WooCommerce REST API.
app.all('/api/proxy/*', async (req, res) => {
    try {
        // Extract the WooCommerce API endpoint from the request URL
        // e.g., if request is /api/proxy/products, endpoint is products
        const wooCommerceEndpoint = req.params[0];

        // Construct the full WooCommerce API URL
        // Example: https://yourstore.com/wp-json/wc/v3/products
        const wooCommerceApiUrl = `${WOOCOMMERCE_STORE_URL}/wp-json/wc/v3/${wooCommerceEndpoint}`;

        // Get the Authorization header from the incoming request
        // This header contains the base64 encoded consumer_key:consumer_secret
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header missing.' });
        }

        // Forward the request to the WooCommerce API
        const response = await fetch(wooCommerceApiUrl, {
            method: req.method, // Use the same HTTP method as the incoming request
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader, // Forward the Authorization header
                // Add any other headers if necessary
            },
            // For POST/PUT requests, include the body
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
        });

        // Check if the response from WooCommerce was successful
        if (response.ok) {
            const data = await response.json();
            res.status(response.status).json(data);
        } else {
            // If WooCommerce returned an error, forward that error
            const errorData = await response.json();
            console.error('WooCommerce API Error:', response.status, errorData);
            res.status(response.status).json({
                code: errorData.code,
                message: errorData.message,
                data: errorData.data,
            });
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// For Vercel, you need to export the app
module.exports = app;
