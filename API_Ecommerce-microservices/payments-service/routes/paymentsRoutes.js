const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentsController');

// Processar pagamento de um pedido
router.post('/process/:orderId', controller.processPayment);

// Buscar métodos de pagamento de um pedido
router.get('/orders/:orderId', controller.getOrderPayments);

// Gerenciar tipos de pagamento
router.get('/types', controller.listPaymentTypes);
router.post('/types', controller.createPaymentType);

module.exports = router;