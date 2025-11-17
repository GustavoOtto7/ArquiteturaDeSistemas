# ⚡ Quick Start - Kafka Event-Driven Architecture

## 🚀 Iniciar Arquitetura Completa (30 segundos)

```bash
# 1. Limpar e iniciar
docker-compose down -v && docker-compose up -d --build

# 2. Aguardar health checks (20-30 segundos)
sleep 30

# 3. Verificar status
docker ps | grep -E "orders|payments|kafka"
```

---

## 📝 Teste Rápido (2 minutos)

### 1. Criar Cliente
```bash
curl -X POST http://localhost:3002/v1/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@test.com","phone":"119","cpf":"123"}'
```
**Copie o `id` retornado**

### 2. Criar Produto
```bash
curl -X POST http://localhost:3003/v1/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto","description":"Desc","price":100,"quantity":10}'
```
**Copie o `id` retornado**

### 3. Criar Pedido (🎉 Publica no Kafka!)
```bash
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientId":"CLIENT_ID",
    "items":[{"productId":"PRODUCT_ID","quantity":1,"price":100}],
    "total":100,
    "payments":[{"typePaymentId":1,"amount":100}]
  }'
```

### 4. 🔍 Ver Evento no Kafka UI
Abra: **http://localhost:8080**
- Topics → orders.created → Messages
- **✅ Você deve ver o evento aí!**

### 5. 📊 Confirmar Consumer Recebeu
```bash
docker logs payments-service | grep "Evento orders.created"
```
**Output esperado:** `📨 [Kafka Consumer] Evento orders.created recebido:`

---

## 🛠️ URLs Principais

| Serviço | URL | Porta |
|---------|-----|-------|
| Orders API | http://localhost:3001 | 3001 |
| Clients API | http://localhost:3002 | 3002 |
| Products API | http://localhost:3003 | 3003 |
| Payments API | http://localhost:3004 | 3004 |
| **Kafka UI** | **http://localhost:8080** | **8080** |
| Kafka Broker | kafka:9092 (container) | 9092 |
| RabbitMQ UI | http://localhost:15672 | 15672 |

---

## 📚 Documentação Completa

Para testes detalhados, consulte: **KAFKA_TESTING_GUIDE.md**

---

## ❓ Help

**P: Como vejo todas as mensagens do Kafka?**
R: Abra http://localhost:8080 → Topics → orders.created

**P: Consumer não recebeu a mensagem?**
R: Execute `docker logs payments-service | grep "Kafka"`

**P: Como resetar tudo?**
R: `docker-compose down -v && docker-compose up -d --build`

---

**Status:** ✅ Kafka + RabbitMQ Funcionando
