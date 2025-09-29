const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Clients database...');

  // Criar clientes de exemplo
  const clients = [
    {
      name: 'João Silva',
      email: 'joao.silva@email.com'
    },
    {
      name: 'Maria Santos',
      email: 'maria.santos@email.com'
    },
    {
      name: 'Pedro Oliveira',
      email: 'pedro.oliveira@email.com'
    },
    {
      name: 'Ana Costa',
      email: 'ana.costa@email.com'
    }
  ];

  for (const client of clients) {
    try {
      await prisma.client.create({
        data: client
      });
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`Client ${client.email} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }

  console.log('Clients seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });