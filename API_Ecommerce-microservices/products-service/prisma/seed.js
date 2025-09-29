const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Products database...');

  // Criar produtos de exemplo
  const products = [
    {
      name: 'Notebook Dell Inspiron',
      price: 2500.00,
      stock: 15
    },
    {
      name: 'Mouse Logitech MX Master',
      price: 150.00,
      stock: 30
    },
    {
      name: 'Teclado Mecânico Keychron K8',
      price: 350.00,
      stock: 20
    },
    {
      name: 'Monitor LG 24"',
      price: 800.00,
      stock: 8
    },
    {
      name: 'Headphone Sony WH-1000XM4',
      price: 1200.00,
      stock: 12
    }
  ];

  for (const product of products) {
    try {
      await prisma.product.create({
        data: product
      });
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`Product ${product.name} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }

  console.log('Products seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });