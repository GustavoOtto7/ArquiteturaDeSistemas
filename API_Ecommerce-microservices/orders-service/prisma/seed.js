const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Orders database...');

  // Criar status de pedidos
  const statuses = [
    'AGUARDANDO PAGAMENTO',
    'FALHA NO PAGAMENTO', 
    'PAGO',
    'CANCELADO'
  ];

  for (const statusName of statuses) {
    try {
      await prisma.status.create({
        data: { name: statusName }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`Status ${statusName} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }

  console.log('Order statuses seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });