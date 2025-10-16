const express = require('express');
const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

// Endpoint para receber notificações push
app.post('/v1/notifications', (req, res) => {
  const { clientId, title, message } = req.body;
  // Simula envio de push
  console.log(`[PUSH] Notificação para cliente ${clientId}: ${title} - ${message}`);
  res.json({ success: true, message: 'Notificação enviada (simulada)' });
});

app.get('/health', (req, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`Notification Service rodando na porta ${PORT}`);
});
