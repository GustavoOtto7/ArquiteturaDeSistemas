const db = require('../db/memoryDb');
const { randomUUID } = require('crypto');

module.exports = {
  findAll: () => [...db.products],
  findById: (id) => db.products.find(p => p.id === id) || null,
  create: ({ name, price, stock }) => {
    const novo = { id: randomUUID(), name, price, stock };
    db.products.push(novo);
    return novo;
  },
  update: (id, data) => {
    const idx = db.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.products[idx] = { ...db.products[idx], ...data };
    return db.products[idx];
  },
};
