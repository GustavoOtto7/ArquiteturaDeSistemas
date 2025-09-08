const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Criar status padrão
  const statuses = ['Pendente', 'Processando', 'Enviado', 'Entregue', 'Cancelado'];
  for (const statusName of statuses) {
    await prisma.status.upsert({
      where: { name: statusName },
      update: {},
      create: { name: statusName },
    });
    console.log(`Status "${statusName}" created/updated`);
  }

  // Criar tipos de pagamento
  const paymentTypes = ['Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Boleto'];
  for (const typeName of paymentTypes) {
    await prisma.typePayment.upsert({
      where: { name: typeName },
      update: {},
      create: { name: typeName },
    });
    console.log(`Payment type "${typeName}" created/updated`);
  }

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
