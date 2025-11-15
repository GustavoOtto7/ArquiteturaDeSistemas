const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';

// Eventos que serão publicados
const EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_FAILED: 'order.failed',
  PAYMENT_PROCESSED: 'payment.processed',
};

class RabbitMQClient {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  /**
   * Conecta ao RabbitMQ
   */
  async connect() {
    try {
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      console.log('✓ Conectado ao RabbitMQ');
      
      // Reconectar caso a conexão caia
      this.connection.on('error', (err) => {
        console.error('✗ Erro na conexão RabbitMQ:', err);
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      console.error('✗ Erro ao conectar ao RabbitMQ:', error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Publica um evento na fila
   */
  async publishEvent(eventType, data) {
    if (!this.isConnected) {
      console.warn('⚠ RabbitMQ não conectado, tentando reconectar...');
      await this.connect();
    }

    try {
      const exchange = 'ecommerce_events';
      const message = {
        type: eventType,
        timestamp: new Date().toISOString(),
        data,
      };

      // Declarar exchange
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      // Publicar mensagem
      this.channel.publish(
        exchange,
        eventType,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      console.log(`✓ Evento publicado: ${eventType}`);
      return true;
    } catch (error) {
      console.error(`✗ Erro ao publicar evento ${eventType}:`, error);
      return false;
    }
  }

  /**
   * Consome eventos de uma fila
   */
  async consumeEvent(eventType, callback) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const exchange = 'ecommerce_events';
      const queue = `queue_${eventType}_${Date.now()}`;

      // Declarar exchange
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      // Declarar fila
      const q = await this.channel.assertQueue(queue, { durable: false, autoDelete: true });

      // Vincular fila ao exchange
      await this.channel.bindQueue(q.queue, exchange, eventType);

      console.log(`✓ Consumidor iniciado para: ${eventType}`);

      // Consumir mensagens
      this.channel.consume(q.queue, async (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          try {
            await callback(content);
            this.channel.ack(msg);
            console.log(`✓ Mensagem processada: ${eventType}`);
          } catch (error) {
            console.error(`✗ Erro ao processar evento ${eventType}:`, error);
            // Rejeitar e reencaminhar para dead letter queue
            this.channel.nack(msg, false, true);
          }
        }
      });
    } catch (error) {
      console.error(`✗ Erro ao consumir evento ${eventType}:`, error);
      setTimeout(() => this.consumeEvent(eventType, callback), 5000);
    }
  }

  /**
   * Fecha a conexão
   */
  async disconnect() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log('✓ Desconectado do RabbitMQ');
    } catch (error) {
      console.error('✗ Erro ao desconectar do RabbitMQ:', error);
    }
  }
}

module.exports = {
  RabbitMQClient,
  EVENTS,
};
