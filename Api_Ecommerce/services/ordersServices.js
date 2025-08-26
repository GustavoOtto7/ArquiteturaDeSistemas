const productsRepositories = require('../repositories/productsRepositories');
const ordersRepositories = require('../repositories/ordersRepositories');
const { validateOrderPayload, round2 } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => ordersRepositories.findAll(),
  create: (payload) => {
    validateOrderPayload(payload);

    // Validação de estoque
    const calculated = payload.items.map(it => {
      const product = productsRepositories.findById(it.productId);
      if (!product) throw createError(400, `Product ${it.productId} do not exist!`);
      if (product.stock < it.quantity)
        throw createError(400, `Insuficient stock for ${product.name}`);
      return { product, quantity: it.quantity, subtotal: product.price * it.quantity };
    });

    // Atualiza estoque
    calculated.forEach(({ product, quantity }) => {
      productsRepositories.update(product.id, { stock: product.stock - quantity });
    });

    const ordersItems = calculated.map(({ product, quantity, subtotal }) => ({
      produtoId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: round2(subtotal),
    }));

    const total = round2(ordersItems.reduce((acc, i) => acc + i.subtotal, 0));
    return ordersRepo.create({ items: ordersItems, total });
  },
};
