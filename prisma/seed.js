const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')
  const job = await prisma.processedJob.upsert({
    where: { jobId: 'test-1' },
    update: {},
    create: {
      jobId: 'test-1',
      title: 'Actor for Commercial',
      salary: '5000',
      city: 'Stockholm',
      slugOrId: 'spot-test-1',
      status: 'pending',
    },
  })
  console.log('Seeded:', job)
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
