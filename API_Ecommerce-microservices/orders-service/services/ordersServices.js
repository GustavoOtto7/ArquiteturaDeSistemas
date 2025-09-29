const { Order, Status } = require('../models/Order');
const { validateOrderPayload } = require('../utils/validators');
const { createError } = require('../utils/errors');
const axios = require('../utils/axios-config');

const CLIENTS_SERVICE_URL = process.env.CLIENTS_SERVICE_URL || 'http://localhost:3002';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3001';

module.exports = {
  list: () => Order.find({ isDeleted: false }),
  obtain: (id) => Order.findOne({ _id: id, isDeleted: false }),
  create: async (payload) => {
    validateOrderPayload(payload);
    
    // 1. Validar cliente
    try {
      const clientResponse = await axios.get(`${CLIENTS_SERVICE_URL}/v1/clients/${payload.clientId}/validate`);
      if (!clientResponse.data.valid) {
        throw createError(404, 'Client not found');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw createError(404, 'Client not found');
      }
      throw createError(500, 'Error validating client');
    }
    
    // 2. Enriquecer itens com dados dos produtos e validar estoque
    const enrichedItems = [];
    let total = 0;
    
    for (const item of payload.items) {
      try {
        // Buscar dados do produto
        const productResponse = await axios.get(`${PRODUCTS_SERVICE_URL}/v1/products/${item.productId}`);
        const product = productResponse.data;
        
        if (!product) {
          throw createError(404, `Product ${item.productId} not found`);
        }
        
        // Verificar estoque
        if (product.stock < item.quantity) {
          throw createError(400, `Insufficient stock for product '${product.name}'. Available: ${product.stock}, Required: ${item.quantity}`);
        }
        
        // Criar item enriquecido com dados reais do produto
        const enrichedItem = {
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: product.price * item.quantity
        };
        
        enrichedItems.push(enrichedItem);
        total += enrichedItem.subtotal;
        
      } catch (error) {
        if (error.response?.status === 404) {
          throw createError(404, `Product ${item.productId} not found`);
        }
        if (error.status) throw error; // Re-throw our custom errors
        throw createError(500, `Error validating product ${item.productId}`);
      }
    }
    
    // 3. Reservar estoque dos produtos
    try {
      const stockResponse = await axios.post(`${PRODUCTS_SERVICE_URL}/v1/products/check-stock`, {
        products: enrichedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      });
      
      if (!stockResponse.data.success) {
        throw createError(400, stockResponse.data.erro || 'Error reserving stock');
      }
    } catch (error) {
      if (error.status) throw error; // Re-throw our custom errors
      if (error.response?.status === 400) {
        throw createError(400, error.response.data.erro || 'Insufficient stock');
      }
      throw createError(500, 'Error checking stock');
    }
    
    // 4. Criar o pedido com os itens enriquecidos
    const orderData = {
      clientId: payload.clientId,
      status: 'AGUARDANDO PAGAMENTO',
      total,
      items: enrichedItems
    };
    
    const order = new Order(orderData);
    return await order.save();
  },
  
  getOrdersByClient: async (clientId) => {
    // Validar se o cliente existe
    try {
      const clientResponse = await axios.get(`${CLIENTS_SERVICE_URL}/v1/clients/${clientId}/validate`);
      if (!clientResponse.data.valid) {
        throw createError(404, 'Client not found');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw createError(404, 'Client not found');
      }
      throw createError(500, 'Error validating client');
    }
    
    return await Order.find({ 
      clientId,
      isDeleted: false 
    });
  },
  
  updateStatus: async (orderId, statusName) => {
    const updated = await Order.findOneAndUpdate(
      { _id: orderId, isDeleted: false },
      { status: statusName },
      { new: true }
    );
    
    if (!updated) throw createError(404, 'Order not found');
    return updated;
  }
};