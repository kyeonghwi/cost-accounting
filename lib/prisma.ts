import { PrismaClient } from '@prisma/client'

// @AX:ANCHOR: [AUTO] global DB singleton — all server-side DB access flows through this export; do not replace with per-request instantiation
// Global singleton to avoid exhausting DB connections in Next.js dev hot-reload.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// @AX:WARN: [AUTO] global state mutation — writes to globalThis in non-production; safe only because Next.js hot-reload recycles the module, not the process
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
