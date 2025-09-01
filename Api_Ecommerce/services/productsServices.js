const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateProductPayload, validateProductUpdatePayload } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => prisma.product.findMany(),
  obtain: (id) => prisma.product.findUnique({ where: { id } }),
  create: async (payload) => {
    validateProductPayload(payload);
    return prisma.product.create({ data: payload });
  },
  update: async (id, payload) => {
    validateProductUpdatePayload(payload);
    const updated = await prisma.product.update({ where: { id }, data: payload });
    if (!updated) throw createError(404, 'Product not found!');
    return updated;
  },
  remove: async (id) => {
    const deleted = await prisma.product.delete({ where: { id } });
    if (!deleted) throw createError(404, 'Product not found!');
    return { message: 'Product deleted successfully' };
  },
};