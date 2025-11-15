# 📦 Arquitetura Orientada a Eventos - Sistema de E-commerce

## 📋 Visão Geral

Este documento descreve a implementação de uma **arquitetura orientada a eventos (Event-Driven Architecture)** no sistema de microserviços de e-commerce, focando na comunicação assíncrona entre serviços através do **RabbitMQ**.

## 🏗️ Componentes da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE/API                          │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /v1/orders
                     ▼
        ┌────────────────────────────┐
        │   ORDERS SERVICE           │
        │  (Publisher de Eventos)    │
        │                            │
        │ ├─ Criar Pedido            │
        │ ├─ Validar Cliente         │
        │ ├─ Validar Estoque         │
        │ └─ Publicar order.created  │
        └────────────┬───────────────┘
                     │ Publica Evento
                     ▼
        ┌────────────────────────────────┐
        │       RABBITMQ BROKER          │
        │   (Message Broker Assíncrono)  │
        │                                │
        │  Exchange: ecommerce_events    │
        │  Type: topic                   │
        │                                │
        │  Rotas:                        │
        │  - order.created              │
        │  - order.paid                 │
        │  - order.failed               │
        │  - payment.processed          │
        └────────────┬───────────────────┘
                     │ Roteia Evento
                     ▼
    ┌────────────────────────────────────┐
    │  NOTIFICATION SERVICE              │
    │  (Consumer de Eventos)             │
    │                                    │
    │  ├─ Subscreve: order.created      │
    │  ├─ Subscreve: order.paid        │
    │  ├─ Subscreve: order.failed      │
    │  ├─ Subscreve: payment.processed │
    │  └─ Envia Notificações           │
    └────────────────────────────────────┘
```

## 🔄 Fluxo de Eventos

### 1️⃣ Evento: order.created (Pedido Criado)

**Quando Ocorre:**
- Um cliente cria um novo pedido através da API

**Publicador:**
- `orders-service` → `ordersServices.js` (método `create`)

**Fluxo:**
```javascript
1. Cliente faz POST /v1/orders
   ├─ Validar Cliente
   ├─ Validar Produtos e Estoque
   ├─ Criar Pedido no MongoDB
   ├─ Salvar no Banco de Dados
   └─ PUBLICAR EVENTO: order.created
       └─ Dados: { orderId, clientId, total, status, itemsCount }

2. RabbitMQ recebe a mensagem
   └─ Armazena na fila do exchange ecommerce_events
      └─ Roteia para consumers subscritos em "order.created"

3. Notification Service consome o evento
   ├─ Desserializa a mensagem JSON
   ├─ Chama: dispatchNotification(event)
   ├─ Identifica tipo: order.created
   └─ Executa: handleOrderCreated(event)
       ├─ Log de informações do pedido
       ├─ Cria payload de notificação
       ├─ Envia notificação push ao cliente
       └─ Reconhece processamento (ACK)
```

**Dados Publicados:**
```javascript
{
  type: "order.created",
  timestamp: "2025-11-15T10:30:00.000Z",
  data: {
    orderId: "507f1f77bcf86cd799439011",
    clientId: "507f1f77bcf86cd799439012",
    total: 299.99,
    status: "AGUARDANDO PAGAMENTO",
    itemsCount: 3,
    createdAt: "2025-11-15T10:30:00.000Z"
  }
}
```

**Notificação Enviada ao Cliente:**
```
✅ Pedido Criado com Sucesso!
Seu pedido #507f1f77bcf86cd799439011 foi criado. 
Aguardando pagamento de R$ 299.99
```

---

### 2️⃣ Evento: order.paid (Pedido Pago)

**Quando Ocorre:**
- Um pagamento é processado com sucesso
- Status do pedido muda para "PAGO"

**Publicador:**
- `orders-service` → `ordersServices.js` (método `updateStatus`)

**Fluxo:**
```javascript
1. Payments Service confirma pagamento
   └─ Faz requisição para atualizar status do pedido

2. Orders Service recebe requisição
   ├─ Atualiza status: AGUARDANDO PAGAMENTO → PAGO
   └─ PUBLICA EVENTO: order.paid
       └─ Dados: { orderId, clientId, status, total, updatedAt }

3. RabbitMQ roteia para subscribers

4. Notification Service consome
   ├─ Executa: handleOrderPaid(event)
   ├─ Envia notificação: "Pagamento Confirmado!"
   └─ Informa que pedido está sendo preparado
```

**Notificação Enviada:**
```
💳 Pagamento Confirmado!
Pagamento de R$ 299.99 confirmado para pedido #507f1f77bcf86cd799439011. 
Seu pedido está sendo preparado!
```

---

### 3️⃣ Evento: order.failed (Pagamento Falhou)

**Quando Ocorre:**
- Falha no processamento do pagamento
- Status do pedido muda para "FALHA NO PAGAMENTO"

**Fluxo:**
```javascript
1. Payments Service detecta falha
   └─ Cartão recusado, saldo insuficiente, etc.

2. Orders Service atualiza status
   ├─ Status: AGUARDANDO PAGAMENTO → FALHA NO PAGAMENTO
   └─ PUBLICA EVENTO: order.failed

3. Notification Service consome
   ├─ Executa: handleOrderFailed(event)
   ├─ Envia notificação de ALERTA
   └─ Solicita que cliente tente novamente
```

**Notificação Enviada:**
```
❌ Falha no Pagamento
Não conseguimos processar o pagamento de R$ 299.99 para pedido #507f1f77bcf86cd799439011. 
Tente novamente com outro método de pagamento.
```

---

### 4️⃣ Evento: payment.processed (Pagamento Processado)

**Quando Ocorre:**
- Payments Service processa qualquer transação de pagamento

**Publicador:**
- `payments-service` (futura implementação)

**Fluxo:**
```javascript
1. Payments Service processa transação
   └─ PUBLICA EVENTO: payment.processed

2. Notification Service consome
   └─ Pode registrar logs de auditoria
```

---

## 📝 Estrutura do Código

### Orders Service (Publisher)

**Arquivo:** `orders-service/services/ordersServices.js`

```javascript
// Importa cliente RabbitMQ e eventos
const { RabbitMQClient, EVENTS } = require('../shared/rabbitmq-client');

// Recebe instância do RabbitMQ
const setRabbitMQClient = (client) => {
  rabbitMQClient = client;
};

// Na criação de pedido
const create = async (payload, payments) => {
  // ... lógica de validação ...
  
  const order = new Order(orderData);
  const savedOrder = await order.save();
  
  // PUBLICA EVENTO
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
  
  return savedOrder;
};
```

### Notification Service (Consumer)

**Arquivo:** `notification-service/server.js`

```javascript
// Inicializa consumers ao começar
async function initializeEventConsumers() {
  rabbitMQClient = new RabbitMQClient();
  await rabbitMQClient.connect();
  
  // Subscreve a cada tipo de evento
  const eventTypes = [
    EVENTS.ORDER_CREATED,
    EVENTS.ORDER_PAID,
    EVENTS.ORDER_FAILED,
    EVENTS.PAYMENT_PROCESSED
  ];
  
  for (const eventType of eventTypes) {
    rabbitMQClient.consumeEvent(eventType, async (event) => {
      await dispatchNotification(event);
    });
  }
}

initializeEventConsumers();
```

**Arquivo:** `notification-service/notificationHandler.js`

```javascript
// Dispatcher roteia para handler apropriado
const dispatchNotification = async (event) => {
  switch (event.type) {
    case 'order.created':
      return await handleOrderCreated(event);
    case 'order.paid':
      return await handleOrderPaid(event);
    case 'order.failed':
      return await handleOrderFailed(event);
    case 'payment.processed':
      return await handlePaymentProcessed(event);
  }
};

// Handlers processam cada tipo de evento
const handleOrderCreated = async (event) => {
  const notificationPayload = {
    clientId: event.data.clientId,
    orderId: event.data.orderId,
    title: '✅ Pedido Criado com Sucesso!',
    message: `Seu pedido #${event.data.orderId} foi criado...`
  };
  
  console.log(`📤 Enviando notificação...`);
  return notificationPayload;
};
```

---

## ✅ Validação da Lógica de Eventos

### 1. **Publisher (Orders Service)**

✅ **Verificações Realizadas:**
- [x] Publica evento após criar pedido com sucesso
- [x] Publica evento ao atualizar status do pedido
- [x] Inclui todos os dados necessários no evento
- [x] Trata erros sem interromper fluxo principal
- [x] Mapeia corretamente status para tipos de eventos

### 2. **Broker (RabbitMQ)**

✅ **Configuração Validada:**
- [x] Exchange `ecommerce_events` com tipo `topic`
- [x] Mensagens persistentes (não são perdidas)
- [x] Fila durável para consumers
- [x] Auto-binds de filas aos eventos

### 3. **Consumer (Notification Service)**

✅ **Verificações Realizadas:**
- [x] Se conecta ao RabbitMQ ao iniciar
- [x] Se subscreve a todos os eventos de interesse
- [x] Processa cada tipo de evento corretamente
- [x] Reconhece (ACK) apenas após processar com sucesso
- [x] Reenvia (NACK) se houver erro
- [x] Inclui comentários explicativos em cada handler

---

## 🚀 Como Executar

### 1. Instalar Dependências

```bash
# Orders Service
cd orders-service
npm install

# Notification Service
cd notification-service
npm install
```

### 2. Iniciar Serviços

```bash
# Terminal 1: RabbitMQ (via Docker)
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3-management

# Terminal 2: Orders Service
cd orders-service
npm start

# Terminal 3: Notification Service
cd notification-service
npm start
```

### 3. Testar o Fluxo

```bash
# Criar um pedido (publishes order.created)
curl -X POST http://localhost:3003/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "507f1f77bcf86cd799439012",
    "items": [
      {
        "productId": "507f1f77bcf86cd799439013",
        "quantity": 2
      }
    ]
  }'

# Resposta esperada:
# Notification Service mostrará:
# 📦 ========== EVENTO: Pedido Criado ==========
# 🆔 Pedido ID: [id do pedido]
# 👤 Cliente ID: 507f1f77bcf86cd799439012
# ...
```

---

## 🔍 Debugging

### Verificar RabbitMQ

1. Acessar dashboard: http://localhost:15672
   - User: admin
   - Password: admin

2. Verificar Exchanges:
   - `ecommerce_events` deve estar presente
   - Type: `topic`

3. Verificar Queues:
   - `queue_order.created_notifications`
   - `queue_order.paid_notifications`
   - `queue_order.failed_notifications`
   - `queue_payment.processed_notifications`

### Verificar Logs

```bash
# Orders Service (Publisher)
# Deve mostrar:
# ✓ Evento publicado: order.created

# Notification Service (Consumer)
# Deve mostrar:
# 📦 ========== EVENTO: Pedido Criado ==========
# ✓ Mensagem processada: order.created
```

---

## 📊 Benefícios da Arquitetura

1. **Desacoplamento:** Services não precisam conhecer uns aos outros
2. **Escalabilidade:** Múltiplos consumers podem processar eventos
3. **Resiliência:** Se um service cair, outros continuam funcionando
4. **Auditoria:** Todos os eventos são registrados
5. **Flexibilidade:** Fácil adicionar novos consumers

---

## 🔮 Próximos Passos

1. Implementar `payment.processed` no Payments Service
2. Adicionar Dead Letter Queue para eventos com falha
3. Implementar retry policy
4. Adicionar persistência de eventos (Event Sourcing)
5. Implementar sagas para transações distribuídas
6. Adicionar métricas e monitoramento

