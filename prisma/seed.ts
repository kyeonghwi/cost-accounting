import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const profile = process.env.SEED_PROFILE ?? 'small'
  console.log(`Seeding with profile: ${profile}`)

  if (profile === 'full') {
    const { seedFull } = await import('./seed/full')
    await seedFull(prisma)
  } else {
    const { seedSmall } = await import('./seed/small')
    await seedSmall(prisma)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
