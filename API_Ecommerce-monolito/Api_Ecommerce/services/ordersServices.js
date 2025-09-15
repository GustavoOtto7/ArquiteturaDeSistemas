const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateOrderPayload, round2 } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => prisma.order.findMany({ 
    where: { isDeleted: false },
    include: { 
      items: true, 
      client: true, 
      status: true 
    } 
  }),
  create: async (payload) => {
    validateOrderPayload(payload);

    // Verifica se o cliente existe
    const client = await prisma.client.findUnique({ 
      where: { id: payload.clientId, isDeleted: false } 
    });
    if (!client) throw createError(400, 'Client not found or deleted');

    // Validação de estoque
    const calculated = await Promise.all(
      payload.items.map(async (it) => {
        const product = await prisma.product.findUnique({ 
          where: { id: it.productId, isDeleted: false } 
        });
        if (!product) throw createError(400, `Product ${it.productId} does not exist or is deleted!`);
        if (product.stock < it.quantity)
          throw createError(400, `Insufficient stock for ${product.name}`);
        return { product, quantity: it.quantity, subtotal: product.price * it.quantity };
      })
    );

    // Busca status padrão (você pode criar um status "Pendente" como padrão)
    let defaultStatus = await prisma.status.findFirst({ where: { name: 'Pendente' } });
    if (!defaultStatus) {
      defaultStatus = await prisma.status.create({ data: { name: 'Pendente' } });
    }

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
        clientId: payload.clientId,
        statusId: defaultStatus.id,
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
      include: { 
        items: true, 
        client: true, 
        status: true 
      },
    });
  },
};
