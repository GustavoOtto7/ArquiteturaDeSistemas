const service = require('../services/paymentsServices');

module.exports = {
  // Confirmar pagamento de um pedido
  processPayment: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { payments } = req.body; // Array de {typePaymentId, amount}
      
      const result = await service.processPayment(orderId, payments);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
  
  // Buscar métodos de pagamento de um pedido
  getOrderPayments: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const payments = await service.getOrderPayments(orderId);
      res.json(payments);
    } catch (err) {
      next(err);
    }
  },
  
  // Listar tipos de pagamento disponíveis
  listPaymentTypes: async (req, res, next) => {
    try {
      const types = await service.listPaymentTypes();
      res.json(types);
    } catch (err) {
      next(err);
    }
  },
  
  // Criar novo tipo de pagamento
  createPaymentType: async (req, res, next) => {
    try {
      const type = await service.createPaymentType(req.body);
      res.status(201).json(type);
    } catch (err) {
      next(err);
    }
  }
};