#!/bin/bash

# 🧪 Script de Teste Rápido - RabbitMQ
# Executa um fluxo completo de teste

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        🐰 TESTE RÁPIDO - RABBITMQ EVENT-DRIVEN 🐰             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1/4]${NC} Verificando se RabbitMQ está rodando..."
if docker ps | grep -q rabbitmq; then
    echo -e "${GREEN}✓ RabbitMQ está rodando${NC}"
else
    echo -e "${RED}✗ RabbitMQ NÃO está rodando${NC}"
    echo "Execute: docker-compose up -d"
    exit 1
fi

echo ""
echo -e "${BLUE}[2/4]${NC} Verificando conexão com Orders Service..."
ORDERS_HEALTH=$(curl -s http://localhost:3003/health | grep -q 'ok' && echo "1" || echo "0")
if [ "$ORDERS_HEALTH" = "1" ]; then
    echo -e "${GREEN}✓ Orders Service está respondendo${NC}"
else
    echo -e "${RED}✗ Orders Service NÃO está respondendo${NC}"
    echo "Execute: cd orders-service && npm start"
    exit 1
fi

echo ""
echo -e "${BLUE}[3/4]${NC} Verificando conexão com Notification Service..."
NOTIFICATION_HEALTH=$(curl -s http://localhost:3005/health | grep -q 'ok' && echo "1" || echo "0")
if [ "$NOTIFICATION_HEALTH" = "1" ]; then
    echo -e "${GREEN}✓ Notification Service está respondendo${NC}"
else
    echo -e "${RED}✗ Notification Service NÃO está respondendo${NC}"
    echo "Execute: cd notification-service && npm start"
    exit 1
fi

echo ""
echo -e "${BLUE}[4/4]${NC} Testando fluxo: Criar Pedido..."

# Criar pedido
RESPONSE=$(curl -s -X POST http://localhost:3003/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "teste123",
    "items": [{"productId": "p1", "quantity": 1}]
  }')

# Extrair ID do pedido
ORDER_ID=$(echo $RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ORDER_ID" ]; then
    echo -e "${RED}✗ Erro ao criar pedido${NC}"
    echo "Resposta: $RESPONSE"
    exit 1
else
    echo -e "${GREEN}✓ Pedido criado com sucesso${NC}"
    echo "  Pedido ID: $ORDER_ID"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}          ✨ TODOS OS TESTES PASSARAM! ✨${NC}"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Próximas etapas:"
echo "   1. Verifique os logs dos serviços"
echo "   2. Procure por: '✓ Evento publicado: order.created'"
echo "   3. No Notification Service, procure por: 'Pedido Criado'"
echo "   4. Acesse: http://localhost:15672 (admin/admin)"
echo ""
