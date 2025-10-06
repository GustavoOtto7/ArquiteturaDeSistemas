const express = require('express');
const { PrismaClient } = require('@prisma/client');
const clientsRoutes = require('./routes/clientsRoutes');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.use('/v1/clients', clientsRoutes);

app.get('/health', (req, res) => res.json({ 
  service: 'clients-service',
  status: 'ok', 
  uptime: process.uptime() 
}));

app.get('/', (req, res) => res.send('Clients Service - Use /v1/clients to interact with clients.'));

app.use((err, req, res, next) => {
  console.error(err);
  
  // Trata erros de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ erro: 'Dados JSON inválidos' });
  }
  
  res.status(err.status || 500).json({ erro: err.message || 'Internal Error!' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Clients Service running on http://localhost:${PORT}`));