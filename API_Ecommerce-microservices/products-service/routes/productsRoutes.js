const express = require('express');
const router = express.Router();
const controller = require('../controllers/productsController');

// CRUD básico de produtos
router.get('/', controller.list);
router.get('/:id', controller.obtain);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

// Endpoint específico para atualizar estoque
router.put('/:id/stock', controller.updateStock);

// Endpoint para verificar e reservar estoque (usado internamente por outros serviços)
router.post('/check-stock', controller.checkStock);

module.exports = router;