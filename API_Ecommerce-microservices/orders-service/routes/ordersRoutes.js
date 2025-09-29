const express = require('express');
const router = express.Router();
const controller = require('../controllers/ordersController');

// CRUD básico de pedidos
router.get('/', controller.list);
router.get('/:id', controller.obtain);
router.post('/', controller.create);

// Buscar pedidos por cliente
router.get('/client/:clientId', controller.getOrdersByClient);

// Atualizar status do pedido (usado internamente pelo payments service)
router.put('/:id/status', controller.updateStatus);

module.exports = router;