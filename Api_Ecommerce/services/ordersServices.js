const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateOrderPayload, round2 } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => prisma.order.findMany({ include: { items: true } }),
  create: async (payload) => {
    validateOrderPayload(payload);

    // Validação de estoque
    const calculated = await Promise.all(
      payload.items.map(async (it) => {
        const product = await prisma.product.findUnique({ where: { id: it.productId } });
        if (!product) throw createError(400, `Product ${it.productId} does not exist!`);
        if (product.stock < it.quantity)
          throw createError(400, `Insufficient stock for ${product.name}`);
        return { product, quantity: it.quantity, subtotal: product.price * it.quantity };
      })
    );

    // Atualiza estoque
    await Promise.all(
      calculated.map(({ product, quantity }) => {
        return prisma.product.update({
          where: { id: product.id },
          data: { stock: product.stock - quantity },
        });
      })
    );

    const ordersItems = calculated.map(({ product, quantity, subtotal }) => ({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: round2(subtotal),
    }));

    const total = round2(ordersItems.reduce((acc, i) => acc + i.subtotal, 0));
    return prisma.order.create({
      data: {
        total,
        items: {
          create: ordersItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { items: true },
    });
  },
};
