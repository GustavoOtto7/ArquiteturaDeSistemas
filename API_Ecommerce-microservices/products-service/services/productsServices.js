const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateProductPayload, validateProductUpdatePayload } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => prisma.product.findMany({ where: { isDeleted: false } }),
  obtain: (id) => prisma.product.findUnique({ where: { id, isDeleted: false } }),
  create: async (payload) => {
    validateProductPayload(payload);
    return prisma.product.create({ data: payload });
  },
  update: async (id, payload) => {
    // Remove stock from updateable fields - now handled by specific endpoint
    const { stock, ...updatePayload } = payload;
    validateProductUpdatePayload(updatePayload);
    
    const updated = await prisma.product.update({ 
      where: { id, isDeleted: false }, 
      data: updatePayload 
    });
    if (!updated) throw createError(404, 'Product not found!');
    return updated;
  },
  remove: async (id) => {
    const deleted = await prisma.product.update({ 
      where: { id }, 
      data: { isDeleted: true }
    });
    if (!deleted) throw createError(404, 'Product not found!');
    return { message: 'Product deleted successfully' };
  },
  // Specific method for stock updates
  updateStock: async (id, stock) => {
    const updated = await prisma.product.update({
      where: { id, isDeleted: false },
      data: { stock }
    });
    if (!updated) throw createError(404, 'Product not found!');
    return updated;
  },
  // Method to check and reserve stock for orders
  checkAndReserveStock: async (products) => {
    const results = [];
    
    for (const item of products) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, isDeleted: false }
      });
      
      if (!product) {
        throw createError(404, `Product ${item.productId} not found`);
      }
      
      if (product.stock < item.quantity) {
        throw createError(400, `Insufficient stock for product ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`);
      }
      
      results.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        availableStock: product.stock,
        requestedQuantity: item.quantity
      });
    }
    
    // If all products have sufficient stock, reserve them
    for (const item of products) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });
    }
    
    return {
      success: true,
      message: 'Stock reserved successfully',
      items: results
    };
  }
};