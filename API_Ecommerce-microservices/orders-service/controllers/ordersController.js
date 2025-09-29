const service = require('../services/ordersServices');

module.exports = {
  list: async (req, res, next) => {
    try { 
      const orders = await service.list(); 
      res.json(orders); 
    } catch (err) { 
      next(err); 
    }
  },
  obtain: async (req, res, next) => {
    try {
      const order = await service.obtain(req.params.id);
      if (!order) return res.status(404).json({ erro: 'Order not found!' });
      res.json(order);
    } catch (err) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const order = await service.create(req.body);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },
  // Buscar pedidos por cliente
  getOrdersByClient: async (req, res, next) => {
    try {
      const orders = await service.getOrdersByClient(req.params.clientId);
      res.json(orders);
    } catch (err) {
      next(err);
    }
  },
  // Atualizar status do pedido (usado pelo payments service)
  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const order = await service.updateStatus(req.params.id, status);
      res.json(order);
    } catch (err) {
      next(err);
    }
  }
};