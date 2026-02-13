const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Inizio seeding...')
  const job = await prisma.processedJob.upsert({
    where: { jobId: 'test-1' },
    update: {},
    create: {
      jobId: 'test-1',
      title: 'Attore per Spot Pubblicitario',
      salary: '5000',
      city: 'Roma',
      slugOrId: 'spot-test-1',
      status: 'pending'
    },
  })
  console.log({ job })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })