const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateClientPayload, validateClientUpdatePayload } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => prisma.client.findMany({ where: { isDeleted: false } }),
  obtain: (id) => prisma.client.findUnique({ 
    where: { id, isDeleted: false }
  }),
  create: async (payload) => {
    validateClientPayload(payload);
    try {
      return await prisma.client.create({ data: payload });
    } catch (error) {
      // Verifica se é erro de constraint unique
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        if (field === 'email') {
          throw createError(409, 'Já existe um usuário com esse e-mail');
        }
        throw createError(409, 'Dados duplicados encontrados');
      }
      // Re-lança outros erros
      throw error;
    }
  },
  update: async (id, payload) => {
    validateClientUpdatePayload(payload);
    try {
      const updated = await prisma.client.update({ 
        where: { id, isDeleted: false }, 
        data: payload 
      });
      if (!updated) throw createError(404, 'Client not found!');
      return updated;
    } catch (error) {
      // Verifica se é erro de constraint unique
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        if (field === 'email') {
          throw createError(409, 'Já existe um usuário com esse e-mail');
        }
        throw createError(409, 'Dados duplicados encontrados');
      }
      // Verifica se é erro de registro não encontrado
      if (error.code === 'P2025') {
        throw createError(404, 'Client not found!');
      }
      // Re-lança outros erros
      throw error;
    }
  },
  remove: async (id) => {
    try {
      const deleted = await prisma.client.update({ 
        where: { id }, 
        data: { isDeleted: true }
      });
      if (!deleted) throw createError(404, 'Client not found!');
      return { message: 'Client deleted successfully' };
    } catch (error) {
      // Verifica se é erro de registro não encontrado
      if (error.code === 'P2025') {
        throw createError(404, 'Client not found!');
      }
      // Re-lança outros erros
      throw error;
    }
  }
};