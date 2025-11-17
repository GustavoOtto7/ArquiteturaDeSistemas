const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';

// Tópicos do Kafka
const TOPICS = {
  ORDERS_CREATED: 'orders.created',
  ORDERS_PAID: 'orders.paid',
  ORDERS_FAILED: 'orders.failed',
};

class KafkaConsumer {
  constructor(groupId) {
    this.kafka = new Kafka({
      clientId: `payments-service-${Date.now()}`,
      brokers: [KAFKA_BROKER],
      retry: {
        retries: 10,
        initialRetryTime: 300,
        randomizationFactor: 0.2,
        multiplier: 2,
        maxRetryTime: 30000,
      },
    });

    this.consumer = null;
    this.groupId = groupId || 'payments-service-group';
    this.isConnected = false;
  }

  /**
   * Conecta ao Kafka e inicializa o consumer
   */
  async connect() {
    try {
      this.consumer = this.kafka.consumer({ groupId: this.groupId });
      await this.consumer.connect();
      this.isConnected = true;
      console.log('✓ Conectado ao Kafka (Payments Service - Consumer)');
    } catch (error) {
      console.error('✗ Erro ao conectar ao Kafka:', error.message);
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Subscreve a um tópico e consome mensagens
   * @param {string} topic - Tópico do Kafka
   * @param {function} callback - Função para processar mensagens
   */
  async subscribeToTopic(topic, callback) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Se inscrever ao tópico
      await this.consumer.subscribe({ topic, fromBeginning: false });

      // Executar consumer
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const content = JSON.parse(message.value.toString());
            console.log(`🔄 Mensagem consumida do Kafka [${topic}]:`, content.type);

            // Executar callback
            await callback(content);

            console.log(`✓ Mensagem processada: ${content.type}`);
          } catch (error) {
            console.error(`✗ Erro ao processar mensagem de ${topic}:`, error.message);
          }
        },
      });

      console.log(`✓ Consumer inscrito no tópico: ${topic}`);
    } catch (error) {
      console.error(`✗ Erro ao se inscrever no tópico ${topic}:`, error.message);
      setTimeout(() => this.subscribeToTopic(topic, callback), 5000);
    }
  }

  /**
   * Desconecta do Kafka
   */
  async disconnect() {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      console.log('✓ Desconectado do Kafka');
    } catch (error) {
      console.error('✗ Erro ao desconectar do Kafka:', error.message);
    }
  }
}

module.exports = {
  KafkaConsumer,
  TOPICS,
};
