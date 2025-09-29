const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientsController');

// CRUD básico de clientes
router.get('/', controller.list);
router.get('/:id', controller.obtain);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

// Endpoint para validar cliente (usado internamente por outros serviços)
router.get('/:id/validate', controller.validateClient);

module.exports = router;