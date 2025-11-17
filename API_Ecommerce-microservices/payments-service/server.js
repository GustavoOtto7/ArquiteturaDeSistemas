const express = require('express');
const { PrismaClient } = require('@prisma/client');
const paymentsRoutes = require('./routes/paymentsRoutes');
const { KafkaConsumer, TOPICS } = require('./shared/kafka-client');
const paymentsServices = require('./services/paymentsServices');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

let kafkaConsumer = null;

app.use('/v1/payments', paymentsRoutes);

app.get('/health', (req, res) => res.json({ 
  service: 'payments-service',
  status: 'ok', 
  uptime: process.uptime(),
  kafka: kafkaConsumer ? 'connected' : 'disconnected'
}));

app.get('/', (req, res) => res.send('Payments Service - Use /v1/payments to interact with payments. Kafka consumer active.'));

app.use((err, req, res, next) => {
  console.error(err);
  
  // Trata erros de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ erro: 'Dados JSON inválidos' });
  }
  
  res.status(err.status || 500).json({ erro: err.message || 'Internal Error!' });
});

const PORT = process.env.PORT || 3004;

/**
 * Handler para processar eventos de pedidos criados recebidos do Kafka
 * @param {Object} event - Evento contendo dados do pedido (orderId, clientId, total, items, etc)
 */
async function handleOrderCreatedEvent(event) {
  try {
    console.log('📨 [Kafka Consumer] Evento orders.created recebido:', event);
    
    // Extrair dados relevantes do evento
    const { orderId, clientId, total, items = [] } = event;
    
    if (!orderId || !clientId || !total) {
      console.error('❌ Dados incompletos no evento:', event);
      return;
    }

    // Processar o pagamento usando a lógica existente
    // Aqui você pode chamar a service de pagamentos para criar um pagamento correspondente
    console.log(`✅ Processando pagamento para pedido ${orderId} do cliente ${clientId}`);
    console.log(`   Total a pagar: R$ ${total}`);
    if (items.length > 0) {
      console.log(`   Itens: ${items.length} produto(s)`);
    }
    
    // TODO: Integrar com lógica de processamento de pagamento
    // const payment = await paymentsServices.createPaymentFromOrder({
    //   orderId,
    //   clientId,
    //   total,
    //   items
    // });
    
  } catch (error) {
    console.error('❌ Erro ao processar evento orders.created:', error);
  }
}

/**
 * Inicializa o servidor e conecta com Kafka Consumer
 */
async function startServer() {
  try {
    // Inicializar Kafka Consumer
    kafkaConsumer = new KafkaConsumer();
    console.log('🔄 Conectando ao Kafka...');
    await kafkaConsumer.connect();
    console.log('✅ Kafka Consumer conectado!');
    
    // Subscrever ao tópico orders.created
    console.log(`📡 Inscrito ao tópico: ${TOPICS.ORDERS_CREATED}`);
    await kafkaConsumer.subscribeToTopic(TOPICS.ORDERS_CREATED, handleOrderCreatedEvent);
    
    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log(`\n✨ Payments Service iniciado em http://localhost:${PORT}`);
      console.log(`📨 Ouvindo eventos Kafka no tópico: ${TOPICS.ORDERS_CREATED}\n`);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM recebido, encerrando gracefully...');
  if (kafkaConsumer) {
    await kafkaConsumer.disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT recebido, encerrando gracefully...');
  if (kafkaConsumer) {
    await kafkaConsumer.disconnect();
  }
  process.exit(0);
});

// Iniciar o servidor
startServer();