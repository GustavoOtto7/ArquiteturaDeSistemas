const express = require('express');
const mongoose = require('mongoose');
const ordersRoutes = require('./routes/ordersRoutes');
const { RabbitMQClient } = require('./shared/rabbitmq-client');
const ordersServices = require('./services/ordersServices');

const app = express();
app.use(express.json());

// Instância do cliente RabbitMQ para publicar eventos
let rabbitMQClient = null;

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

// Inicializar RabbitMQ
async function initializeRabbitMQ() {
  try {
    rabbitMQClient = new RabbitMQClient();
    await rabbitMQClient.connect();
    // Passar a instância do RabbitMQ para o serviço
    ordersServices.setRabbitMQClient(rabbitMQClient);
    console.log('✓ RabbitMQ inicializado no Orders Service');
  } catch (error) {
    console.error('✗ Erro ao inicializar RabbitMQ:', error);
    // Continuar mesmo sem RabbitMQ, funcionará sem eventos
  }
}

initializeRabbitMQ();

app.use('/v1/orders', ordersRoutes);

app.get('/health', (req, res) => res.json({ 
  service: 'orders-service',
  status: 'ok', 
  uptime: process.uptime(),
  database: 'MongoDB',
  rabbitMQ: rabbitMQClient?.isConnected ? 'connected' : 'disconnected'
}));

app.get('/', (req, res) => res.send('Orders Service - Use /v1/orders to interact with orders.'));

app.use((err, req, res, next) => {
  console.error(err);
  
  // Trata erros de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ erro: 'Dados JSON inválidos' });
  }
  
  res.status(err.status || 500).json({ erro: err.message || 'Internal Error!' });
});

const PORT = process.env.PORT || 3003;
const server = app.listen(PORT, () => console.log(`Orders Service running on http://localhost:${PORT}`));

// Graceful shutdown para desconectar RabbitMQ
process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando gracefully...');
  if (rabbitMQClient) {
    await rabbitMQClient.disconnect();
  }
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});
