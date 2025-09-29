const service = require('../services/clientsServices');

module.exports = {
  list: async (req, res, next) => {
    try { 
      const clients = await service.list(); 
      res.json(clients); 
    } catch (err) { 
      next(err); 
    }
  },
  obtain: async (req, res, next) => {
    try {
      const client = await service.obtain(req.params.id);
      if (!client) return res.status(404).json({ erro: 'Client not found!' });
      res.json(client);
    } catch (err) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const client = await service.create(req.body);
      res.status(201).json(client);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    try { 
      const client = await service.update(req.params.id, req.body); 
      res.json(client); 
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
  // Endpoint para validar cliente (usado por orders service)
  validateClient: async (req, res, next) => {
    try {
      const client = await service.obtain(req.params.id);
      if (!client) {
        return res.status(404).json({ valid: false, message: 'Client not found' });
      }
      res.json({ valid: true, client });
    } catch (err) {
      next(err);
    }
  }
};