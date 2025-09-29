const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Payments database...');

  // Criar tipos de pagamento
  const paymentTypes = [
    'Cartão de Crédito',
    'Cartão de Débito',
    'PIX',
    'Boleto Bancário',
    'PayPal'
  ];

  for (const typeName of paymentTypes) {
    try {
      await prisma.typePayment.create({
        data: { name: typeName }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`Payment type ${typeName} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }

  console.log('Payment types seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });