require('dotenv').config();
const express = require('express');
const cors = require('cors');
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const { camelToSnake } = require('./utils/caseConverter'); // helper

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json());

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = camelToSnake(req.body);
  }
  next();
});

app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// Documentation page for UI developers
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Water Purifier API Docs</title>
  <style>
    body { font-family: 'Arial', sans-serif; background: #f0f4f8; margin: 0; padding: 0; }
    h1 { text-align: center; color: #0077cc; margin: 20px 0; }
    .endpoint { background: #fff; border-radius: 10px; margin: 10px auto; padding: 20px; width: 90%; max-width: 700px; box-shadow: 0 6px 15px rgba(0,0,0,0.1); transition: transform 0.3s; cursor: pointer; }
    .endpoint:hover { transform: translateY(-5px); box-shadow: 0 12px 25px rgba(0,0,0,0.2); }
    .method { font-weight: bold; padding: 2px 6px; border-radius: 5px; color: white; display: inline-block; margin-bottom: 5px; }
    .GET { background: #28a745; }
    .POST { background: #007bff; }
    .PUT { background: #ffc107; color: #333; }
    .DELETE { background: #dc3545; }
    .description { display: none; margin-top: 10px; color: #555; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    strong { color: #333; }
  </style>
</head>
<body>
  <h1>Water Purifier API Documentation</h1>

  <!-- PRODUCTS -->
  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method GET">GET</span> /api/products
    <div class="description">
      <strong>Description:</strong> List all products.<br>
      <strong>Response Example:</strong>
      <pre>[
  {
    "id": 1,
    "name": "AquaPure RO Purifier",
    "brandName": "AquaPure",
    "buyingPrice": 12000,
    "sellingPrice": 15000,
    "vendorPrice": 10000,
    "quantity": 10,
    "date": "2025-09-01",
    "images": [],
    "isTopSelling": false,
    "isFeatured": true,
    "isBudgetFriendly": false,
    "customFields": []
  }
]</pre>
    </div>
  </div>

  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method GET">GET</span> /api/products/:id
    <div class="description">
      <strong>Description:</strong> Get a product by ID.<br>
      <strong>Response Example:</strong>
      <pre>{
  "id": 1,
  "name": "AquaPure RO Purifier",
  "brandName": "AquaPure",
  "buyingPrice": 12000,
  "sellingPrice": 15000,
  "vendorPrice": 10000,
  "quantity": 10,
  "date": "2025-09-01",
  "images": [],
  "isTopSelling": false,
  "isFeatured": true,
  "isBudgetFriendly": false,
  "customFields": []
}</pre>
    </div>
  </div>

  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method POST">POST</span> /api/products
    <div class="description">
      <strong>Description:</strong> Create a new product (Admin only).<br>
      <strong>Request Body Example:</strong>
      <pre>{
  "name": "Sample",
  "brandName": "Aqua",
  "buyingPrice": 1000,
  "sellingPrice": 1200,
  "vendorPrice": 900,
  "quantity": 5,
  "date": "2025-09-17",
  "images": [],
  "isTopSelling": false,
  "isFeatured": true,
  "isBudgetFriendly": false,
  "customFields": []
}</pre>
      <strong>Response Example:</strong>
      <pre>{
  "id": 101,
  "name": "Sample",
  "brandName": "Aqua",
  ...
}</pre>
    </div>
  </div>

  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method PUT">PUT</span> /api/products/:id
    <div class="description">
      <strong>Description:</strong> Update a product (Admin only).<br>
      <strong>Request Body Example:</strong>
      <pre>{
  "name": "Updated Sample",
  "brandName": "Aqua",
  "buyingPrice": 1200,
  "sellingPrice": 1500,
  "vendorPrice": 1000,
  "quantity": 10,
  "date": "2025-09-17",
  "images": [],
  "isTopSelling": false,
  "isFeatured": true,
  "isBudgetFriendly": false,
  "customFields": []
}</pre>
    </div>
  </div>

  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method DELETE">DELETE</span> /api/products/:id
    <div class="description">
      <strong>Description:</strong> Delete a product (Admin only).<br>
      <strong>Response Example:</strong>
      <pre>{
  "deleted": true,
  "product": {
    "id": 101,
    "name": "Sample",
    ...
  }
}</pre>
    </div>
  </div>

  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method GET">GET</span> /api/products/search
    <div class="description">
      <strong>Description:</strong> Search products by name, feature, or custom fields.<br>
      <strong>Query Parameters:</strong>
      <pre>?name=&feature=&fieldKey=&fieldValue=</pre>
      <strong>Response Example:</strong>
      <pre>[
  {
    "id": 1,
    "name": "AquaPure RO Purifier",
    ...
  }
]</pre>
    </div>
  </div>

  <!-- AUTH -->
  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method POST">POST</span> /api/auth/register
    <div class="description">
      <strong>Description:</strong> Register a new user.<br>
      <strong>Request Body Example:</strong>
      <pre>{
  "username": "user1",
  "password": "pass123"
}</pre>
      <strong>Response Example:</strong>
      <pre>{
  "message": "User registered successfully"
}</pre>
    </div>
  </div>

  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method POST">POST</span> /api/auth/login
    <div class="description">
      <strong>Description:</strong> Login user and get JWT token.<br>
      <strong>Request Body Example:</strong>
      <pre>{
  "username": "user1",
  "password": "pass123"
}</pre>
      <strong>Response Example:</strong>
      <pre>{
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}</pre>
    </div>
  </div>

  <div class="endpoint" onclick="toggleDesc(this)">
    <span class="method POST">POST</span> /api/auth/refresh
    <div class="description">
      <strong>Description:</strong> Refresh JWT token.<br>
      <strong>Request Body Example:</strong>
      <pre>{
  "token": "refresh_token_here"
}</pre>
      <strong>Response Example:</strong>
      <pre>{
  "token": "new_jwt_token_here"
}</pre>
    </div>
  </div>

  <script>
    function toggleDesc(el) {
      const desc = el.querySelector('.description');
      desc.style.display = desc.style.display === 'block' ? 'none' : 'block';
    }
  </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

