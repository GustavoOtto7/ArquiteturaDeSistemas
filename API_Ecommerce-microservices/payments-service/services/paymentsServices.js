const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createError } = require('../utils/errors');
const axios = require('../utils/axios-config');

const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3003';
const CLIENTS_SERVICE_URL = process.env.CLIENTS_SERVICE_URL || 'http://localhost:3002';

// Simula processamento de pagamento usando Math.random()
function simulatePayment() {
  return Math.random() > 0.3; // 70% de chance de sucesso
}

module.exports = {
  processPayment: async (orderId, payments) => {
    // 1. Validar se o pedido existe e está no status correto
    let order;
    try {
      const orderResponse = await axios.get(`${ORDERS_SERVICE_URL}/v1/orders/${orderId}`);
      order = orderResponse.data;
      
      if (!order) {
        throw createError(404, 'Order not found');
      }
      
      console.log('Order status:', order.status, 'Type:', typeof order.status);
      if (order.status !== 'AGUARDANDO PAGAMENTO') {
        throw createError(400, `Cannot process payment for order with status: '${order.status}'`);
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        throw createError(404, 'Order not found');
      }
      if (error.status) throw error; // Re-throw our custom errors
      throw createError(500, 'Error validating order');
    }
    
    // Simplificado: assumir que não há pagamentos prévios por enquanto
    const totalNewPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalNewPayments > order.total) {
      throw createError(400, `Payment amount (${totalNewPayments}) exceeds order total (${order.total})`);
    }
    
    // 2. Validar pagamentos antes de processar
    for (const payment of payments) {
      if (!payment.amount || payment.amount <= 0) {
        throw createError(400, 'Payment amount must be greater than zero');
      }
      
      if (!payment.typePaymentId) {
        throw createError(400, 'Payment type is required');
      }
    }

    // 3. Processar cada pagamento
    const paymentResults = [];
    let allPaymentsSuccessful = true;
    
    for (const payment of payments) {
      // Validar se o tipo de pagamento existe
      const paymentType = await prisma.typePayment.findUnique({
        where: { id: payment.typePaymentId }
      });
      
      if (!paymentType) {
        throw createError(400, `Payment type ${payment.typePaymentId} not found`);
      }
      
      // Simular processamento do pagamento
      const success = simulatePayment();
      const status = success ? 'SUCCESS' : 'FAILED';
      
      if (!success) {
        allPaymentsSuccessful = false;
      }
      
      // Salvar registro do pagamento
      const orderPayment = await prisma.orderPayment.create({
        data: {
          orderId,
          typePaymentId: payment.typePaymentId,
          amount: payment.amount,
          status
        },
        include: {
          typePayment: true
        }
      });
      
      paymentResults.push({
        paymentType: paymentType.name,
        amount: payment.amount,
        status,
        success
      });
    }
    
    // 3. Atualizar status do pedido baseado no resultado dos pagamentos
    let newOrderStatus;
    if (allPaymentsSuccessful) {
      newOrderStatus = 'PAGO';
    } else {
      newOrderStatus = 'CANCELADO';
    }
    
    try {
      await axios.put(`${ORDERS_SERVICE_URL}/v1/orders/${orderId}/status`, {
        status: newOrderStatus
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw createError(500, 'Payment processed but failed to update order status');
    }
    
    // 4. Se o pagamento foi aprovado, notificar o cliente
    if (allPaymentsSuccessful) {
      try {
        // Buscar informações do pedido novamente para pegar dados do cliente
        const orderResponse = await axios.get(`${ORDERS_SERVICE_URL}/v1/orders/${orderId}`);
        const order = orderResponse.data;
        
        // Aqui você poderia integrar com um serviço de notificação real
        console.log(`[NOTIFICATION] Order ${orderId} paid and confirmed for client ${order.clientId}`);
        
      } catch (error) {
        console.error('Error sending notification:', error);
        // Não falhar o pagamento por conta da notificação
      }
    }
    
    return {
      orderId,
      status: newOrderStatus,
      payments: paymentResults,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      success: allPaymentsSuccessful,
      message: allPaymentsSuccessful 
        ? 'Payment processed successfully and order confirmed'
        : 'Payment failed - order has been cancelled'
    };
  },
  
  getOrderPayments: async (orderId) => {
    // Validar se o pedido existe
    try {
      const orderResponse = await axios.get(`${ORDERS_SERVICE_URL}/v1/orders/${orderId}`);
    } catch (error) {
      if (error.response?.status === 404) {
        throw createError(404, 'Order not found');
      }
      if (error.response?.status === 500 && error.response?.data?.erro && error.response.data.erro.includes('Cast to ObjectId failed')) {
        throw createError(404, 'Order not found');
      }
      if (error.status) throw error; // Re-throw our custom errors
      console.error('Error details:', error.response?.data);
      throw createError(500, 'Error validating order');
    }
    
    return await prisma.orderPayment.findMany({
      where: { orderId },
      include: {
        typePayment: true
      }
    });
  },
  
  listPaymentTypes: () => prisma.typePayment.findMany(),
  
  createPaymentType: async (payload) => {
    const { name } = payload;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw createError(400, 'Payment type name is required');
    }
    
    return await prisma.typePayment.create({
      data: { name: name.trim() }
    });
  }
};