# 🏗️ Arquitetura Completa do Sistema E-commerce

## 📊 Visão Geral do Projeto

Sistema de **microserviços com arquitetura orientada a eventos** para um e-commerce completo. Todos os serviços rodam em **Docker** e se comunicam via **RabbitMQ** para máxima escalabilidade e desacoplamento.

---

## 🏢 Estrutura de Pastas

```
API_Ecommerce-microservices/
│
├── 📁 clients-service/           # Gerenciamento de clientes
│   ├── server.js                 # Servidor Express
│   ├── controllers/              # Lógica de requisição
│   ├── services/                 # Lógica de negócio
│   ├── routes/                   # Definição de endpoints
│   ├── prisma/                   # Schema do banco de dados
│   └── Dockerfile                # Build da imagem Docker
│
├── 📁 orders-service/            # Gerenciamento de pedidos [PUBLISHER]
│   ├── server.js                 # Servidor Express
│   ├── controllers/              # Lógica de requisição
│   ├── services/                 # Lógica de negócio
│   ├── routes/                   # Definição de endpoints
│   ├── shared/
│   │   └── rabbitmq-client.js   # Cliente RabbitMQ (Publisher)
│   ├── prisma/                   # Schema MongoDB
│   └── Dockerfile                # Build da imagem Docker
│
├── 📁 products-service/          # Gerenciamento de produtos
│   ├── server.js                 # Servidor Express
│   ├── controllers/              # Lógica de requisição
│   ├── services/                 # Lógica de negócio
│   ├── routes/                   # Definição de endpoints
│   ├── prisma/                   # Schema do banco de dados
│   └── Dockerfile                # Build da imagem Docker
│
├── 📁 payments-service/          # Processamento de pagamentos
│   ├── server.js                 # Servidor Express
│   ├── controllers/              # Lógica de requisição
│   ├── services/                 # Lógica de negócio
│   ├── routes/                   # Definição de endpoints
│   ├── prisma/                   # Schema do banco de dados
│   └── Dockerfile                # Build da imagem Docker
│
├── 📁 notification-service/      # Notificações [CONSUMER]
│   ├── server.js                 # Servidor Express
│   ├── rabbitmq-client.js        # Cliente RabbitMQ (Consumer)
│   ├── notificationHandler.js    # Handlers de eventos
│   ├── package.json              # Dependências
│   └── Dockerfile                # Build da imagem Docker
│
├── 📁 shared/                    # Código compartilhado
│   ├── axios-config.js           # Configuração HTTP
│   └── rabbitmq-client.js        # Cliente RabbitMQ (alternativo)
│
├── 📁 documentation/             # 📚 Documentação
│   ├── README.md                 # ← Você está aqui (Visão Geral)
│   ├── EVENT_DRIVEN_ARCHITECTURE.md  # Detalhes técnicos
│   └── RABBITMQ_TESTING_GUIDE.md    # Como testar
│
├── 📁 k6-scripts/                # Testes de carga
│   ├── order-load-test.js        # Teste de pedidos
│   └── payment-load-test.js      # Teste de pagamentos
│
├── docker-compose.yml            # Orquestração de containers
├── .gitignore                    # Arquivos ignorados pelo Git
└── README.md                     # README da raiz
```

---

## 🚀 Serviços Disponíveis

| Serviço | Porta | Função | Tipo |
|---------|-------|--------|------|
| **Orders Service** | 3003 | Gerencia pedidos | Publisher |
| **Clients Service** | 3002 | Gerencia clientes | Serviço |
| **Products Service** | 3001 | Gerencia produtos | Serviço |
| **Payments Service** | 3004 | Processa pagamentos | Serviço |
| **Notification Service** | 3005 | Envia notificações | Consumer |
| **RabbitMQ** | 5672 / 15672 | Message Broker | Infraestrutura |
| **MongoDB** | 27017 | Banco de dados (Orders) | Infraestrutura |
| **PostgreSQL** | 5433-5435 | Bancos de dados | Infraestrutura |
| **Grafana** | 3000 | Dashboard de métricas | Monitoramento |
| **InfluxDB** | 8086 | Time-series database | Monitoramento |

---

## 🗄️ Bancos de Dados

| Banco | Serviço | Tipo | Detalhes |
|-------|---------|------|----------|
| **MongoDB** | Orders Service | NoSQL | orders_db |
| **PostgreSQL 1** | Clients Service | Relacional | clients_db (porta 5434) |
| **PostgreSQL 2** | Products Service | Relacional | products_db (porta 5433) |
| **PostgreSQL 3** | Payments Service | Relacional | payments_db (porta 5435) |

---

## 🔄 Fluxo Event-Driven

### Criando um Pedido:
```
Cliente → POST /v1/orders
    ↓
Orders Service → Cria pedido + Publica "order.created"
    ↓
RabbitMQ → Roteia para fila
    ↓
Notification Service → Consome evento
    ↓
Notification Service → Log: "Pedido Criado com Sucesso!"
```

### Processando Pagamento:
```
Payments Service → Processa pagamento
    ↓
Payments Service → Atualiza status do pedido
    ↓
Orders Service → Publica "order.paid" ou "order.failed"
    ↓
RabbitMQ → Roteia para fila
    ↓
Notification Service → Consome evento
    ↓
Notification Service → Log: "Pagamento Confirmado!" ou "Falha no Pagamento"
```

---

## 📚 Documentação Disponível

### 1. **README.md** (este arquivo)
   - Estrutura completa do projeto
   - Visão geral dos serviços
   - Bancos de dados

### 2. **EVENT_DRIVEN_ARCHITECTURE.md**
   - Arquitetura orientada a eventos em detalhes
   - Padrões de implementação
   - Handlers de eventos
   - Como adicionar novos eventos

### 3. **RABBITMQ_TESTING_GUIDE.md**
   - Como testar o sistema
   - Comandos Docker úteis
   - Endpoints para Postman
   - Troubleshooting

---

## 🐳 Iniciando o Sistema

### Prerequisitos
- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)

### Iniciar todos os containers:
```bash
docker-compose up -d
```

### Ver status dos containers:
```bash
docker ps
```

### Ver logs em tempo real:
```bash
# Todos os serviços
docker-compose logs -f

# Apenas um serviço
docker logs -f notification_service
```

### Parar todos os containers:
```bash
docker-compose down
```

---

## ✅ Verificação Rápida

| Componente | URL | Credenciais |
|-----------|-----|-------------|
| **Orders Service** | http://localhost:3003/health | - |
| **Notification Service** | http://localhost:3005/health | - |
| **RabbitMQ Dashboard** | http://localhost:15672 | admin/admin |
| **Grafana** | http://localhost:3000 | admin/admin |

---

## 🎯 Próximos Passos

1. Leia: **EVENT_DRIVEN_ARCHITECTURE.md** para entender como funciona
2. Teste: **RABBITMQ_TESTING_GUIDE.md** para fazer seus primeiros testes
3. Implemente: Adicione novos eventos seguindo o padrão existente

---

## 📋 Comandos Úteis

```bash
# Reconstruir serviços específicos
docker-compose up -d --build orders-service

# Ver logs de um serviço específico
docker logs -f orders_service

# Acessar shell de um container
docker exec -it orders_service sh

# Limpar tudo e recomeçar
docker-compose down && docker-compose up -d

# Ver recursos utilizados
docker stats
```

---

## 📝 Notas Importantes

- Todos os serviços rodam em **containers Docker isolados**
- Comunicação entre serviços é **100% assíncrona via RabbitMQ**
- Cada serviço tem seu próprio banco de dados (**Database per Service**)
- Escalabilidade garantida através do padrão **pub/sub**
- Sem pontos únicos de falha (**Single Point of Failure**)

---

**Última atualização: 15 de novembro de 2025**
