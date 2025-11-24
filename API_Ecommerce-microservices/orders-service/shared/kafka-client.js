const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';

// Tópicos do Kafka
const TOPICS = {
  ORDERS_CREATED: 'orders.created',
  ORDERS_PAID: 'orders.paid',
  ORDERS_FAILED: 'orders.failed',
};

class KafkaClient {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'orders-service',
      brokers: [KAFKA_BROKER],
      retry: {
        retries: 10,
        initialRetryTime: 300,
        randomizationFactor: 0.2,
        multiplier: 2,
        maxRetryTime: 30000,
      },
    });
    
    this.producer = null;
    this.isConnected = false;
  }

  /**
   * Conecta ao Kafka e inicializa o producer
   */
  async connect() {
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      console.log('✓ Conectado ao Kafka (Orders Service)');
    } catch (error) {
      console.error('✗ Erro ao conectar ao Kafka:', error.message);
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Publica um evento no Kafka
   * @param {string} topic - Tópico do Kafka
   * @param {object} data - Dados do evento
   */
  async publishEvent(topic, data) {
    if (!this.isConnected) {
      console.warn('⚠ Kafka não conectado, tentando reconectar...');
      await this.connect();
    }

    try {
      const message = {
        key: data.orderId ? data.orderId.toString() : null,
        value: JSON.stringify(data),
        headers: {
          'content-type': 'application/json',
        },
      };

      await this.producer.send({
        topic,
        messages: [message],
      });

      console.log(`✓ Evento publicado no Kafka: ${topic}`);
      return true;
    } catch (error) {
      console.error(`✗ Erro ao publicar evento no Kafka ${topic}:`, error.message);
      return false;
    }
  }

  /**
   * Desconecta do Kafka
   */
  async disconnect() {
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      console.log('✓ Desconectado do Kafka');
    } catch (error) {
      console.error('✗ Erro ao desconectar do Kafka:', error.message);
    }
  }
}

module.exports = {
  KafkaClient,
  TOPICS,
};
