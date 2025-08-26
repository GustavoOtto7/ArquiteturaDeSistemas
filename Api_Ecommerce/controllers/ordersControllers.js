const service = require('../services/ordersServices');

module.exports = {
  list: (req, res, next) => {
    try { res.json(service.list()); } catch (err) { next(err); }
  },
  create: (req, res, next) => {
    try { res.status(201).json(service.create(req.body)); } catch (err) { next(err); }
  },
};
