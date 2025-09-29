const { createError } = require('./errors');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateOrderPayload(payload) {
  if (!Array.isArray(payload.items) || payload.items.length === 0)
    throw createError(400, 'Order must contain at least 1 item');
  if (!payload.clientId || !isNonEmptyString(payload.clientId))
    throw createError(400, 'Client ID is required');
    
  // Validar cada item do pedido
  payload.items.forEach((item, index) => {
    if (!item.productId || !isNonEmptyString(item.productId))
      throw createError(400, `Item ${index + 1}: Product ID is required`);
    if (!item.productName || !isNonEmptyString(item.productName))
      throw createError(400, `Item ${index + 1}: Product name is required`);
    if (!Number.isInteger(item.quantity) || item.quantity <= 0)
      throw createError(400, `Item ${index + 1}: Quantity must be a positive integer`);
    if (typeof item.unitPrice !== 'number' || item.unitPrice <= 0)
      throw createError(400, `Item ${index + 1}: Unit price must be a positive number`);
  });
}

module.exports = {
  validateOrderPayload,
};