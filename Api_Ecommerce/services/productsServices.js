const repo = require('../repositories/productsRepositories');
const { validateProductPayload, validateProductUpdatePayload } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => repo.findAll(),
  obtain: (id) => repo.findById(id),
  create: (payload) => {
    validateProductPayload(payload);
    return repo.create(payload);
  },
  update: (id, payload) => {
    validateProductUpdatePayload(payload);
    const updated = repo.update(id, payload);
    if (!updated) throw createError(404, 'Product not found!');
    return updated;
  },
};