const { Order, Status } = require('../models/Order');
const { validateOrderPayload } = require('../utils/validators');
const { createError } = require('../utils/errors');
const axios = require('../utils/axios-config');
const { RabbitMQClient, EVENTS } = require('../shared/rabbitmq-client');
const { KafkaClient, TOPICS } = require('../shared/kafka-client');

const CLIENTS_SERVICE_URL = process.env.CLIENTS_SERVICE_URL || 'http://localhost:3002';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3001';

// Inicializa cliente RabbitMQ para publicação de eventos
let rabbitMQClient = null;

// Inicializa cliente Kafka para publicação de eventos
let kafkaClient = null;

/**
 * Define a instância do cliente RabbitMQ
 * @param {RabbitMQClient} client - Instância do cliente RabbitMQ
 */
const setRabbitMQClient = (client) => {
  rabbitMQClient = client;
};

/**
 * Define a instância do cliente Kafka
 * @param {KafkaClient} client - Instância do cliente Kafka
 */
const setKafkaClient = (client) => {
  kafkaClient = client;
};

module.exports = {
  setRabbitMQClient,
  setKafkaClient,
  setRabbitMQClient,
  list: () => Order.find({ isDeleted: false }),
  obtain: (id) => Order.findOne({ _id: id, isDeleted: false }),
  create: async (payload, payments) => {
    validateOrderPayload(payload);

    // 1. Validar cliente
    try {
      const clientResponse = await axios.get(`${CLIENTS_SERVICE_URL}/v1/clients/${payload.clientId}/validate`);
      if (!clientResponse.data.valid) {
        throw createError(404, 'Client not found');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw createError(404, 'Client not found');
      }
      throw createError(500, 'Error validating client');
    }

    // 2. Buscar informações dos produtos e validar estoque
    const enrichedItems = [];
    let total = 0;

    try {
      for (const item of payload.items) {
        // Buscar informações do produto
        const productResponse = await axios.get(`${PRODUCTS_SERVICE_URL}/v1/products/${item.productId}`);
        const product = productResponse.data;

        if (!product) {
          throw createError(404, `Product ${item.productId} not found`);
        }

        // Verificar estoque
        if (product.stock < item.quantity) {
          throw createError(400, `Insufficient stock for product ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`);
        }
        // Criar item enriquecido com informações do produto
        const enrichedItem = {
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: product.price * item.quantity
        };
        enrichedItems.push(enrichedItem);
        total += enrichedItem.subtotal;
      }
    } catch (error) {
      if (error.status) throw error; // Re-throw our custom errors
      if (error.response?.status === 404) {
        throw createError(404, 'Product not found');
      }
      throw createError(500, 'Error fetching product information');
    }
    // 3. Reservar estoque dos produtos
    try {
      const stockCheckPayload = {
        products: enrichedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      };

      const stockResponse = await axios.post(`${PRODUCTS_SERVICE_URL}/v1/products/check-stock`, stockCheckPayload);

      if (!stockResponse.data.success) {
        throw createError(400, stockResponse.data.erro || 'Error reserving stock');
      }
    } catch (error) {
      if (error.status) throw error; // Re-throw our custom errors
      if (error.response?.status === 400) {
        throw createError(400, error.response.data.erro || 'Insufficient stock');
      }
      throw createError(500, 'Error checking stock');
    }
    // 4. Criar o pedido com os itens enriquecidos
    const orderData = {
      clientId: payload.clientId,
      status: 'AGUARDANDO PAGAMENTO',
      total,
      items: enrichedItems
    };

    const order = new Order(orderData);
    const savedOrder = await order.save();

    // 5. EVENTO: Publicar evento ORDER_CREATED para notificar outros serviços
    // Este evento será consumido pelo notification-service (RabbitMQ) e pelo payments-service (Kafka)
    if (rabbitMQClient) {
      try {
        await rabbitMQClient.publishEvent(EVENTS.ORDER_CREATED, {
          orderId: savedOrder._id.toString(),
          clientId: savedOrder.clientId,
          total: savedOrder.total,
          status: savedOrder.status,
          itemsCount: savedOrder.items.length,
          createdAt: savedOrder.createdAt
        });
      } catch (error) {
        console.error('Erro ao publicar evento ORDER_CREATED no RabbitMQ:', error);
        // Não interrompe o fluxo se o evento não puder ser publicado
      }
    }

    // 5b. EVENTO KAFKA: Publicar no Kafka também para o Payments Service consumir
    if (kafkaClient) {
      try {
        await kafkaClient.publishEvent(TOPICS.ORDERS_CREATED, {
          orderId: savedOrder._id.toString(),
          clientId: savedOrder.clientId,
          total: savedOrder.total,
          items: enrichedItems,
          itemsCount: savedOrder.items.length,
          createdAt: savedOrder.createdAt
        });
      } catch (error) {
        console.error('Erro ao publicar evento ORDER_CREATED no Kafka:', error);
        // Não interrompe o fluxo se o evento não puder ser publicado
      }
    }

    // 6. Se houver pagamentos, processar via payments-service
    if (payments && Array.isArray(payments) && payments.length > 0) {
      try {
        // O payments-service espera: { payments: [{typePaymentId, amount}] }
        const paymentsServiceUrl = process.env.PAYMENTS_SERVICE_URL || 'http://payments-service:3004';
        const response = await axios.post(`${paymentsServiceUrl}/v1/payments/${savedOrder._id}/process`, { payments });
        // Opcional: atualizar status do pedido localmente se necessário
        // return { order: savedOrder, paymentResult: response.data };
        // Para manter compatibilidade, retorna só o pedido
      } catch (error) {
        // Não impede a criação do pedido, mas loga o erro
        console.error('Erro ao processar pagamento inicial:', error.response?.data || error.message);
      }
    }

    return savedOrder;
  },
  
  getOrdersByClient: async (clientId) => {
    // Validar se o cliente existe
    try {
      const clientResponse = await axios.get(`${CLIENTS_SERVICE_URL}/v1/clients/${clientId}/validate`);
      if (!clientResponse.data.valid) {
        throw createError(404, 'Client not found');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw createError(404, 'Client not found');
      }
      throw createError(500, 'Error validating client');
    }
    
    return await Order.find({ 
      clientId,
      isDeleted: false 
    });
  },
  
  /**
   * Atualiza o status do pedido e publica evento correspondente
   * @param {string} orderId - ID do pedido
   * @param {string} statusName - Novo status do pedido
   * @returns {Object} Pedido atualizado
   */
  updateStatus: async (orderId, statusName) => {
    const updated = await Order.findOneAndUpdate(
      { _id: orderId, isDeleted: false },
      { status: statusName },
      { new: true }
    );
    
    if (!updated) throw createError(404, 'Order not found');

    // EVENTO: Publicar evento baseado no novo status do pedido
    if (rabbitMQClient) {
      try {
        let eventType = null;

        // Mapear status para eventos apropriados
        if (statusName === 'PAGO') {
          eventType = EVENTS.ORDER_PAID;
        } else if (statusName === 'FALHA NO PAGAMENTO' || statusName === 'CANCELADO') {
          eventType = EVENTS.ORDER_FAILED;
        }

        // Se há um evento correspondente, publicar
        if (eventType) {
          // 1. Buscar informações do cliente para enviar nome
          let clientName = 'Cliente';
          try {
            const clientResponse = await axios.get(
              `${CLIENTS_SERVICE_URL}/v1/clients/${updated.clientId}`
            );
            clientName = clientResponse.data.name || 'Cliente';
          } catch (error) {
            console.warn('⚠️ Não foi possível buscar nome do cliente, usando padrão');
          }

          // 2. Publicar evento com nome do cliente (RabbitMQ)
          await rabbitMQClient.publishEvent(eventType, {
            orderId: updated._id.toString(),
            clientId: updated.clientId,
            clientName: clientName,
            status: updated.status,
            total: updated.total,
            updatedAt: updated.updatedAt
          });
        }
      } catch (error) {
        console.error(`Erro ao publicar evento de status para pedido ${orderId} no RabbitMQ:`, error);
      }
    }

    // EVENTO KAFKA: Publicar no Kafka também para manter ambos brokers sincronizados
    if (kafkaClient) {
      try {
        let topicType = null;

        // Mapear status para tópicos Kafka apropriados
        if (statusName === 'PAGO') {
          topicType = TOPICS.ORDERS_PAID;
        } else if (statusName === 'FALHA NO PAGAMENTO' || statusName === 'CANCELADO') {
          topicType = TOPICS.ORDERS_FAILED;
        }

        // Se há um tópico correspondente, publicar
        if (topicType) {
          // 1. Buscar informações do cliente para enviar nome
          let clientName = 'Cliente';
          try {
            const clientResponse = await axios.get(
              `${CLIENTS_SERVICE_URL}/v1/clients/${updated.clientId}`
            );
            clientName = clientResponse.data.name || 'Cliente';
          } catch (error) {
            console.warn('⚠️ Não foi possível buscar nome do cliente, usando padrão');
          }

          // 2. Publicar evento no Kafka
          await kafkaClient.publishEvent(topicType, {
            orderId: updated._id.toString(),
            clientId: updated.clientId,
            clientName: clientName,
            status: updated.status,
            total: updated.total,
            updatedAt: updated.updatedAt
          });
        }
      } catch (error) {
        console.error(`Erro ao publicar evento de status para pedido ${orderId} no Kafka:`, error);
      }
    }

    return updated;
  }
};
