const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
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