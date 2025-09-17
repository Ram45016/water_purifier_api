require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');  // 🔹 New auth routes

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter); // 🔹 Register/Login endpoints

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'API is running 🚀' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
