const express = require('express');
const { PrismaClient } = require('@prisma/client');
const productsRoutes = require('./routes/productsRoutes');
const ordersRoutes = require('./routes/ordersRoutes');
const clientsRoutes = require('./routes/clientsRoutes');
const systemControllers = require('./controllers/systemControllers');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.use('/products', productsRoutes);
app.use('/orders', ordersRoutes);
app.use('/clients', clientsRoutes);

// Rotas do sistema
app.get('/status', systemControllers.listStatus);
app.post('/status', systemControllers.createStatus);
app.get('/payment-types', systemControllers.listPaymentTypes);
app.post('/payment-types', systemControllers.createPaymentType);

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/', (req, res) => res.send('Welcome to the API! Use /products, /orders, /clients, /status or /payment-types to interact with the endpoints.'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.message || 'Intern Error!' });
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
