require('dotenv').config();
const express = require('express');
const cors = require('cors');
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// Custom animated API documentation
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>🚀 Water Purifier API</title>
      <style>
        body { font-family: 'Arial', sans-serif; background: #f0f4f8; margin: 0; padding: 0; }
        h1 { text-align: center; color: #0077cc; margin-top: 30px; }
        .container { display: flex; flex-wrap: wrap; justify-content: center; margin: 20px; }
        .card { background: #fff; border-radius: 10px; box-shadow: 0 6px 15px rgba(0,0,0,0.1); margin: 15px; padding: 20px; width: 250px; transition: transform 0.3s, box-shadow 0.3s; }
        .card:hover { transform: translateY(-10px); box-shadow: 0 12px 25px rgba(0,0,0,0.2); }
        h2 { color: #333; font-size: 18px; margin-top: 0; }
        p { color: #555; font-size: 14px; }
        code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>🚀 Water Purifier API Documentation</h1>
      <div class="container">
        <div class="card">
          <h2>GET /api/products</h2>
          <p>List all products</p>
        </div>
        <div class="card">
          <h2>GET /api/products/:id</h2>
          <p>Get product by ID</p>
        </div>
        <div class="card">
          <h2>POST /api/products</h2>
          <p>Create new product <code>(Admin only)</code></p>
        </div>
        <div class="card">
          <h2>PUT /api/products/:id</h2>
          <p>Update product <code>(Admin only)</code></p>
        </div>
        <div class="card">
          <h2>DELETE /api/products/:id</h2>
          <p>Delete product <code>(Admin only)</code></p>
        </div>
        <div class="card">
          <h2>GET /api/products/search</h2>
          <p>Search products by name, feature, or custom field</p>
        </div>
        <div class="card">
          <h2>POST /api/auth/register</h2>
          <p>Register new user</p>
        </div>
        <div class="card">
          <h2>POST /api/auth/login</h2>
          <p>Login user</p>
        </div>
        <div class="card">
          <h2>POST /api/auth/refresh</h2>
          <p>Refresh JWT token</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
