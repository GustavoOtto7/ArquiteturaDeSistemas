const express = require('express');
const mongoose = require('mongoose');
const ordersRoutes = require('./routes/ordersRoutes');

const app = express();
app.use(express.json());

// Connect to MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://admin:password@localhost:27017/orders_db?authSource=admin';

mongoose.connect(MONGODB_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

app.use('/v1/orders', ordersRoutes);

app.get('/health', (req, res) => res.json({ 
  service: 'orders-service',
  status: 'ok', 
  uptime: process.uptime(),
  database: 'MongoDB'
}));

app.get('/', (req, res) => res.send('Orders Service - Use /v1/orders to interact with orders.'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.message || 'Internal Error!' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Orders Service running on http://localhost:${PORT}`));