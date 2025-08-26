const express = require('express');
const ctrl = require('../controllers/productsControllers');
const router = express.Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.obtain);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;