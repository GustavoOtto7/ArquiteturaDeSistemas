const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log('✅ Conexão com banco OK');
    return prisma.product.findMany();
  })
  .then((products) => {
    console.log('📦 Produtos encontrados:', products.length);
    return prisma.status.findMany();
  })
  .then((statuses) => {
    console.log('📋 Status encontrados:', statuses.length);
    return prisma.client.findMany();
  })
  .then((clients) => {
    console.log('👥 Clientes encontrados:', clients.length);
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
  })
  .finally(() => {
    prisma.$disconnect();
    process.exit();
  });
