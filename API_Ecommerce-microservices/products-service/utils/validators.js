const { createError } = require('./errors');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function isPositiveNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}
function isNonNegativeInteger(n) {
  return Number.isInteger(n) && n >= 0;
}

function validateProductPayload({ name, price, stock }) {
  if (!isNonEmptyString(name)) throw createError(400, 'invalid name');
  if (!isPositiveNumber(price)) throw createError(400, 'invalid price');
  if (!isNonNegativeInteger(stock)) throw createError(400, 'invalid stock');
}

function validateProductUpdatePayload(payload) {
  if (payload.name && !isNonEmptyString(payload.name)) throw createError(400, 'invalid name');
  if (payload.price && !isPositiveNumber(payload.price)) throw createError(400, 'invalid price');
  // Remove stock validation from update - now handled by specific endpoint
}

module.exports = {
  validateProductPayload,
  validateProductUpdatePayload,
};