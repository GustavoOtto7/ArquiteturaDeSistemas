const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  findAll: () => prisma.order.findMany({ include: { items: true } }),
  create: (order) =>
    prisma.order.create({
      data: {
        total: order.total,
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { items: true },
    }),
};