const service = require('../services/productsServices');

module.exports = {
  list: (req, res, next) => {
    try { res.json(service.list()); } catch (err) { next(err); }
  },
  obtain: (req, res, next) => {
    try {
      const prod = service.obtain(req.params.id);
      if (!prod) return res.status(404).json({ erro: 'Product not found!' });
      res.json(prod);
    } catch (err) { next(err); }
  },
  create: (req, res, next) => {
    try { res.status(201).json(service.create(req.body)); } catch (err) { next(err); }
  },
  update: (req, res, next) => {
    try { res.json(service.update(req.params.id, req.body)); } catch (err) { next(err); }
  },
  remove: (req, res, next) => {
    try {
      res.json(service.remove(req.params.id)); } catch (err) { next(err); }
  },
};
