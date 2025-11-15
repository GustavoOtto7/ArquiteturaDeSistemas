# 🐰 Guia Completo: Testando RabbitMQ

## 📋 Resumo Executivo

Você fez requisições no Postman, mas **não viu nada no RabbitMQ**. Este guia explica:
- Como verificar se o RabbitMQ está funcionando
- Como visualizar eventos publicados
- Como confirmar que os microsserviços estão conectados
- Como debugar problemas comuns

---

## ✅ Passo 1: Verificar se RabbitMQ está rodando

### 1.1 Acessar o Dashboard do RabbitMQ

```
URL: http://localhost:15672
Usuário: admin
Senha: admin
```

**Você deve ver:**
- ✓ Um painel de controle
- ✓ "Connections" mostrando conexões ativas
- ✓ "Exchanges" com `ecommerce_events`
- ✓ "Queues" com filas criadas

### 1.2 Verificar Docker

```powershell
docker ps | grep rabbitmq
```

**Resultado esperado:**
```
rabbitmq   ports: 5672, 15672
```

Se não aparecer, inicie o container:
```powershell
docker-compose up -d
```

---

## 🔌 Passo 2: Verificar Conexões dos Microsserviços

### 2.1 Orders Service

Inicie em um terminal:
```bash
cd orders-service
npm install
npm start
```

**Procure por esta mensagem no console:**
```
✓ RabbitMQ inicializado no Orders Service
✓ Conectado ao RabbitMQ
```

### 2.2 Notification Service

Inicie em outro terminal:
```bash
cd notification-service
npm install
npm start
```

**Procure por estas mensagens no console:**
```
✓ Conectado ao RabbitMQ
✓ Consumidor iniciado para: order.created
✓ Consumidor iniciado para: order.paid
✓ Consumidor iniciado para: order.failed
✓ Consumidor iniciado para: payment.processed
```

---

## 🧪 Passo 3: Testar Criando um Pedido

### 3.1 Fazer requisição POST no Postman

```
POST http://localhost:3003/v1/orders
Content-Type: application/json

Body:
{
  "clientId": "c1",
  "items": [
    {
      "productId": "p1",
      "quantity": 1
    }
  ]
}
```

### 3.2 O que você deve ver

#### No Console do Orders Service:
```
✓ Evento publicado: order.created
```

#### No Console do Notification Service:
```
🔄 Roteando evento: order.created
📦 ========== EVENTO: Pedido Criado ==========
   🆔 Pedido ID: [id-do-pedido]
   👤 Cliente ID: c1
   💰 Valor Total: R$ XX.XX
   ...
✅ Notificação enviada para cliente c1
```

#### No Dashboard RabbitMQ (http://localhost:15672):
1. Vá para **Exchanges**
2. Clique em **ecommerce_events**
3. Deve estar com **Messages** > 0

---

## 🔍 Passo 4: Visualizar Mensagens no RabbitMQ

### 4.1 Via Dashboard

1. Acesse http://localhost:15672
2. Clique em **Queues**
3. Procure por filas: `queue_order.created_notifications`, etc
4. Clique em uma fila
5. Clique em **Get messages**
6. Você verá a mensagem em JSON

### 4.2 Estrutura da Mensagem

```json
{
  "type": "order.created",
  "timestamp": "2025-11-15T10:30:45.123Z",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "clientId": "c1",
    "total": 99.99,
    "status": "AGUARDANDO PAGAMENTO",
    "itemsCount": 1,
    "createdAt": "2025-11-15T10:30:45.123Z"
  }
}
```

---

## 🐛 Passo 5: Debugar Problemas

### Problema 1: "RabbitMQ não está conectando"

**Sintomas:**
```
✗ Erro ao conectar ao RabbitMQ: ...
```

**Solução:**
```powershell
# Verifique se RabbitMQ está rodando
docker ps | grep rabbitmq

# Se não aparecer, inicie:
docker-compose up -d rabbitmq

# Se continuar falhando, limpe os containers:
docker-compose down
docker-compose up -d
```

### Problema 2: "Criei pedido mas não vejo mensagens"

**Sintomas:**
- Pedido criado com sucesso (HTTP 200)
- Mas não aparecem mensagens no console
- Ou não aparecem no Dashboard do RabbitMQ

**Solução - Verificação 1:**
```bash
# Terminal do Orders Service - deve mostrar:
✓ Evento publicado: order.created
```

Se não aparecer, a publicação está falhando.

**Solução - Verificação 2:**
```bash
# Terminal do Notification Service - deve mostrar:
✓ Conectado ao RabbitMQ
✓ Consumidor iniciado para: order.created
```

Se não aparece "Consumidor iniciado", o consumer não conectou.

### Problema 3: "Mensagens na fila mas não são consumidas"

**Causas possíveis:**
1. Notification Service não está rodando
2. Notification Service não conseguiu se conectar
3. Há um erro dentro do `dispatchNotification`

**Debug:**
```bash
# 1. Verifique que o notification-service está rodando
docker ps | grep notification

# 2. Veja os logs
docker logs notification-service

# 3. Procure por mensagens de erro
```

### Problema 4: "Vejo 'ES module' error"

**Erro:**
```
Cannot find module ... (while trying to use ES modules)
```

**Solução:**
Isso foi corrigido automaticamente. Execute:
```bash
# Limpe node_modules
rm -r notification-service/node_modules
# Reinstale
cd notification-service
npm install
npm start
```

---

## 📊 Passo 6: Monitorar em Tempo Real

### 6.1 Dashboard RabbitMQ

Abra http://localhost:15672 em uma aba:
- **Connections**: Número de conexões ativas
- **Channels**: Canais abertos
- **Queues**: Mensagens esperando

### 6.2 Logs em Tempo Real

Terminal 1 - Orders Service:
```bash
cd orders-service && npm start
```

Terminal 2 - Notification Service:
```bash
cd notification-service && npm start
```

Terminal 3 - Criar testes:
```bash
# Fazer requisições POST
curl -X POST http://localhost:3003/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"clientId":"c1","items":[{"productId":"p1","quantity":1}]}'
```

---

## ✨ Teste Completo: Fluxo Event-Driven

### 1. Iniciar RabbitMQ
```powershell
docker-compose up -d
```

### 2. Terminal 1 - Orders Service
```bash
cd orders-service
npm install
npm start
```

Aguarde ver:
```
✓ RabbitMQ inicializado no Orders Service
```

### 3. Terminal 2 - Notification Service
```bash
cd notification-service
npm install
npm start
```

Aguarde ver:
```
✓ Consumidores de eventos inicializados com sucesso
✓ Consumidor iniciado para: order.created
✓ Consumidor iniciado para: order.paid
```

### 4. Terminal 3 - Criar Pedido
```bash
curl -X POST http://localhost:3003/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "cliente123",
    "items": [{"productId": "produto1", "quantity": 2}]
  }'
```

### 5. Observar Fluxo

**Orders Service deve mostrar:**
```
✓ Evento publicado: order.created
```

**Notification Service deve mostrar:**
```
🔄 Roteando evento: order.created
📦 ========== EVENTO: Pedido Criado ==========
   🆔 Pedido ID: [id]
   👤 Cliente ID: cliente123
   ...
✅ Notificação enviada para cliente cliente123
```

---

## 🎯 Teste Avançado: Sequência Completa

### 1. Criar Pedido
```bash
curl -X POST http://localhost:3003/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"clientId":"c1","items":[{"productId":"p1","quantity":1}]}'
```

**Response:**
```json
{
  "_id": "ORDER_ID",
  "status": "AGUARDANDO PAGAMENTO",
  "total": 99.99
}
```

### 2. Atualizar para PAGO
```bash
curl -X PATCH http://localhost:3003/v1/orders/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "PAGO"}'
```

Notification Service deve mostrar:
```
Nome: Cliente - ID: c1, seu pedido com ID (ORDER_ID) foi PAGO com sucesso...
```

### 3. Atualizar para FALHA
```bash
curl -X PATCH http://localhost:3003/v1/orders/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "FALHA NO PAGAMENTO"}'
```

Notification Service deve mostrar:
```
❌ ========== EVENTO: Falha no Pagamento ==========
```

---

## 📞 Endpoints de Health Check

### Verificar Status dos Serviços

**Orders Service:**
```bash
curl http://localhost:3003/health
```

Resposta:
```json
{
  "service": "orders-service",
  "status": "ok",
  "rabbitMQ": "connected"
}
```

**Notification Service:**
```bash
curl http://localhost:3005/health
```

Resposta:
```json
{
  "service": "notification-service",
  "status": "ok",
  "rabbitmq": "connected"
}
```

---

## 🔧 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| RabbitMQ não aparece no `docker ps` | `docker-compose up -d` |
| "Cannot connect to RabbitMQ" | Verifique se MongoDB também está rodando |
| Mensagens não sendo consumidas | Reinicie o notification-service |
| Acesso recusado ao Dashboard (15672) | Padrão é admin/admin |
| Filas vazias mesmo após requisição | Aguarde 2-3 segundos, depois recarregue |

---

## 📈 Próximas Etapas

1. **Adicionar Logging Persistente**
   - Salvar eventos em banco de dados
   - Criar histórico de eventos

2. **Dead Letter Queue (DLQ)**
   - Guardar mensagens que falham permanentemente
   - Análise de erros

3. **Métricas com InfluxDB**
   - Medir latência de processamento
   - Contar eventos por tipo

4. **Testes Automatizados**
   - Jest para testes unitários
   - Mocha para testes de integração

---

**Documento atualizado em 15 de novembro de 2025**
