const express = require('express');
const { PrismaClient } = require('@prisma/client');
const paymentsRoutes = require('./routes/paymentsRoutes');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.use('/v1/payments', paymentsRoutes);

app.get('/health', (req, res) => res.json({ 
  service: 'payments-service',
  status: 'ok', 
  uptime: process.uptime() 
}));

app.get('/', (req, res) => res.send('Payments Service - Use /v1/payments to interact with payments.'));

app.use((err, req, res, next) => {
  console.error(err);
  
  // Trata erros de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ erro: 'Dados JSON inválidos' });
  }
  
  res.status(err.status || 500).json({ erro: err.message || 'Internal Error!' });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Payments Service running on http://localhost:${PORT}`));