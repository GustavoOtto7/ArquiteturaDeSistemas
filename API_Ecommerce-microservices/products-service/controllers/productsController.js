const service = require('../services/productsServices');

module.exports = {
  list: async (req, res, next) => {
    try { 
      const products = await service.list(); 
      res.json(products); 
    } catch (err) { 
      next(err); 
    }
  },
  obtain: async (req, res, next) => {
    try {
      const prod = await service.obtain(req.params.id);
      if (!prod) return res.status(404).json({ erro: 'Product not found!' });
      res.json(prod);
    } catch (err) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const product = await service.create(req.body);
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    try { 
      const product = await service.update(req.params.id, req.body); 
      res.json(product); 
    } catch (err) { 
      next(err); 
    }
  },
  remove: async (req, res, next) => {
    try {
      const result = await service.remove(req.params.id);
      res.json(result); 
    } catch (err) { 
      next(err); 
    }
  },
  // Endpoint específico para atualizar estoque
  updateStock: async (req, res, next) => {
    try {
      const { stock } = req.body;
      if (stock === undefined || typeof stock !== 'number') {
        return res.status(400).json({ erro: 'Stock must be a valid number (use negative values to decrement)' });
      }
      
      const product = await service.updateStock(req.params.id, stock);
      res.json(product);
    } catch (err) {
      next(err);
    }
  },
  // Endpoint para verificar/reservar estoque (usado por orders service)
  checkStock: async (req, res, next) => {
    try {
      const { products } = req.body; // Array de {productId, quantity}
      const result = await service.checkAndReserveStock(products);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
};