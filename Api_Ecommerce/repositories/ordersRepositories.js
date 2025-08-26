const db = require('../db/memoryDb');
const { randomUUID } = require('crypto');
const orders = [
  { id: 1, items: [{ productId: 1, quantity: 2 }], total: 100 },
  { id: 2, items: [{ productId: 2, quantity: 1 }], total: 50 },
];

module.exports = {
  findAll: () => orders,
  create: (order) => {
    const newOrder = { id: orders.length + 1, ...order };
    orders.push(newOrder);
    return newOrder;
  },
};