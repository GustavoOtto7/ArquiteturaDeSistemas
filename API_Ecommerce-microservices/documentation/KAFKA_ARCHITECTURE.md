# 🔥 Kafka Event-Driven Architecture

## Visão Geral

Implementação de Kafka para processamento assíncrono de pagamentos no e-commerce. Orders Service publica eventos de pedidos criados, e Payments Service consome esses eventos para processar pagamentos automaticamente.

```
┌──────────────────────────────────────────────────────────────────┐
│                    KAFKA ARCHITECTURE                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Orders Service (PUBLISHER)                                      │
│  ├─ create() → emit orders.created                             │
│  ├─ updateStatus(PAGO) → emit orders.paid                      │
│  └─ updateStatus(CANCELADO) → emit orders.failed               │
│                 │                                                │
│                 ↓ (publish events)                              │
│                                                                  │
│  ┌─────────────────────────────────────────┐                   │
│  │      KAFKA BROKER                       │                   │
│  │                                         │                   │
│  │  Topics:                                │                   │
│  │  ├─ orders.created (Partitions: 1)     │                   │
│  │  ├─ orders.paid    (Partitions: 1)     │                   │
│  │  └─ orders.failed  (Partitions: 1)     │                   │
│  │                                         │                   │
│  │  Replication Factor: 1                  │                   │
│  │  Min In-Sync Replicas: 1                │                   │
│  └─────────────────────────────────────────┘                   │
│                 ↑                                                │
│                 │ (subscribe & consume)                         │
│                 │                                                │
│  Payments Service (CONSUMER)                                    │
│  ├─ Consumer Group: payments-service-group                     │
│  ├─ Subscribe: orders.created                                  │
│  └─ Handler: Processa pagamento                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tópicos Kafka

### 1. `orders.created` 📤
**Publicado por:** Orders Service (create method)  
**Consumido por:** Payments Service  
**Formato:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "clientId": "1",
  "total": 4500.00,
  "status": "PENDENTE",
  "items": [
    {
      "productId": "1",
      "quantity": 1,
      "price": 4500.00
    }
  ],
  "itemsCount": 1,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. `orders.paid` 📤
**Publicado por:** Orders Service (updateStatus method, quando status = PAGO)  
**Consumido por:** (disponível para outros serviços)  
**Formato:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "clientId": "1",
  "clientName": "João Silva",
  "status": "PAGO",
  "total": 4500.00,
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

### 3. `orders.failed` 📤
**Publicado por:** Orders Service (updateStatus method, quando status = CANCELADO ou FALHA)  
**Consumido por:** (disponível para outros serviços)  
**Formato:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "clientId": "1",
  "clientName": "João Silva",
  "status": "CANCELADO",
  "total": 4500.00,
  "updatedAt": "2024-01-15T10:40:00.000Z"
}
```

---

## Publishers (Produtores)

### Orders Service - `shared/kafka-client.js`

```javascript
class KafkaClient {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'orders-service',
      brokers: [KAFKA_BROKER],
      retry: {
        retries: 10,              // 10 tentativas
        initialRetryTime: 300,    // 300ms inicial
        multiplier: 2,            // Exponential backoff
        maxRetryTime: 30000       // Máximo 30s
      }
    });
    this.producer = null;
  }

  async connect() {
    this.producer = this.kafka.producer();
    await this.producer.connect();
    console.log('✓ Kafka Producer conectado');
  }

  async publishEvent(topic, data) {
    await this.producer.send({
      topic,
      messages: [{
        key: data.orderId,        // Key para partição
        value: JSON.stringify(data)
      }]
    });
  }

  async disconnect() {
    await this.producer.disconnect();
  }
}
```

### Inicialização no Server

```javascript
// orders-service/server.js
const kafkaClient = new KafkaClient();
await kafkaClient.connect();
ordersServices.setKafkaClient(kafkaClient);

// Health check
app.get('/health', (req, res) => res.json({
  service: 'orders-service',
  kafka: kafkaClient ? 'connected' : 'disconnected'
}));
```

### Publicação nos Services

```javascript
// orders-service/services/ordersServices.js

// 1. Quando cria pedido
const savedOrder = await order.save();
if (kafkaClient) {
  await kafkaClient.publishEvent(TOPICS.ORDERS_CREATED, {
    orderId: savedOrder._id.toString(),
    clientId: savedOrder.clientId,
    total: savedOrder.total,
    status: savedOrder.status,
    items: enrichedItems,
    itemsCount: savedOrder.items.length,
    createdAt: savedOrder.createdAt
  });
}

// 2. Quando atualiza status
if (statusName === 'PAGO') {
  await kafkaClient.publishEvent(TOPICS.ORDERS_PAID, {
    orderId: updated._id.toString(),
    clientId: updated.clientId,
    clientName: clientName,
    status: updated.status,
    total: updated.total,
    updatedAt: updated.updatedAt
  });
}
```

---

## Consumers (Consumidores)

### Payments Service - `shared/kafka-client.js`

```javascript
class KafkaConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'payments-service',
      brokers: [KAFKA_BROKER],
      retry: {
        retries: 10,
        initialRetryTime: 300,
        multiplier: 2,
        maxRetryTime: 30000
      }
    });
    this.consumer = null;
  }

  async connect() {
    this.consumer = this.kafka.consumer({
      groupId: 'payments-service-group'  // Consumer group
    });
    await this.consumer.connect();
    console.log('✓ Kafka Consumer conectado');
  }

  async subscribeToTopic(topic, callback) {
    await this.consumer.subscribe({ topic, fromBeginning: true });
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await callback(event);
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      }
    });
  }

  async disconnect() {
    await this.consumer.disconnect();
  }
}
```

### Inicialização no Server

```javascript
// payments-service/server.js
async function startServer() {
  kafkaConsumer = new KafkaConsumer();
  await kafkaConsumer.connect();
  
  await kafkaConsumer.subscribeToTopic(
    TOPICS.ORDERS_CREATED,
    handleOrderCreatedEvent
  );
  
  app.listen(PORT, () => {
    console.log(`Payments Service rodando em ${PORT}`);
  });
}

async function handleOrderCreatedEvent(event) {
  console.log('📨 Evento orders.created recebido:', event);
  
  const { orderId, clientId, total, items } = event;
  
  // Processa o pagamento
  console.log(`✅ Processando pagamento para pedido ${orderId}`);
  console.log(`   Total: R$ ${total}`);
  console.log(`   Itens: ${items.length} produtos`);
}
```

---

## Consumer Groups

### payments-service-group

**Configuração:**
- Group ID: `payments-service-group`
- Topics: `orders.created`
- Modo: Auto-commit
- Offset: `fromBeginning: true` (processa mensagens antigas)

**Monitorar grupo:**
```bash
docker exec kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group payments-service-group
```

**Output esperado:**
```
GROUP                  TOPIC           PARTITION CURRENT-OFFSET LAG
payments-service-group orders.created  0         5              0
```

---

## Offset Management

### Concepts

- **Offset:** Posição da mensagem no tópico
- **Committed Offset:** Último offset processado com sucesso
- **Current Offset:** Próxima mensagem a consumir

### Estratégias

**1. Auto-commit (Default - RECOMENDADO)**
```javascript
await this.consumer.run({
  autoCommit: true,
  autoCommitInterval: 5000  // 5 segundos
});
```

**2. Manual commit**
```javascript
await this.consumer.run({
  autoCommit: false,
  eachMessage: async (msg) => {
    await processMessage(msg);
    await consumer.commitOffsets([{
      topic: msg.topic,
      partition: msg.partition,
      offset: (msg.message.offset + 1).toString()
    }]);
  }
});
```

---

## 🧪 Teste Passo-a-Passo

### Passo 1: Iniciar Kafka
```bash
docker-compose down -v
docker-compose up -d kafka zookeeper kafka-ui
sleep 30
```

### Passo 2: Verificar Topics
```bash
docker exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092
```

Deve listar:
- orders.created
- orders.paid
- orders.failed

### Passo 3: Iniciar Serviços
```bash
docker-compose up -d orders-service payments-service
sleep 15
```

### Passo 4: Criar Pedido (Dispara Evento)
```bash
# 1. Cliente
curl -X POST http://localhost:3002/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João",
    "email": "joao@test.com",
    "phone": "11999999999",
    "cpf": "12345678901"
  }' | jq -r .id

# 2. Produto
curl -X POST http://localhost:3003/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Produto",
    "description": "Desc",
    "price": 100,
    "quantity": 10
  }' | jq -r .id

# 3. Pedido (🎉 Dispara evento!)
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "CLIENT_ID",
    "items": [{
      "productId": "PRODUCT_ID",
      "quantity": 1,
      "price": 100
    }],
    "total": 100,
    "payments": [{
      "typePaymentId": 1,
      "amount": 100
    }]
  }'
```

### Passo 5: Ver Evento no Kafka UI
```
http://localhost:8080
→ Topics → orders.created → Messages
→ Você deve ver a mensagem JSON aqui!
```

### Passo 6: Confirmar Consumer Recebeu
```bash
docker logs payments-service | grep "Evento orders.created"
```

Output esperado:
```
📨 [Kafka Consumer] Evento orders.created recebido: {
  orderId: '...',
  clientId: '1',
  total: 100,
  ...
}
✅ Processando pagamento para pedido ...
   Total: R$ 100
   Itens: 1 produtos
```

### Passo 7: Atualizar Status (Novo Evento)
```bash
# Pegar ORDER_ID da resposta anterior
ORDER_ID="..."

# Atualizar para PAGO
curl -X PATCH http://localhost:3001/v1/orders/$ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "PAGO"}'
```

### Passo 8: Ver Novo Evento
```
http://localhost:8080
→ Topics → orders.paid → Messages
→ Você deve ver a mensagem JSON aqui!
```

---

## 🔍 Monitorar em Tempo Real

### Console Consumer
```bash
# Ler todas as mensagens do tópico (últimas 10)
docker exec kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders.created \
  --from-beginning \
  --max-messages 10

# Ler em tempo real (novos eventos)
docker exec kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders.created \
  --from-latest
```

### Kafka UI (Recomendado)
```
http://localhost:8080
- Clusters → ecommerce-cluster
- Topics → Selecione um tópico
- Messages → Veja as mensagens em JSON formatado
- Consumer Groups → Veja offset lag
```

---

## 🛠️ Performance Tuning

### Replicação
```bash
# Aumentar replication factor (mais durável)
docker exec kafka kafka-topics.sh \
  --alter \
  --topic orders.created \
  --bootstrap-server localhost:9092 \
  --replication-factor 3
```

### Partições
```bash
# Aumentar partições (mais throughput)
docker exec kafka kafka-topics.sh \
  --alter \
  --topic orders.created \
  --bootstrap-server localhost:9092 \
  --partitions 3
```

### Batch Tuning
```javascript
// Producer: aumentar batch para melhor throughput
compression: CompressionTypes.SNAPPY,  // Compressão
batch: {
  size: 16384,      // 16KB
  lingerMs: 100     // Esperar 100ms ou encher batch
}
```

---

## 🚨 Troubleshooting

| Problema | Solução |
|----------|---------|
| Topic não existe | Topics são auto-criados quando producer publica |
| Connection refused | `docker restart kafka` e aguardar 30s |
| Consumer lag | Normal durante processamento, `docker logs payments-service` |
| Mensagens duplicadas | Usar idempotência ou check de id já processado |
| Broker down | Usar `--bootstrap-server` com múltiplos brokers |
| Offset inválido | Resetar: `docker exec kafka kafka-consumer-groups.sh --reset-offsets --group payments-service-group --topic orders.created --to-latest` |

---

## 📊 Comparação: Kafka vs RabbitMQ

| Aspecto | Kafka | RabbitMQ |
|--------|-------|----------|
| **Tipo** | Pub/Sub + Log distribuído | Message Broker tradicional |
| **Persistência** | Sempre persiste | Opcional |
| **Performance** | Muito alta (milhões/sec) | Alta (centenas de milhares/sec) |
| **Retenção** | Configurable (dias) | Até consumir |
| **Ordering** | Garantido por partição | Garantido por fila |
| **Consumer Rebalance** | Automático | Manual |
| **Caso de Uso** | Stream processing, Event sourcing | Fila de tarefas, RPC |

**Neste projeto:**
- ✅ **Kafka:** Para pagamentos (stream contínuo, tolerância a falhas)
- ✅ **RabbitMQ:** Para notificações (entrega garantida, urgente)

---

## 📚 Recursos

- [Apache Kafka Docs](https://kafka.apache.org/documentation/)
- [KafkaJS Docs](https://kafka.js.org/)
- [Kafka UI Project](https://docs.kafkaui.axiom.co/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

---

**Status:** ✅ Implementado e Testado  
**Versão Kafka:** 7.5.0  
**Última Atualização:** 2024-01-15
