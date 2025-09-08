# 🛒 E-commerce API - Arquitetura de Sistemas

API REST completa para um sistema de e-commerce

## 🏗️ Arquitetura Implementada

A API segue a arquitetura apresentada no diagrama com as seguintes entidades:

### Entidades Principais:
- **Products** - Produtos do catálogo
- **Clients** - Clientes do sistema (com soft delete)
- **Orders** - Pedidos realizados pelos clientes
- **OrderItems** - Items específicos de cada pedido
- **Status** - Status dos pedidos (Pendente, Processando, etc.)
- **TypePayment** - Tipos de pagamento disponíveis
- **OrderPayment** - Pagamentos realizados para cada pedido

## Endpoints Disponíveis

### Produtos (`/products`)
- `GET /products` - Listar todos os produtos
- `GET /products/:id` - Obter produto específico
- `POST /products` - Criar novo produto
- `PUT /products/:id` - Atualizar produto
- `DELETE /products/:id` - Deletar produto

### Clientes (`/clients`)
- `GET /clients` - Listar todos os clientes (não deletados)
- `GET /clients/:id` - Obter cliente específico
- `POST /clients` - Criar novo cliente
- `PUT /clients/:id` - Atualizar cliente
- `DELETE /clients/:id` - Deletar cliente (soft delete)

### Pedidos (`/orders`)
- `GET /orders` - Listar todos os pedidos (com cliente e status)
- `POST /orders` - Criar novo pedido (requer clientId)

###  Sistema
- `GET /status` - Listar status disponíveis
- `POST /status` - Criar novo status
- `GET /payment-types` - Listar tipos de pagamento
- `POST /payment-types` - Criar novo tipo de pagamento

###  Saúde
- `GET /health` - Status da aplicação
- `GET /test-db` - Testar conexão com banco

## Como Executar

### 1. Iniciar o banco de dados:
```bash
docker-compose up -d
```

### 2. Executar migrações:
```bash
cd Api_Ecommerce
npx prisma migrate dev --name add-clients-and-payments
```

### 3. Executar seed (dados iniciais):
```bash
npm run prisma:seed
```

### 4. Iniciar a aplicação:
```bash
npm start
```

## Dados Iniciais (Seed)

O script de seed cria automaticamente:

### Status:
- Pendente
- Processando  
- Enviado
- Entregue
- Cancelado

### Tipos de Pagamento:
- Cartão de Crédito
- Cartão de Débito
- PIX
- Boleto

##  Testando a API

Use o arquivo `testes-api.http` com a extensão REST Client do VS Code para testar todos os endpoints.

### Fluxo de Teste Recomendado:
1. Criar produtos
2. Criar clientes
3. Criar pedidos (vinculando cliente e produtos)
4. Verificar status e tipos de pagamento

##  Validações Implementadas

### Produtos:
- Nome obrigatório (string não vazia)
- Preço obrigatório (número positivo)
- Estoque obrigatório (inteiro não negativo)

### Clientes:
- Nome obrigatório (string não vazia)
- Email obrigatório (formato válido)
- Email único no sistema

### Pedidos:
- Cliente obrigatório (deve existir e não estar deletado)
- Pelo menos 1 item obrigatório
- Validação de estoque automática
- Status padrão "Pendente" criado automaticamente

##  Recursos de Segurança

- Soft delete para clientes (não remove fisicamente)
- Validação de estoque antes de criar pedidos
- Validação de existência de cliente antes de criar pedidos
- Tratamento de erros centralizado

##  Relacionamentos

- **Order** ↔ **Client** (Many-to-One)
- **Order** ↔ **Status** (Many-to-One)
- **Order** ↔ **OrderItem** (One-to-Many)
- **Order** ↔ **OrderPayment** (One-to-Many)
- **OrderItem** ↔ **Product** (Many-to-One)
- **OrderPayment** ↔ **TypePayment** (Many-to-One)

##  Tecnologias

- **Node.js** + **Express.js**
- **Prisma ORM**
- **PostgreSQL**
- **Docker** + **Docker Compose**

