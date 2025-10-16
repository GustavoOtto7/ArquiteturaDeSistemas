const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateProductPayload, validateProductUpdatePayload } = require('../utils/validators');
const { createError } = require('../utils/errors');

module.exports = {
  list: () => prisma.product.findMany({ where: { isDeleted: false } }),
  obtain: (id) => prisma.product.findUnique({ where: { id, isDeleted: false } }),
  create: async (payload) => {
    validateProductPayload(payload);
    try {
      return await prisma.product.create({ data: payload });
    } catch (error) {
      // Verifica se é erro de constraint unique
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        if (field === 'name') {
          throw createError(409, 'Já existe um produto com esse nome');
        }
        throw createError(409, 'Dados duplicados encontrados');
      }
      // Re-lança outros erros
      throw error;
    }
  },
  update: async (id, payload) => {
    // Remove stock from updateable fields - now handled by specific endpoint
    const { stock, ...updatePayload } = payload;
    validateProductUpdatePayload(updatePayload);
    
    try {
      const updated = await prisma.product.update({ 
        where: { id, isDeleted: false }, 
        data: updatePayload 
      });
      if (!updated) throw createError(404, 'Product not found!');
      return updated;
    } catch (error) {
      // Verifica se é erro de constraint unique
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        if (field === 'name') {
          throw createError(409, 'Já existe um produto com esse nome');
        }
        throw createError(409, 'Dados duplicados encontrados');
      }
      // Verifica se é erro de registro não encontrado
      if (error.code === 'P2025') {
        throw createError(404, 'Product not found!');
      }
      // Re-lança outros erros
      throw error;
    }
  },
  remove: async (id) => {
    try {
      const deleted = await prisma.product.update({ 
        where: { id }, 
        data: { isDeleted: true }
      });
      if (!deleted) throw createError(404, 'Product not found!');
      return { message: 'Product deleted successfully' };
    } catch (error) {
      // Verifica se é erro de registro não encontrado
      if (error.code === 'P2025') {
        throw createError(404, 'Product not found!');
      }
      // Re-lança outros erros
      throw error;
    }
  },
  // Specific method for stock updates
  updateStock: async (id, stockChange) => {
    // Buscar o produto atual
    const currentProduct = await prisma.product.findUnique({
      where: { id, isDeleted: false }
    });
    
    if (!currentProduct) {
      throw createError(404, 'Product not found!');
    }
    
    // Calcular novo estoque
    const newStock = currentProduct.stock + stockChange;
    
    // Verificar se o estoque não ficará negativo
    if (newStock < 0) {
      throw createError(400, `Cannot decrement stock. Current: ${currentProduct.stock}, Requested change: ${stockChange}, Result would be: ${newStock}`);
    }
    
    // Atualizar o estoque
    const updated = await prisma.product.update({
      where: { id, isDeleted: false },
      data: { stock: newStock }
    });
    
    return {
      ...updated,
      previousStock: currentProduct.stock,
      stockChange: stockChange,
      newStock: newStock
    };
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