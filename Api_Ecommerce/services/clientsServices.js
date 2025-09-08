const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateClientPayload, validateClientUpdatePayload } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => prisma.client.findMany({ where: { isDeleted: false } }),
  obtain: (id) => prisma.client.findUnique({ 
    where: { id, isDeleted: false },
    include: { orders: true }
  }),
  create: async (payload) => {
    validateClientPayload(payload);
    return prisma.client.create({ data: payload });
  },
  update: async (id, payload) => {
    validateClientUpdatePayload(payload);
    const updated = await prisma.client.update({ 
      where: { id, isDeleted: false }, 
      data: payload 
    });
    if (!updated) throw createError(404, 'Client not found!');
    return updated;
  },
  remove: async (id) => {
    const deleted = await prisma.client.update({ 
      where: { id }, 
      data: { isDeleted: true }
    });
    if (!deleted) throw createError(404, 'Client not found!');
    return { message: 'Client deleted successfully' };
  },
};
