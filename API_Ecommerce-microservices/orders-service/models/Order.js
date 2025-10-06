const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    // Será preenchido automaticamente pelo serviço após buscar o produto
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    min: 0
    // Será preenchido automaticamente pelo serviço após buscar o produto
  },
  subtotal: {
    type: Number,
    min: 0
    // Calculado automaticamente pelo serviço (unitPrice * quantity)
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['AGUARDANDO PAGAMENTO', 'FALHA NO PAGAMENTO', 'PAGO', 'CANCELADO'],
    default: 'AGUARDANDO PAGAMENTO'
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  items: [orderItemSchema],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const statusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
});

const Order = mongoose.model('Order', orderSchema);
const Status = mongoose.model('Status', statusSchema);

module.exports = {
  Order,
  Status
};