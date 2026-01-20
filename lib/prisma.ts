import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = global.cachedPrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.cachedPrisma = prisma
}
