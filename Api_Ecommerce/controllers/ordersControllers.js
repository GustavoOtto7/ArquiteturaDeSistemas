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
  create: async (req, res, next) => {
    try {
      const order = await service.create(req.body); // Chama o serviço para criar o pedido
      res.status(201).json(order); // Retorna o pedido criado
    } catch (err) {
      next(err); // Passa o erro para o middleware de tratamento de erros
    }
  },
};
