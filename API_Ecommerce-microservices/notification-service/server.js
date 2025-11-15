const express = require('express');
const { RabbitMQClient, EVENTS } = require('./rabbitmq-client.js');
const { dispatchNotification } = require('./notificationHandler.js');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

// Instância do cliente RabbitMQ
let rabbitMQClient = null;

/**
 * Inicializa o consumer de eventos do RabbitMQ
 * 
 * Este processo:
 * 1. Conecta ao RabbitMQ
 * 2. Se subscreve aos eventos de interesse (order.created, order.paid, order.failed, payment.processed)
 * 3. Fica escutando por novas mensagens indefinidamente
 * 4. Quando uma mensagem é recebida, despacheia para o handler apropriado
 */
async function initializeEventConsumers() {
  try {
    rabbitMQClient = new RabbitMQClient();
    await rabbitMQClient.connect();

    // Subscrever aos eventos de interesse
    const eventTypes = [
      EVENTS.ORDER_CREATED,
      EVENTS.ORDER_PAID,
      EVENTS.ORDER_FAILED,
      EVENTS.PAYMENT_PROCESSED
    ];

    for (const eventType of eventTypes) {
      // Cada tipo de evento tem seu próprio consumer
      rabbitMQClient.consumeEvent(eventType, async (event) => {
        await dispatchNotification(event);
      });
    }

    console.log('✓ Consumidores de eventos inicializados com sucesso');
  } catch (error) {
    console.error('✗ Erro ao inicializar consumidores:', error);
    // Tentar reconectar em 5 segundos
    setTimeout(initializeEventConsumers, 5000);
  }
}

// Inicializar consumidores quando o servidor inicia
initializeEventConsumers();

/**
 * Endpoint para receber notificações push diretas (sem passar pelo RabbitMQ)
 * 
 * Uso: Para testes manuais ou integração com outros sistemas
 * POST /v1/notifications
 * Body: { clientId, title, message }
 */
app.post('/v1/notifications', (req, res) => {
  const { clientId, title, message } = req.body;
  
  if (!clientId || !title || !message) {
    return res.status(400).json({ 
      erro: 'clientId, title e message são obrigatórios' 
    });
  }

  // Simula envio de push
  console.log(`\n📤 [PUSH DIRETO] Notificação para cliente ${clientId}:`);
  console.log(`   Título: ${title}`);
  console.log(`   Mensagem: ${message}`);
  console.log('');

  res.json({ 
    success: true, 
    message: 'Notificação enviada (simulada)',
    notification: { clientId, title, message }
  });
});

/**
 * Health check do serviço
 * 
 * Retorna informações sobre o status atual do Notification Service
 */
app.get('/health', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'ok',
    uptime: process.uptime(),
    rabbitmq: rabbitMQClient?.isConnected ? 'connected' : 'disconnected'
  });
});

/**
 * Info do serviço
 */
app.get('/', (req, res) => {
  res.send(`
    <h1>Notification Service</h1>
    <p>Serviço responsável por enviar notificações aos clientes.</p>
    <h2>Funcionamento:</h2>
    <ul>
      <li>Consome eventos do RabbitMQ (order.created, order.paid, order.failed, payment.processed)</li>
      <li>Processa eventos e envia notificações push aos clientes</li>
      <li>Suporta notificações diretas via POST /v1/notifications</li>
    </ul>
    <p><a href="/health">Status do Serviço</a></p>
  `);
});

/**
 * Tratamento de erros genérico
 */
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(err.status || 500).json({ 
    erro: err.message || 'Erro interno do servidor' 
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Notification Service rodando na porta ${PORT}`);
  console.log(`📡 Aguardando eventos do RabbitMQ...`);
  console.log(`🔗 http://localhost:${PORT}\n`);
});

/**
 * Graceful shutdown
 * 
 * Quando o processo recebe sinal de término (SIGTERM):
 * 1. Desconecta do RabbitMQ
 * 2. Fecha o servidor Express
 * 3. Finaliza o processo
 */
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM recebido, encerrando gracefully...');
  if (rabbitMQClient) {
    await rabbitMQClient.disconnect();
  }
  server.close(() => {
    console.log('✓ Servidor encerrado');
    process.exit(0);
  });
});

/**
 * Tratamento de erros não capturados
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', promise, 'motivo:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

module.exports = { app };

