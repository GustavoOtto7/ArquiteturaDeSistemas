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
      const product = await service.create(req.body); // Chama o serviço para criar o produto
      res.status(201).json(product); // Retorna o produto criado
    } catch (err) {
      next(err); // Passa o erro para o middleware de tratamento de erros
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
};
