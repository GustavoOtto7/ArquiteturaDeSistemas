const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  findAll: () => prisma.product.findMany(),
  findById: (id) => prisma.product.findUnique({ where: { id } }),
  create: ({ name, price, stock }) =>
    prisma.product.create({ data: { name, price, stock } }),
  update: (id, data) =>
    prisma.product.update({ where: { id }, data }),
  deleteById: (id) =>
    prisma.product.delete({ where: { id } }),
};
