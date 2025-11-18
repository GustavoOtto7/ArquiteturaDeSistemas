# 🔥 RabbitMQ Event-Driven Architecture

## Visão Geral

Implementação de RabbitMQ para notificações em tempo real no e-commerce. Orders Service publica eventos de pedidos, e Notification Service consome esses eventos para enviar notificações aos clientes.

```
┌──────────────────────────────────────────────────────────────────┐
│                    RABBITMQ ARCHITECTURE                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Orders Service (PUBLISHER)                                      │
│  ├─ create() → emit ORDER_CREATED                              │
│  ├─ updateStatus(PAGO) → emit ORDER_PAID                       │
│  └─ updateStatus(CANCELADO) → emit ORDER_FAILED                │
│                 │                                                │
│                 ↓ (publish events)                              │
│                                                                  │
│  ┌─────────────────────────────────────────┐                   │
│  │      RABBITMQ BROKER                    │                   │
│  │                                         │                   │
│  │  Exchange: amq.direct (direct routing) │                   │
│  │                                         │                   │
│  │  Queues:                                │                   │
│  │  ├─ order.created (routing_key)        │                   │
│  │  ├─ order.paid                         │                   │
│  │  └─ order.failed                       │                   │
│  │                                         │                   │
│  │  Durability: ✓ (não perde mensagens)   │                   │
│  │  Dead Letter Exchange: ✓ (retry)       │                   │
│  └─────────────────────────────────────────┘                   │
│                 ↑                                                │
│                 │ (consume)                                     │
│                 │                                                │
│  Notification Service (CONSUMER)                                │
│  ├─ Consumer: notificationHandler                              │
│  ├─ Ack Manual (confirma recebimento)                          │
│  └─ Prefetch: 1 (processa uma por vez)                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Eventos RabbitMQ

### 1. `ORDER_CREATED` 📤
**Publicado por:** Orders Service (create method)  
**Consumido por:** Notification Service  
**Propósito:** Notificar cliente que pedido foi criado  
**Formato:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "clientId": "1",
  "total": 4500.00,
  "status": "PENDENTE",
  "itemsCount": 1,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Exemplo de Notificação:**
```
Assunto: Pedido #507f1f77... criado com sucesso!
Corpo:
  Obrigado por sua compra!
  Pedido: #507f1f77bcf86cd799439011
  Total: R$ 4.500,00
  Status: Pendente - Aguardando pagamento
  Data: 15/01/2024 às 10:30
```

---

### 2. `ORDER_PAID` 📤
**Publicado por:** Orders Service (updateStatus method, quando status = PAGO)  
**Consumido por:** Notification Service  
**Propósito:** Notificar que pagamento foi confirmado  
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

**Exemplo de Notificação:**
```
Assunto: Pagamento confirmado para pedido #507f1f77...
Corpo:
  Excelente notícia, João Silva!
  Seu pagamento foi confirmado.
  Pedido: #507f1f77bcf86cd799439011
  Total: R$ 4.500,00
  Status: PAGO ✅
  Seu pedido será preparado para envio!
```

---

### 3. `ORDER_FAILED` 📤
**Publicado por:** Orders Service (updateStatus method, quando status = CANCELADO ou FALHA)  
**Consumido por:** Notification Service  
**Propósito:** Notificar que pedido falhou  
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

**Exemplo de Notificação:**
```
Assunto: Pedido #507f1f77... foi cancelado
Corpo:
  Infelizmente, seu pedido foi cancelado.
  Pedido: #507f1f77bcf86cd799439011
  Total: R$ 4.500,00
  Status: CANCELADO ❌
  
  Se isto foi um engano, entre em contato conosco.
```

---

## Publishers (Produtores)

### Orders Service - `shared/rabbitmq-client.js`

```javascript
class RabbitMQClient {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    this.connection = await amqp.connect(RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
    
    // Criar exchange se não existir
    await this.channel.assertExchange(
      'events',           // Nome do exchange
      'direct',           // Tipo: direct routing
      { durable: true }   // Durável (persiste)
    );
    
    console.log('✓ RabbitMQ conectado');
  }

  async publishEvent(eventType, data) {
    const message = Buffer.from(JSON.stringify(data));
    
    this.channel.publish(
      'events',           // Exchange
      eventType,          // Routing key (ex: ORDER_CREATED)
      message,
      { persistent: true, encoding: 'utf-8' }
    );
    
    console.log(`📤 Evento publicado: ${eventType}`);
  }

  async disconnect() {
    await this.channel.close();
    await this.connection.close();
  }
}
```

### Inicialização no Server

```javascript
// orders-service/server.js
const rabbitMQClient = new RabbitMQClient();
await rabbitMQClient.connect();
ordersServices.setRabbitMQClient(rabbitMQClient);
```

### Publicação nos Services

```javascript
// orders-service/services/ordersServices.js

// 1. Quando cria pedido
const savedOrder = await order.save();
if (rabbitMQClient) {
  await rabbitMQClient.publishEvent(EVENTS.ORDER_CREATED, {
    orderId: savedOrder._id.toString(),
    clientId: savedOrder.clientId,
    total: savedOrder.total,
    status: savedOrder.status,
    itemsCount: savedOrder.items.length,
    createdAt: savedOrder.createdAt
  });
}

// 2. Quando atualiza status para PAGO
if (statusName === 'PAGO') {
  await rabbitMQClient.publishEvent(EVENTS.ORDER_PAID, {
    orderId: updated._id.toString(),
    clientId: updated.clientId,
    clientName: clientName,
    status: updated.status,
    total: updated.total,
    updatedAt: updated.updatedAt
  });
}

// 3. Quando atualiza status para CANCELADO/FALHA
if (statusName === 'CANCELADO' || statusName === 'FALHA NO PAGAMENTO') {
  await rabbitMQClient.publishEvent(EVENTS.ORDER_FAILED, {
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

### Notification Service - `notificationHandler.js`

```javascript
const amqp = require('amqplib');

const EVENTS = {
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_PAID: 'ORDER_PAID',
  ORDER_FAILED: 'ORDER_FAILED'
};

const rabbitmqClient = require('./rabbitmq-client');

async function setupConsumer() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  // Criar exchange
  await channel.assertExchange('events', 'direct', { durable: true });
  
  // Criar fila com dead letter
  await channel.assertQueue('notification.queue', {
    durable: true,
    deadLetterExchange: 'events.dlx'  // Dead Letter Exchange
  });
  
  // Bind fila ao exchange para cada evento
  await channel.bindQueue('notification.queue', 'events', EVENTS.ORDER_CREATED);
  await channel.bindQueue('notification.queue', 'events', EVENTS.ORDER_PAID);
  await channel.bindQueue('notification.queue', 'events', EVENTS.ORDER_FAILED);
  
  // Configurar prefetch (processa 1 mensagem por vez)
  await channel.prefetch(1);
  
  // Consumir mensagens
  await channel.consume('notification.queue', async (message) => {
    try {
      const content = JSON.parse(message.content.toString());
      console.log(`📨 Evento recebido: ${content.eventType}`);
      
      // Processar notificação
      await handleNotification(content);
      
      // Confirmar recebimento (ACK)
      channel.ack(message);
      console.log('✅ Evento processado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao processar evento:', error);
      
      // Não fazer ACK (requeue)
      channel.nack(message, false, true);
    }
  }, { noAck: false });
  
  console.log('📡 Notification Service aguardando eventos...');
}

async function handleNotification(event) {
  const { orderId, clientId, clientName, total, status } = event;
  
  // Aqui você implementaria:
  // - Buscar email do cliente
  // - Renderizar template HTML
  // - Enviar email via SendGrid/Mailgun
  // - Registrar log
  
  console.log(`
    📧 Enviando notificação:
    Para: ${clientName}
    Pedido: ${orderId}
    Status: ${status}
    Total: R$ ${total}
  `);
}

module.exports = { setupConsumer };
```

### Inicialização no Server

```javascript
// notification-service/server.js
const { setupConsumer } = require('./notificationHandler');

const PORT = process.env.PORT || 3005;

async function startServer() {
  try {
    // Iniciar consumer RabbitMQ
    await setupConsumer();
    
    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log(`✨ Notification Service rodando em ${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar:', error);
    process.exit(1);
  }
}

startServer();
```

---

## Filas e Dead Letter Exchange

### Queue Configuration

```javascript
// notification.queue
{
  durable: true,              // Persiste após restart
  exclusive: false,           // Podem conectar múltiplos consumers
  autoDelete: false,          // Não deleta automaticamente
  deadLetterExchange: 'events.dlx',  // Para mensagens com erro
  deadLetterRoutingKey: 'notification.failed'
}
```

### Dead Letter Exchange (DLX)

Para mensagens que não podem ser processadas:

```javascript
// Criar DLX
await channel.assertExchange('events.dlx', 'direct', { durable: true });
await channel.assertQueue('notification.dlx.queue', { durable: true });
await channel.bindQueue('notification.dlx.queue', 'events.dlx', 'notification.failed');

// Consumir mensagens com erro
await channel.consume('notification.dlx.queue', async (message) => {
  console.log('🔴 Mensagem em Dead Letter Queue:', message.content.toString());
  channel.ack(message);
});
```

---

## 🧪 Teste Passo-a-Passo

### Passo 1: Iniciar RabbitMQ
```bash
docker-compose up -d rabbitmq rabbitmq-ui
sleep 15
```

### Passo 2: Acessar RabbitMQ UI
```
http://localhost:15672
Username: admin
Password: admin
```

### Passo 3: Iniciar Serviços
```bash
docker-compose up -d orders-service notification-service
sleep 10
```

### Passo 4: Criar Pedido (Dispara Evento)
```bash
# 1. Cliente
curl -X POST http://localhost:3002/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@test.com",
    "phone": "11999999999",
    "cpf": "12345678901"
  }' | jq -r .id

# 2. Produto
curl -X POST http://localhost:3003/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notebook",
    "description": "Teste",
    "price": 4500,
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
      "price": 4500
    }],
    "total": 4500,
    "payments": [{
      "typePaymentId": 1,
      "amount": 4500
    }]
  }'
```

### Passo 5: Ver Evento no RabbitMQ UI
```
http://localhost:15672
→ Queues and Streams
→ notification.queue
→ Preview (se houver mensagem)
```

### Passo 6: Confirmar Notification Service Recebeu
```bash
docker logs notification-service | grep "Evento recebido"
```

Output esperado:
```
📨 Evento recebido: ORDER_CREATED
✅ Evento processado com sucesso
📧 Enviando notificação:
    Para: João Silva
    Pedido: 507f1f77bcf86cd799439011
    Status: PENDENTE
    Total: R$ 4500
```

### Passo 7: Ver Fila Vazia
```bash
# A fila deve estar vazia (todas processadas)
docker logs notification-service | grep "Get-Item"
# Deve mostrar: Queue size: 0
```

---

## 🔍 RabbitMQ UI Manual

### Queues
```
http://localhost:15672
→ Queues and Streams
→ Mostrar todas as filas
→ notification.queue
  ├─ Messages: Contagem de mensagens
  ├─ Consumers: Consumidores conectados
  ├─ Purge (deletar todas)
  └─ Delete (remover fila)
```

### Exchanges
```
http://localhost:15672
→ Exchanges
→ events (exchange de eventos)
  ├─ Type: direct
  ├─ Durable: ✓
  ├─ Bindings:
  │  ├─ ORDER_CREATED → notification.queue
  │  ├─ ORDER_PAID → notification.queue
  │  └─ ORDER_FAILED → notification.queue
```

### Connections
```
http://localhost:15672
→ Connections
→ Ver todas as conexões ativas
→ notification-service
  ├─ Host: 172.x.x.x:xxxxx
  ├─ Idle: 0s
  └─ Peak channels: 1
```

---

## 🛠️ Retry e Dead Letter

### Estratégia de Retry

**Abordagem 1: Requeue automático**
```javascript
channel.nack(message, false, true);  // true = requeue
// Tenta novamente imediatamente
```

**Abordagem 2: Dead Letter + Retry**
```javascript
// Primeira tentativa falha
channel.nack(message, false, false);  // false = sem requeue

// Mensagem vai para DLX
// Em DLX, espera X segundos
await sleep(5000);

// Publica novamente para fila original
channel.publish('events', 'ORDER_CREATED', message);
```

**Abordagem 3: Circuit Breaker**
```javascript
let failureCount = 0;
const MAX_FAILURES = 3;

await channel.consume('notification.queue', async (message) => {
  try {
    await handleNotification(JSON.parse(message.content.toString()));
    failureCount = 0;  // Reset
    channel.ack(message);
  } catch (error) {
    failureCount++;
    
    if (failureCount >= MAX_FAILURES) {
      // Enviar para DLX, não retry
      channel.nack(message, false, false);
    } else {
      // Retry
      channel.nack(message, false, true);
    }
  }
});
```

---

## 📊 Performance e Monitoramento

### Metrics do RabbitMQ

```bash
# Ver estatísticas
curl -s http://admin:admin@localhost:15672/api/queues/%2F/notification.queue | jq .

# Resposta:
# {
#   "name": "notification.queue",
#   "messages": 0,
#   "messages_ready": 0,
#   "messages_unacked": 0,
#   "consumers": 1,
#   "idle_since": 1234567890
# }
```

### Tuning

```javascript
// Aumentar prefetch para melhor throughput
await channel.prefetch(10);  // Processar até 10 simultâneas

// Mas aumenta memória, mantenha em 1 se crítico
await channel.prefetch(1);   // Uma por uma (seguro)
```

---

## 🚨 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Connection refused" | Verificar se RabbitMQ está rodando: `docker ps \| grep rabbitmq` |
| Fila vazia | Normal, mensagens são processadas |
| Mensagens acumulando | Consumer não está processando, check logs |
| Exchange não existe | Auto-criado na primeira publicação |
| Mensagens perdidas | Usar `persistent: true` ao publicar |
| Consumer desconectou | Reconecta automaticamente (com retry) |

---

## 📊 Comparação: RabbitMQ vs Kafka

| Aspecto | RabbitMQ | Kafka |
|--------|----------|-------|
| **Modelo** | Message Broker | Distributed Log |
| **Routing** | Exchange + Bindings | Topic-based |
| **Persistência** | Opcional (durable) | Sempre |
| **Retenção** | Até consumir | Configurable |
| **Ordering** | Por fila | Por partição |
| **Performance** | Alta | Muito alta |
| **Caso de Uso** | Notificações urgentes | Stream processing |

**Neste projeto:**
- ✅ **RabbitMQ:** Notificações (precisa chegar rápido e urgente)
- ✅ **Kafka:** Pagamentos (pode estar offline, recebe depois)

---

## 📚 Recursos

- [RabbitMQ Official Docs](https://www.rabbitmq.com/documentation.html)
- [AMQP JavaScript Client](https://github.com/amqp-node/amqplib)
- [RabbitMQ Best Practices](https://www.rabbitmq.com/bestpractices.html)
- [Message Queuing Pattern](https://www.enterpriseintegrationpatterns.com/patterns/messaging/)

---

**Status:** ✅ Implementado e Testado  
**Versão RabbitMQ:** 3.9  
**Última Atualização:** 2024-01-15
