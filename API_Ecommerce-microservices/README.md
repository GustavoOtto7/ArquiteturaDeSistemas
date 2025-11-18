# 🏗️ E-Commerce Microservices Architecture

## 📋 Visão Geral do Projeto

Arquitetura **event-driven** de e-commerce com microserviços, utilizando **RabbitMQ** para notificações e **Kafka** para processamento de pagamentos.

```
┌──────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DO SISTEMA                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  5 MICROSERVIÇOS:                                               │
│  ├─ Orders Service (3001)        → Gerencia pedidos             │
│  ├─ Payments Service (3004)      → Processa pagamentos          │
│  ├─ Clients Service (3002)       → Dados de clientes            │
│  ├─ Products Service (3003)      → Catálogo de produtos         │
│  └─ Notification Service         → Envia notificações           │
│                                                                  │
│  BANCOS DE DADOS:                                               │
│  ├─ MongoDB        → Pedidos (Orders Service)                  │
│  ├─ PostgreSQL     → Clientes, Produtos, Pagamentos            │
│                                                                  │
│  MESSAGE BROKERS:                                               │
│  ├─ RabbitMQ       → Event-driven de notificações              │
│  └─ Kafka          → Event-driven de pagamentos                │
│                                                                  │
│  INFRAESTRUTURA:                                                │
│  ├─ Docker Compose → Orquestração de containers               │
│  ├─ Grafana        → Dashboards de monitoramento              │
│  ├─ InfluxDB       → Time series database                      │
│  ├─ k6             → Testes de carga                           │
│  └─ Kafka UI       → Monitor visual de eventos                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura de Diretórios

```
API_Ecommerce-microservices/
│
├── 📦 MICROSERVIÇOS
│   ├── orders-service/
│   │   ├── server.js              # Express app + Kafka/RabbitMQ
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/              # ordersServices.js (business logic + events)
│   │   ├── models/                # MongoDB Order model
│   │   ├── prisma/
│   │   ├── utils/
│   │   └── shared/
│   │       ├── kafka-client.js    # 🔥 Kafka Publisher
│   │       ├── rabbitmq-client.js
│   │       └── axios-config.js
│   │
│   ├── payments-service/
│   │   ├── server.js              # 🔥 Kafka Consumer + HTTP
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── prisma/
│   │   ├── utils/
│   │   └── shared/
│   │       ├── kafka-client.js    # 🔥 Kafka Consumer
│   │       └── axios-config.js
│   │
│   ├── notification-service/
│   │   ├── server.js              # RabbitMQ Consumer
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── rabbitmq-client.js
│   │   └── notificationHandler.js
│   │
│   ├── clients-service/
│   │   ├── server.js
│   │   ├── controllers/clientsController.js
│   │   ├── routes/clientsRoutes.js
│   │   ├── services/clientsServices.js
│   │   ├── prisma/schema.prisma
│   │   └── package.json
│   │
│   └── products-service/
│       ├── server.js
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── prisma/
│       └── package.json
│
├── 🐳 INFRAESTRUTURA
│   └── docker-compose.yml         # 20+ services (DB, brokers, monitoring)
│
├── 📚 DOCUMENTAÇÃO
│   ├── README.md                  # Este arquivo
│   ├── KAFKA_ARCHITECTURE.md      # 🔥 Kafka event-driven
│   └── RABBITMQ_ARCHITECTURE.md   # 🔥 RabbitMQ event-driven
│
├── 🧪 TESTES
│   ├── k6-scripts/
│   │   ├── order-load-test.js
│   │   └── payment-load-test.js
│   ├── api-tests.http             # Testes HTTP para VS Code
│   └── event-driven-tests.http    # Testes dos eventos
│
└── 📁 OUTRAS PASTAS
    ├── shared/                    # Configurações compartilhadas
    ├── influxdb-init/
    ├── documentation/
    └── eda/                       # Exercícios event-driven
```

---

## 🚀 Quick Start

### 1️⃣ Pré-requisitos
- Docker & Docker Compose
- Node.js 14+ (opcional)
- curl ou Postman

### 2️⃣ Iniciar Tudo
```bash
docker-compose down -v
docker-compose up -d --build
sleep 30
```

### 3️⃣ Verificar Status
```bash
docker ps | grep -E "orders|payments|kafka|rabbitmq"
```

### 4️⃣ URLs Principais
| Serviço | URL | Porta |
|---------|-----|-------|
| Orders API | http://localhost:3001 | 3001 |
| Payments API | http://localhost:3004 | 3004 |
| Clients API | http://localhost:3002 | 3002 |
| Products API | http://localhost:3003 | 3003 |
| **Kafka UI** | **http://localhost:8080** | **8080** |
| RabbitMQ UI | http://localhost:15672 | 15672 |
| Grafana | http://localhost:3000 | 3000 |

---

## 📊 Event-Driven Architecture

### 🔥 Kafka (Pagamentos)

**Flow:**
```
Orders Service (PUBLISHER)
    ↓
POST /v1/orders {clientId, items, total}
    ↓
emit event: orders.created → KAFKA
    ↓
Payments Service (CONSUMER) recebe
    ↓
Processa pagamento automaticamente
    ↓
emit event: orders.paid/orders.failed
```

**Tópicos Kafka:**
- `orders.created` - Novo pedido criado
- `orders.paid` - Pedido pago com sucesso
- `orders.failed` - Falha no pagamento

**Consumer Group:**
- `payments-service-group` (Payments Service)

### 🔥 RabbitMQ (Notificações)

**Flow:**
```
Orders Service (PUBLISHER)
    ↓
Publica evento: ORDER_CREATED → RabbitMQ
    ↓
Notification Service (CONSUMER) recebe
    ↓
Envia email/SMS de confirmação
    ↓
Publica evento: NOTIFICATION_SENT
```

**Eventos RabbitMQ:**
- `ORDER_CREATED` - Novo pedido (com items enriquecidos)
- `ORDER_PAID` - Pedido pago (com nome do cliente)
- `ORDER_FAILED` - Falha no pagamento

---

## 🧪 Teste Rápido

### Teste do Fluxo Completo (3 minutos)

```bash
# 1. Criar Cliente
curl -X POST http://localhost:3002/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@test.com",
    "phone": "11999999999",
    "cpf": "12345678901"
  }' | jq .id
# → Copie o CLIENT_ID

# 2. Criar Produto
curl -X POST http://localhost:3003/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notebook",
    "description": "Notebook teste",
    "price": 4500,
    "quantity": 10
  }' | jq .id
# → Copie o PRODUCT_ID

# 3. Criar Pedido (🎉 DISPARA EVENTOS!)
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
  }' | jq -r ._id
# → Copie o ORDER_ID

# 4. Verificar Eventos no Kafka
# Abra: http://localhost:8080
# Topics → orders.created → Messages
# 👉 Você deve ver a mensagem aqui!

# 5. Confirmar que Payments recebeu
docker logs payments-service | grep "Evento orders.created"
# Output esperado: 📨 [Kafka Consumer] Evento orders.created recebido

# 6. Atualizar Status para PAGO
curl -X PATCH http://localhost:3001/v1/orders/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "PAGO"}'

# 7. Verificar novo evento no Kafka
# Volte em: http://localhost:8080
# Topics → orders.paid → Messages
# 👉 Novo evento deve estar aqui!
```

---

## 📖 Documentação Detalhada

### 1. **KAFKA_ARCHITECTURE.md** 🔥
Implementação completa de Kafka como message broker para pagamentos.

**Inclui:**
- Arquitetura Publisher-Subscriber
- Definição de tópicos e partições
- Consumer groups e offset management
- Como testar passo-a-passo
- Troubleshooting
- Performance tuning

**Leia quando:** Trabalhar com Kafka ou entender fluxo de pagamentos

---

### 2. **RABBITMQ_ARCHITECTURE.md** 🔥
Implementação completa de RabbitMQ como message broker para notificações.

**Inclui:**
- Arquitetura de filas
- Exchange e bindings
- Dead letter exchanges
- Como testar passo-a-passo
- RabbitMQ UI manual
- Recuperação de erros

**Leia quando:** Trabalhar com RabbitMQ ou entender notificações

---

### 3. **README.md** (Este Arquivo)
Visão geral do projeto, estrutura e quick start.

---

## 🔧 Microserviços Detalhados

### Orders Service (3001)
**Responsabilidades:**
- ✅ Criar pedidos
- ✅ Listar pedidos por cliente
- ✅ Atualizar status de pedido
- ✅ **Publicar eventos Kafka** (orders.created, orders.paid, orders.failed)
- ✅ **Publicar eventos RabbitMQ** (ORDER_CREATED, ORDER_PAID, ORDER_FAILED)

**Banco:** MongoDB
**Eventos emitidos:** 3 (Kafka) + 3 (RabbitMQ)

### Payments Service (3004)
**Responsabilidades:**
- ✅ Processar pagamentos
- ✅ Atualizar status de transação
- ✅ **Consumir eventos Kafka** (orders.created)
- ✅ Retornar status de pagamento

**Banco:** PostgreSQL
**Eventos consumidos:** orders.created (Kafka)

### Notification Service
**Responsabilidades:**
- ✅ **Consumir eventos RabbitMQ** (ORDER_CREATED, ORDER_PAID, ORDER_FAILED)
- ✅ Enviar notificações
- ✅ Registrar logs

**Eventos consumidos:** 3 (RabbitMQ)

### Clients Service (3002)
**Responsabilidades:**
- ✅ CRUD de clientes
- ✅ Validação de dados

**Banco:** PostgreSQL

### Products Service (3003)
**Responsabilidades:**
- ✅ CRUD de produtos
- ✅ Controle de estoque
- ✅ Busca de produtos

**Banco:** PostgreSQL

---

## 💾 Bancos de Dados

### MongoDB (Orders)
```javascript
Order: {
  _id: ObjectId,
  clientId: String,
  items: [{
    productId: String,
    quantity: Number,
    price: Number
  }],
  total: Number,
  status: String, // PENDENTE | PAGO | FALHA | CANCELADO
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL (Clients, Products, Payments)
Gerenciado via Prisma ORM.

---

## 🐳 Docker Compose Services

```yaml
20+ Services:
├─ orders-service         (Node.js)
├─ payments-service       (Node.js)
├─ notification-service   (Node.js)
├─ clients-service        (Node.js)
├─ products-service       (Node.js)
├─ mongodb                (Database)
├─ postgres               (Database)
├─ kafka                  (Message Broker)
├─ zookeeper              (Kafka coordination)
├─ kafka-ui               (Monitoring)
├─ rabbitmq               (Message Broker)
├─ grafana                (Dashboards)
├─ influxdb               (Time series)
└─ ...
```

---

## 📊 Monitoramento

### Kafka UI
Acesse: **http://localhost:8080**
- Ver tópicos em tempo real
- Monitorar mensagens
- Verificar consumer groups
- Offset tracking

### RabbitMQ UI
Acesse: **http://localhost:15672** (admin/admin)
- Filas disponíveis
- Conexões ativas
- Dead letters

### Grafana
Acesse: **http://localhost:3000**
- Dashboards de performance
- Métricas de aplicação
- Alerts

---

## 🧪 Testes de Carga

### Com k6
```bash
# Teste de carga de pedidos (10 segundos, 10 VUs)
k6 run k6-scripts/order-load-test.js

# Teste de carga de pagamentos
k6 run k6-scripts/payment-load-test.js
```

### Com Postman/VS Code
Importe os arquivos `.http`:
- `api-tests.http` - Testes de APIs
- `event-driven-tests.http` - Testes de eventos

---

## ⚙️ Variáveis de Ambiente

### Obrigatórias
```env
KAFKA_BROKER=kafka:9092
RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672
MONGODB_URI=mongodb://mongo:27017/orders
DATABASE_URL=postgresql://user:password@postgres:5432/ecommerce
```

### Opcionais
```env
NODE_ENV=production
LOG_LEVEL=info
PAYMENT_TIMEOUT=30000
```

---

## 🛠️ Desenvolvimento

### Adicionar Novo Evento

1. **Definir em TOPICS/EVENTS**
   ```javascript
   // kafka-client.js
   TOPICS = {
     ORDER_NEW_EVENT: 'order.new-event'
   };
   ```

2. **Publicar**
   ```javascript
   // ordersServices.js
   kafkaClient.publishEvent(TOPICS.ORDER_NEW_EVENT, data);
   ```

3. **Consumir**
   ```javascript
   // novo-service/server.js
   await kafkaConsumer.subscribeToTopic(TOPICS.ORDER_NEW_EVENT, handler);
   ```

---

## 🚨 Troubleshooting

| Problema | Solução |
|----------|---------|
| Containers não iniciam | `docker-compose logs` → verificar erros |
| Kafka connection refused | Aguardar 30s ou `docker restart kafka` |
| Evento não aparece | `docker logs orders-service \| grep Kafka` |
| Consumer não recebe | `docker logs payments-service \| grep Consumer` |
| Limpar tudo | `docker-compose down -v` |

---

## 📚 Próximos Passos

1. ✅ Ler `KAFKA_ARCHITECTURE.md` para entender Kafka
2. ✅ Ler `RABBITMQ_ARCHITECTURE.md` para entender RabbitMQ
3. ✅ Executar teste rápido (3 min)
4. ✅ Abrir Kafka UI e monitorar eventos
5. ✅ Modificar código e adicionar novos eventos

---

## 📞 Suporte

**Dúvidas?**
- Kafka: Ver `KAFKA_ARCHITECTURE.md`
- RabbitMQ: Ver `RABBITMQ_ARCHITECTURE.md`
- Arquitetura: Ver este README
- Código: Ver comentários no `/shared/kafka-client.js`

---

**Status:** ✅ Em Produção  
**Última Atualização:** 2024-01-15  
**Autores:** GustavoOtto7
