const { createError } = require('./errors');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
  validateClientPayload,
  validateClientUpdatePayload,
};