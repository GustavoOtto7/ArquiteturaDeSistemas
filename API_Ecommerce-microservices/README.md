# E-commerce Microservices Architecture

Este projeto representa a quebra do monolito de e-commerce em uma arquitetura de microsserviços, seguindo os princípios de comunicação síncrona e containerização com Docker.

## Arquitetura

### Serviços

1. **Products Service** (Porta 3001)
   - Gerenciamento de produtos e estoque
   - Endpoint específico para atualização de estoque
   - Validação e reserva de estoque para pedidos

2. **Clients Service** (Porta 3002)
   - Cadastro e gerenciamento de clientes
   - Validação de clientes para pedidos

3. **Orders Service** (Porta 3003)
   - Gerenciamento de pedidos
   - Integração com Products e Clients Service
   - Controle de status de pedidos

4. **Payments Service** (Porta 3004)
   - Processamento de pagamentos
   - Simulação de pagamento com Math.random()
   - Notificação de confirmação de pagamento

5. **API Gateway** (Porta 8080)
   - Ponto único de entrada
   - Roteamento para microsserviços
   - Load balancing com NGINX

### Status de Pedidos
- `AGUARDANDO PAGAMENTO` (padrão)
- `FALHA NO PAGAMENTO`
- `PAGO`
- `CANCELADO`

## Executando a Aplicação

### Pré-requisitos
- Docker
- Docker Compose

### Inicialização
```bash
# Clone o repositório
cd API_Ecommerce-services

# Suba toda a infraestrutura
docker-compose up -d

# Verificar status dos serviços
docker-compose ps
```

### Verificar Saúde dos Serviços
```bash
# Verificar API Gateway
curl http://localhost:8080/health

# Verificar serviços individuais
curl http://localhost:3001/health  # Products
curl http://localhost:3002/health  # Clients  
curl http://localhost:3003/health  # Orders
curl http://localhost:3004/health  # Payments
```

## Endpoints da API

### Através do API Gateway (Porta 8080)

#### Products Service
- `GET /products-service/v1/products` - Listar produtos
- `GET /products-service/v1/products/:id` - Buscar produto
- `POST /products-service/v1/products` - Criar produto
- `PUT /products-service/v1/products/:id` - Atualizar produto (sem estoque)
- `DELETE /products-service/v1/products/:id` - Deletar produto
- `PUT /products-service/v1/products/:id/stock` - Atualizar estoque

#### Clients Service
- `GET /clients-service/v1/clients` - Listar clientes
- `GET /clients-service/v1/clients/:id` - Buscar cliente
- `POST /clients-service/v1/clients` - Criar cliente
- `PUT /clients-service/v1/clients/:id` - Atualizar cliente
- `DELETE /clients-service/v1/clients/:id` - Deletar cliente

#### Orders Service
- `GET /order-service/v1/orders` - Listar pedidos
- `GET /order-service/v1/orders/:id` - Buscar pedido
- `POST /order-service/v1/orders` - Criar pedido
- `GET /order-service/v1/orders/client/:clientId` - Pedidos por cliente

#### Payments Service
- `POST /payments-service/v1/payments/process/:orderId` - Processar pagamento
- `GET /payments-service/v1/payments/orders/:orderId` - Buscar pagamentos do pedido
- `GET /payments-service/v1/payments/types` - Listar tipos de pagamento
- `POST /payments-service/v1/payments/types` - Criar tipo de pagamento

## Exemplos de Uso

### 1. Criar Cliente
```bash
curl -X POST http://localhost:8080/clients-service/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@email.com"
  }'
```

### 2. Criar Produto
```bash
curl -X POST http://localhost:8080/products-service/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notebook",
    "price": 2500.00,
    "stock": 10
  }'
```

### 3. Criar Pedido
```bash
curl -X POST http://localhost:8080/order-service/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "uuid-do-cliente",
    "items": [{
      "productId": "uuid-do-produto",
      "productName": "Notebook",
      "quantity": 1,
      "unitPrice": 2500.00
    }]
  }'
```

### 4. Processar Pagamento
```bash
curl -X POST http://localhost:8080/payments-service/v1/payments/process/uuid-do-pedido \
  -H "Content-Type: application/json" \
  -d '{
    "payments": [{
      "typePaymentId": "uuid-do-tipo-pagamento",
      "amount": 2500.00
    }]
  }'
```

## Características Técnicas

### Comunicação Síncrona
- Requisições HTTP entre serviços
- Timeout de 10 segundos (padrão Axios)
- Tratamento de erros e fallbacks
- Health checks para monitoramento

### Banco de Dados
- PostgreSQL compartilhado entre serviços
- Schema isolado por contexto de domínio
- Migrações automáticas na inicialização

### Containerização
- Cada serviço em container Docker separado
- Multi-stage builds para otimização
- Networks isoladas para comunicação interna
- Health checks para orquestração

### Observabilidade
- Logs estruturados em cada serviço
- Health checks em todos os componentes
- Interceptors HTTP para debugging

## Configuração de Desenvolvimento

### Executar Serviço Individual
```bash
# Exemplo: Products Service
cd products-service
npm install
npm run prisma:generate
npm run dev
```

### Executar Migrações
```bash
# Dentro do container do serviço
docker exec -it products_service npx prisma migrate dev
```

### Logs dos Serviços
```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f products-service
```

## Monitoramento

### Verificar Status
- API Gateway: http://localhost:8080/health
- Products Service: http://localhost:3001/health
- Clients Service: http://localhost:3002/health
- Orders Service: http://localhost:3003/health
- Payments Service: http://localhost:3004/health

### Métricas Básicas
Cada serviço expõe informações básicas de saúde incluindo uptime e status.

## Tratamento de Erros

### Cenários Implementados
1. **Cliente não encontrado** - Orders Service valida cliente antes de criar pedido
2. **Estoque insuficiente** - Products Service valida e reserva estoque
3. **Falha no pagamento** - Payments Service simula falhas e cancela pedido
4. **Timeout de comunicação** - Axios configurado com timeout de 10s
5. **Serviço indisponível** - Health checks e retry logic

### Status HTTP
- 200: Sucesso
- 201: Criado com sucesso
- 400: Erro de validação
- 404: Recurso não encontrado
- 500: Erro interno do servidor

