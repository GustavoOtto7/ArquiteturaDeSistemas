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
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

function validateProductPayload({ name, price, stock }) {
  if (!isNonEmptyString(name)) throw createError(400, 'invalid name');
  if (!isPositiveNumber(price)) throw createError(400, 'invalid price');
  if (!isNonNegativeInteger(stock)) throw createError(400, 'invalid stock');
}
function validateProductUpdatePayload(payload) {
  if (payload.name && !isNonEmptyString(payload.name)) throw createError(400, 'invalid name');
  if (payload.price && !isPositiveNumber(payload.price)) throw createError(400, 'invalid price');
  if (payload.stock && !isNonNegativeInteger(payload.stock)) throw createError(400, 'invalid stock');
}
function validateOrderPayload(payload) {
  if (!Array.isArray(payload.items) || payload.items.length === 0)
    throw createError(400, 'Order must contain at least 1 item');
  if (!payload.clientId || !isNonEmptyString(payload.clientId))
    throw createError(400, 'Client ID is required');
}
function validateClientPayload({ name, email }) {
  if (!isNonEmptyString(name)) throw createError(400, 'invalid name');
  if (!isValidEmail(email)) throw createError(400, 'invalid email format');
}
function validateClientUpdatePayload(payload) {
  if (payload.name && !isNonEmptyString(payload.name)) throw createError(400, 'invalid name');
  if (payload.email && !isValidEmail(payload.email)) throw createError(400, 'invalid email format');
}

module.exports = {
  validateProductPayload,
  validateProductUpdatePayload,
  validateOrderPayload,
  validateClientPayload,
  validateClientUpdatePayload,
  round2,
};
