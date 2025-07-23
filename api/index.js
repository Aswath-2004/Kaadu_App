// api/index.js
const express = require('express');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

const app = express();
app.use(express.json());

// CORS configuration (allow requests from any origin for development)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware to extract and set WooCommerce credentials
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid.' });
  }

  const encoded = authHeader.split(' ')[1];
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const [consumerKey, consumerSecret] = decoded.split(':');

  if (!consumerKey || !consumerSecret) {
    return res.status(401).json({ message: 'Consumer Key or Secret missing from Authorization header.' });
  }

  // Initialize WooCommerce API instance for this request
  req.wcApi = new WooCommerceRestApi({
    url: process.env.WOO_COMMERCE_URL || 'https://kaaduorganics.com', // Your WooCommerce store URL
    consumerKey: consumerKey,
    consumerSecret: consumerSecret,
    version: 'wc/v3',
    queryStringAuth: true, // Force basic authentication over query string
  });
  next();
});

// Proxy endpoint for products
app.get('/products', async (req, res) => {
  try {
    const { data } = await req.wcApi.get('products', req.query);
    res.json(data);
  } catch (error) {
    console.error('Error fetching products:', error.response ? error.response.data : error.message);
    res.status(error.response ? error.response.status : 500).json({
      code: error.response ? error.response.data.code : 'proxy_error',
      message: error.response ? error.response.data.message : 'Internal Server Error',
      data: error.response ? error.response.data.data : null,
    });
  }
});

// Proxy endpoint for product categories
app.get('/products/categories', async (req, res) => {
  try {
    const { data } = await req.wcApi.get('products/categories', req.query);
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error.response ? error.response.data : error.message);
    res.status(error.response ? error.response.status : 500).json({
      code: error.response ? error.response.data.code : 'proxy_error',
      message: error.response ? error.response.data.message : 'Internal Server Error',
      data: error.response ? error.response.data.data : null,
    });
  }
});

// Add other WooCommerce API endpoints as needed (e.g., orders, customers)
// Example for creating an order (POST request)
app.post('/orders', async (req, res) => {
  try {
    const { data } = await req.wcApi.post('orders', req.body);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating order:', error.response ? error.response.data : error.message);
    res.status(error.response ? error.response.status : 500).json({
      code: error.response ? error.response.data.code : 'proxy_error',
      message: error.response ? error.response.data.message : 'Internal Server Error',
      data: error.response ? error.response.data.data : null,
    });
  }
});

// Export the app for Vercel serverless function deployment
module.exports = app;
