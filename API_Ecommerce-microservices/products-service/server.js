const express = require('express');
const { PrismaClient } = require('@prisma/client');
const productsRoutes = require('./routes/productsRoutes');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.use('/v1/products', productsRoutes);

app.get('/health', (req, res) => res.json({ 
  service: 'products-service',
  status: 'ok', 
  uptime: process.uptime() 
}));

app.get('/', (req, res) => res.send('Products Service - Use /v1/products to interact with products.'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.message || 'Internal Error!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Products Service running on http://localhost:${PORT}`));