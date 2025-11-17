# 🚀 Guia Completo de Testes - Arquitetura Event-Driven com Kafka

## Visão Geral

Este guia demonstra como testar a arquitetura event-driven do e-commerce com **Kafka** como message broker. O fluxo funciona como:

```
Orders Service (Publisher)
    ↓
    └─→ Cria pedido
        └─→ Publica evento: orders.created → Kafka topic
            ↓
Payments Service (Consumer)
    ├─→ Recebe evento orders.created
    └─→ Processa pagamento com dados do pedido
```

---

## 📋 Pré-Requisitos

1. **Docker & Docker Compose** instalados
2. **Node.js 14+** (para chamar APIs diretamente, opcional)
3. **curl** ou **Postman** para fazer requisições HTTP
4. **Git** para clonar o repositório

---

## 🐳 Passo 1: Iniciar os Containers

### 1.1 Limpar e Iniciar do Zero

```bash
# Remover containers antigos e volumes
docker-compose down -v

# Reconstruir imagens e iniciar
docker-compose up -d --build
```

### 1.2 Verificar Status

```bash
# Listar containers
docker ps

# Verificar logs
docker logs -f orders-service
docker logs -f payments-service
docker logs -f kafka
```

**Saída esperada:**
```
✅ Orders Service iniciado em http://localhost:3001
✅ Kafka Producer conectado!

✨ Payments Service iniciado em http://localhost:3004
📨 Ouvindo eventos Kafka no tópico: orders.created
```

---

## 🌐 Passo 2: Verificar Health Checks

### 2.1 Orders Service

```bash
curl -s http://localhost:3001/health | jq .
```

**Resposta esperada:**
```json
{
  "service": "orders-service",
  "status": "ok",
  "uptime": 12.345,
  "kafka": "connected"
}
```

### 2.2 Payments Service

```bash
curl -s http://localhost:3004/health | jq .
```

**Resposta esperada:**
```json
{
  "service": "payments-service",
  "status": "ok",
  "uptime": 8.234,
  "kafka": "connected"
}
```

### 2.3 Kafka Broker

```bash
# Verificar se Kafka está respondendo
docker exec kafka kafka-broker-api-versions.sh --bootstrap-server localhost:9092
```

---

## 📊 Passo 3: Usar Kafka UI (Dashboard)

### 3.1 Acessar Kafka UI

Abra seu navegador e acesse: **http://localhost:8080**

### 3.2 Visualizar Tópicos

1. Clique em **"Clusters"** no menu lateral
2. Selecione **"ecommerce-cluster"**
3. Você deve ver os tópicos criados:
   - `orders.created`
   - `orders.paid`
   - `orders.failed`

### 3.3 Monitorar Mensagens em Tempo Real

1. Clique no tópico **`orders.created`**
2. Verifique as **"Messages"**
3. Você verá as mensagens conforme forem publicadas

---

## 🧪 Passo 4: Teste de Ponta a Ponta (E2E)

### 4.1 Criar um Cliente (pré-requisito)

```bash
# Criar cliente
curl -X POST http://localhost:3002/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "11999999999",
    "cpf": "12345678901"
  }' | jq .
```

**Resposta esperada:**
```json
{
  "id": "1",
  "name": "João Silva",
  "email": "joao@example.com"
}
```

✅ Copie o `id` (vamos usar na próxima requisição)

### 4.2 Criar um Produto (pré-requisito)

```bash
# Criar produto
curl -X POST http://localhost:3003/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notebook Dell",
    "description": "Notebook de alto desempenho",
    "price": 4500.00,
    "quantity": 10
  }' | jq .
```

**Resposta esperada:**
```json
{
  "id": "1",
  "name": "Notebook Dell",
  "price": 4500.00
}
```

✅ Copie o `id` (vamos usar na próxima requisição)

### 4.3 Criar um Pedido (DISPARA O EVENTO KAFKA!)

Este é o teste principal que publica o evento no Kafka:

```bash
# Criar pedido - ISSO PUBLICA NO KAFKA
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "1",
    "items": [
      {
        "productId": "1",
        "quantity": 1,
        "price": 4500.00
      }
    ],
    "total": 4500.00,
    "payments": [
      {
        "typePaymentId": 1,
        "amount": 4500.00
      }
    ]
  }' | jq .
```

**Resposta esperada:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "clientId": "1",
  "status": "PENDENTE",
  "total": 4500.00,
  "items": [
    {
      "productId": "1",
      "quantity": 1
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

✅ Pedido criado! O evento `orders.created` foi publicado no Kafka!

---

## 🔍 Passo 5: Verificar Eventos no Kafka

### 5.1 Via Kafka UI (Recomendado)

1. Abra **http://localhost:8080**
2. Clique em **"Topics"**
3. Selecione **"orders.created"**
4. Na aba **"Messages"**, você deve ver a mensagem que foi publicada:

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

### 5.2 Via Terminal (Kafka CLI)

```bash
# Ler últimas 10 mensagens do tópico orders.created
docker exec kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders.created \
  --from-beginning \
  --max-messages 10
```

### 5.3 Verificar Logs do Payments Service

```bash
docker logs payments-service | grep "Evento orders.created recebido"
```

**Saída esperada:**
```
📨 [Kafka Consumer] Evento orders.created recebido: {
  orderId: '507f1f77bcf86cd799439011',
  clientId: '1',
  total: 4500.00,
  ...
}
✅ Processando pagamento para pedido 507f1f77bcf86cd799439011 do cliente 1
   Total a pagar: R$ 4500.00
   Itens: 1 produto(s)
```

---

## 📈 Passo 6: Teste de Carga com Múltiplos Pedidos

### 6.1 Criar Script de Teste

Crie um arquivo `test-kafka-events.sh`:

```bash
#!/bin/bash

# Configurações
ORDERS_API="http://localhost:3001/v1/orders"
NUM_REQUESTS=10
CLIENT_ID="1"
PRODUCT_ID="1"

echo "🚀 Iniciando teste de carga - Publicando $NUM_REQUESTS pedidos..."
echo ""

for i in $(seq 1 $NUM_REQUESTS); do
  echo "📦 Pedido $i/$NUM_REQUESTS..."
  
  curl -s -X POST "$ORDERS_API" \
    -H "Content-Type: application/json" \
    -d "{
      \"clientId\": \"$CLIENT_ID\",
      \"items\": [
        {
          \"productId\": \"$PRODUCT_ID\",
          \"quantity\": 1,
          \"price\": 4500.00
        }
      ],
      \"total\": 4500.00,
      \"payments\": [
        {
          \"typePaymentId\": 1,
          \"amount\": 4500.00
        }
      ]
    }" | jq -r '._id' > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Sucesso"
  else
    echo "   ❌ Erro"
  fi
  
  sleep 1  # Aguardar 1 segundo entre requisições
done

echo ""
echo "✨ Teste de carga concluído!"
echo "📊 Acesse http://localhost:8080 para verificar as mensagens no Kafka"
```

### 6.2 Executar Teste de Carga

```bash
chmod +x test-kafka-events.sh
./test-kafka-events.sh
```

### 6.3 Monitorar no Kafka UI

1. Abra **http://localhost:8080**
2. Vá para **Topics → orders.created → Messages**
3. Você verá as 10 mensagens sendo adicionadas em tempo real

---

## 🔄 Passo 7: Testar Fluxo Completo de Statusagem

### 7.1 Atualizar Status do Pedido para PAGO

```bash
# Atualizar status para PAGO (publica evento orders.paid)
curl -X PATCH http://localhost:3001/v1/orders/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAGO"
  }' | jq .
```

### 7.2 Verificar Evento no Kafka UI

1. Vá para **Topics → orders.paid**
2. Você deve ver a mensagem:

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "clientId": "1",
  "status": "PAGO",
  "total": 4500.00,
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

### 7.3 Testar Status CANCELADO

```bash
# Atualizar para CANCELADO (publica evento orders.failed)
curl -X PATCH http://localhost:3001/v1/orders/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CANCELADO"
  }' | jq .
```

---

## 📝 Passo 8: Usando Arquivo HTTP para Postman/VS Code

Crie um arquivo `kafka-tests.http` na raiz do projeto:

```http
### Health Check - Orders Service
GET http://localhost:3001/health

### Health Check - Payments Service
GET http://localhost:3004/health

### Criar Cliente
POST http://localhost:3002/v1/clients
Content-Type: application/json

{
  "name": "Teste Kafka",
  "email": "teste.kafka@example.com",
  "phone": "11988888888",
  "cpf": "98765432100"
}

### Criar Produto
POST http://localhost:3003/v1/products
Content-Type: application/json

{
  "name": "Produto Teste",
  "description": "Produto para teste Kafka",
  "price": 999.99,
  "quantity": 100
}

### Criar Pedido (PUBLICA NO KAFKA)
POST http://localhost:3001/v1/orders
Content-Type: application/json

{
  "clientId": "1",
  "items": [
    {
      "productId": "1",
      "quantity": 1,
      "price": 999.99
    }
  ],
  "total": 999.99,
  "payments": [
    {
      "typePaymentId": 1,
      "amount": 999.99
    }
  ]
}

### Listar Pedidos
GET http://localhost:3001/v1/orders

### Atualizar Status para PAGO (PUBLICA NO KAFKA)
PATCH http://localhost:3001/v1/orders/{orderId}
Content-Type: application/json

{
  "status": "PAGO"
}

### Atualizar Status para CANCELADO (PUBLICA NO KAFKA)
PATCH http://localhost:3001/v1/orders/{orderId}
Content-Type: application/json

{
  "status": "CANCELADO"
}
```

---

## 🛠️ Passo 9: Troubleshooting

### Problema: "Kafka: Unreachable"

**Solução:**
```bash
docker-compose down -v
docker-compose up -d --build kafka zookeeper
sleep 10
docker-compose up -d --build
```

### Problema: Evento não aparece no Kafka UI

**Solução:**
1. Verifique se o Orders Service está logando: `docker logs orders-service | grep Kafka`
2. Conecte-se ao Kafka CLI:
```bash
docker exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092
```

### Problema: Payments Service não consome eventos

**Solução:**
1. Verifique se o Payments Service está rodando: `docker ps | grep payments`
2. Verifique se está se inscrevendo no tópico:
```bash
docker logs payments-service | grep "Inscrito ao tópico"
```

### Problema: "Tópico não existe"

**Solução:**
```bash
# Criar tópicos manualmente se necessário
docker exec kafka kafka-topics.sh --create --topic orders.created \
  --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

docker exec kafka kafka-topics.sh --create --topic orders.paid \
  --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

docker exec kafka kafka-topics.sh --create --topic orders.failed \
  --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

---

## 📊 Passo 10: Monitorar Performance

### 10.1 Ver Estatísticas do Consumer

```bash
docker exec kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group payments-service-group
```

**Saída esperada:**
```
GROUP                  TOPIC           PARTITION CURRENT-OFFSET LOG-END-OFFSET LAG
payments-service-group orders.created  0         5              5              0
```

### 10.2 Ver Offsets do Tópico

```bash
docker exec kafka kafka-log-dirs.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic-list orders.created
```

---

## ✅ Checklist de Verificação

- [ ] Docker containers estão rodando
- [ ] Health checks retornam status "ok"
- [ ] Kafka UI está acessível em http://localhost:8080
- [ ] Tópicos Kafka existem (orders.created, orders.paid, orders.failed)
- [ ] Pedido criado com sucesso via POST /v1/orders
- [ ] Evento "orders.created" aparece no Kafka UI
- [ ] Payments Service loga "Evento orders.created recebido"
- [ ] Status atualizado com sucesso (PAGO/CANCELADO)
- [ ] Eventos correspondentes aparecem no Kafka
- [ ] Teste de carga funciona corretamente

---

## 🎯 Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    KAFKA MESSAGE BROKER                         │
│  Topics: orders.created | orders.paid | orders.failed          │
└─────────────────────────────────────────────────────────────────┘
              ↑                                      ↑
              │                                      │
         PUBLISH                                 CONSUME
              │                                      │
    ┌─────────────────────┐          ┌──────────────────────┐
    │ ORDERS SERVICE      │          │ PAYMENTS SERVICE     │
    │ (Publisher)         │          │ (Consumer)           │
    │                     │          │                      │
    │ POST /orders → 🚀   │          │📨 Recebe evento      │
    │ PATCH /orders → 🚀  │          │   Processa pagamento │
    └─────────────────────┘          └──────────────────────┘
            │                                     │
            └─────────────────────┬───────────────┘
                                  ↓
                        ┌──────────────────────┐
                        │  KAFKA UI (8080)     │
                        │  Dashboard em Tempo  │
                        │  Real                │
                        └──────────────────────┘
```

---

## 📚 Recursos Adicionais

- [Apache Kafka Docs](https://kafka.apache.org/documentation/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Kafka UI Project](https://docs.kafkaui.axiom.co/)
- [Event-Driven Architecture Pattern](https://martinfowler.com/articles/201701-event-driven.html)

---

**Última atualização:** 2024-01-15  
**Status:** ✅ Funcionando completamente
