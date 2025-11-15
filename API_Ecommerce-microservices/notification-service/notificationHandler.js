/**
 * Handler de Notificações - Processa eventos do RabbitMQ
 * 
 * Este módulo é responsável por consumir eventos publicados pelo Orders Service
 * e enviar notificações aos clientes. A lógica segue o padrão de event-driven architecture:
 * 
 * 1. Subscrever a eventos específicos (order.created, order.paid, order.failed)
 * 2. Processar dados do evento
 * 3. Enviar notificações push/email aos clientes
 * 4. Reconhecer o processamento da mensagem
 */

/**
 * Trata evento de pedido criado
 * 
 * Fluxo:
 * - Cliente cria um novo pedido no Orders Service
 * - Orders Service publica evento "order.created"
 * - RabbitMQ roteia o evento para a fila de notificações
 * - Este handler processa e envia notificação de confirmação ao cliente
 * 
 * @param {Object} event - Evento recebido do RabbitMQ
 * @param {string} event.type - Tipo do evento (order.created)
 * @param {string} event.timestamp - Timestamp quando o evento foi criado
 * @param {Object} event.data - Dados do pedido
 * @param {string} event.data.orderId - ID único do pedido
 * @param {string} event.data.clientId - ID único do cliente
 * @param {number} event.data.total - Valor total do pedido
 * @param {string} event.data.status - Status atual (AGUARDANDO PAGAMENTO)
 * @param {number} event.data.itemsCount - Quantidade de itens no pedido
 */
const handleOrderCreated = async (event) => {
  console.log('\n📦 ========== EVENTO: Pedido Criado ==========');
  console.log(`   🆔 Pedido ID: ${event.data.orderId}`);
  console.log(`   👤 Cliente ID: ${event.data.clientId}`);
  console.log(`   💰 Valor Total: R$ ${event.data.total.toFixed(2)}`);
  console.log(`   📦 Quantidade de Itens: ${event.data.itemsCount}`);
  console.log(`   ⏰ Timestamp: ${event.timestamp}`);

  // Simular envio de notificação push
  const notificationPayload = {
    clientId: event.data.clientId,
    orderId: event.data.orderId,
    title: '✅ Pedido Criado com Sucesso!',
    message: `Seu pedido #${event.data.orderId} foi criado. Aguardando pagamento de R$ ${event.data.total.toFixed(2)}`,
    type: 'order.created',
    data: {
      orderId: event.data.orderId,
      total: event.data.total,
      itemsCount: event.data.itemsCount
    }
  };

  console.log(`\n📤 Enviando notificação Push:`);
  console.log(`   Título: ${notificationPayload.title}`);
  console.log(`   Mensagem: ${notificationPayload.message}`);

  // Aqui você poderia enviar para um serviço real de push (Firebase, OneSignal, etc)
  console.log(`\n✅ Notificação enviada para cliente ${event.data.clientId}`);
  console.log('==========================================\n');

  return notificationPayload;
};

/**
 * Trata evento de pedido pago com sucesso
 * 
 * Fluxo:
 * - Cliente efetua pagamento no Payments Service
 * - Payments Service atualiza status do pedido para "PAGO"
 * - Orders Service publica evento "order.paid"
 * - RabbitMQ roteia o evento para a fila de notificações
 * - Este handler processa e envia notificação de confirmação de pagamento
 * 
 * @param {Object} event - Evento recebido do RabbitMQ
 * @param {string} event.type - Tipo do evento (order.paid)
 * @param {string} event.timestamp - Timestamp quando o evento foi criado
 * @param {Object} event.data - Dados do pedido pago
 * @param {string} event.data.orderId - ID único do pedido
 * @param {string} event.data.clientId - ID único do cliente
 * @param {string} event.data.clientName - Nome do cliente
 * @param {number} event.data.total - Valor total pago
 * @param {string} event.data.status - Status (PAGO)
 */
const handleOrderPaid = async (event) => {
  // Formato exatamente como solicitado pelo professor:
  // "Nome: {nomeCliente} - ID: {idCliente}, seu pedido com ID ({IdPedido}) foi PAGO com sucesso e será despachado em breve"
  
  const logMessage = `Nome: ${event.data.clientName} - ID: ${event.data.clientId}, seu pedido com ID (${event.data.orderId}) foi PAGO com sucesso e será despachado em breve`;
  
  console.log(logMessage);

  // Criar payload de notificação para possível integração futura
  const notificationPayload = {
    clientId: event.data.clientId,
    clientName: event.data.clientName,
    orderId: event.data.orderId,
    title: '💳 Pagamento Confirmado!',
    message: logMessage,
    type: 'order.paid',
    data: {
      orderId: event.data.orderId,
      clientName: event.data.clientName,
      total: event.data.total,
      status: event.data.status
    }
  };

  return notificationPayload;
};

/**
 * Trata evento de falha no pagamento do pedido
 * 
 * Fluxo:
 * - Cliente tenta fazer pagamento no Payments Service
 * - Pagamento falha (cartão recusado, saldo insuficiente, etc)
 * - Payments Service publica evento "order.failed"
 * - RabbitMQ roteia o evento para a fila de notificações
 * - Este handler processa e envia notificação de falha com instruções
 * 
 * @param {Object} event - Evento recebido do RabbitMQ
 * @param {string} event.type - Tipo do evento (order.failed)
 * @param {string} event.timestamp - Timestamp quando o evento foi criado
 * @param {Object} event.data - Dados do pedido com falha
 * @param {string} event.data.orderId - ID único do pedido
 * @param {string} event.data.clientId - ID único do cliente
 * @param {number} event.data.total - Valor que falhou no pagamento
 * @param {string} event.data.status - Status (FALHA NO PAGAMENTO)
 */
const handleOrderFailed = async (event) => {
  console.log('\n❌ ========== EVENTO: Falha no Pagamento ==========');
  console.log(`   🆔 Pedido ID: ${event.data.orderId}`);
  console.log(`   👤 Cliente ID: ${event.data.clientId}`);
  console.log(`   💰 Valor Tentado: R$ ${event.data.total.toFixed(2)}`);
  console.log(`   ❌ Status: ${event.data.status}`);
  console.log(`   ⏰ Timestamp: ${event.timestamp}`);

  // Simular envio de notificação push
  const notificationPayload = {
    clientId: event.data.clientId,
    orderId: event.data.orderId,
    title: '❌ Falha no Pagamento',
    message: `Não conseguimos processar o pagamento de R$ ${event.data.total.toFixed(2)} para pedido #${event.data.orderId}. Tente novamente com outro método de pagamento.`,
    type: 'order.failed',
    data: {
      orderId: event.data.orderId,
      total: event.data.total,
      status: event.data.status
    }
  };

  console.log(`\n📤 Enviando notificação Push de ALERTA:`);
  console.log(`   Título: ${notificationPayload.title}`);
  console.log(`   Mensagem: ${notificationPayload.message}`);

  // Aqui você poderia enviar para um serviço real de push
  console.log(`\n✅ Notificação enviada para cliente ${event.data.clientId}`);
  console.log('================================================\n');

  return notificationPayload;
};

/**
 * Trata evento de pagamento processado
 * 
 * Fluxo:
 * - Payments Service processa um pagamento
 * - Publica evento "payment.processed"
 * - RabbitMQ roteia o evento para a fila de notificações
 * - Este handler processa e envia notificação com detalhes do pagamento
 * 
 * @param {Object} event - Evento recebido do RabbitMQ
 * @param {string} event.type - Tipo do evento (payment.processed)
 * @param {string} event.timestamp - Timestamp quando o evento foi criado
 * @param {Object} event.data - Dados do pagamento processado
 */
const handlePaymentProcessed = async (event) => {
  console.log('\n💰 ========== EVENTO: Pagamento Processado ==========');
  console.log(`   Dados do Pagamento: ${JSON.stringify(event.data, null, 2)}`);
  console.log(`   ⏰ Timestamp: ${event.timestamp}`);

  console.log(`\n✅ Pagamento processado com sucesso`);
  console.log('==================================================\n');

  return event.data;
};

/**
 * Dispatcher de eventos
 * 
 * Recebe um evento genérico e roteia para o handler apropriado
 * baseado no tipo de evento. Adiciona logging e tratamento de erros.
 * 
 * Handlers Disponíveis:
 * - order.created -> handleOrderCreated
 * - order.paid -> handleOrderPaid
 * - order.failed -> handleOrderFailed
 * - payment.processed -> handlePaymentProcessed
 * 
 * @param {Object} event - Evento recebido do RabbitMQ contendo:
 *   - type: tipo do evento
 *   - timestamp: quando foi criado
 *   - data: dados específicos do evento
 */
const dispatchNotification = async (event) => {
  try {
    console.log(`\n🔄 Roteando evento: ${event.type}`);

    switch (event.type) {
      case 'order.created':
        return await handleOrderCreated(event);

      case 'order.paid':
        return await handleOrderPaid(event);

      case 'order.failed':
        return await handleOrderFailed(event);

      case 'payment.processed':
        return await handlePaymentProcessed(event);

      default:
        console.warn(`⚠️  Tipo de evento desconhecido: ${event.type}`);
        return null;
    }
  } catch (error) {
    console.error(`❌ Erro ao processar evento ${event.type}:`, error);
    throw error;
  }
};

module.exports = {
  handleOrderCreated,
  handleOrderPaid,
  handleOrderFailed,
  handlePaymentProcessed,
  dispatchNotification
};
