const mongoose = require('mongoose');
const { Status } = require('./models/Order');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://admin:password@localhost:27017/orders_db?authSource=admin';

async function main() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to MongoDB for seeding...');

    // Criar status de pedidos
    const statuses = [
      'AGUARDANDO PAGAMENTO',
      'FALHA NO PAGAMENTO', 
      'PAGO',
      'CANCELADO'
    ];

    for (const statusName of statuses) {
      try {
        const existingStatus = await Status.findOne({ name: statusName });
        if (!existingStatus) {
          await Status.create({ name: statusName });
          console.log(`Status "${statusName}" created`);
        } else {
          console.log(`Status "${statusName}" already exists, skipping...`);
        }
      } catch (error) {
        console.error(`Error creating status "${statusName}":`, error);
      }
    }

    console.log('Order statuses seeded successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();