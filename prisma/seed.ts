import { PrismaClient, PowerType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...\n')

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'yulin.ren@etu.sorbonne-universite.fr' },
    update: {},
    create: {
      email: 'yulin.ren@etu.sorbonne-universite.fr',
      name: 'Ren Yulin',
    },
  })

  console.log('✅ Created user:', user.email)

  // Create 4 charging stations in Paris
  const stations = [
    {
      name: 'Station Bastille A1',
      latitude: 48.8534,
      longitude: 2.3688,
      address: '1 Place de la Bastille, 75011 Paris',
      powerType: PowerType.AC_FAST,
      maxPower: 22.0,
      deviceId: 'ESP32-BASTILLE-001',
    },
    {
      name: 'Station République B2',
      latitude: 48.8673,
      longitude: 2.3638,
      address: 'Place de la République, 75003 Paris',
      powerType: PowerType.DC_FAST,
      maxPower: 50.0,
      deviceId: 'ESP32-REPUBLIQUE-002',
    },
    {
      name: 'Station Montparnasse C3',
      latitude: 48.8421,
      longitude: 2.3219,
      address: 'Gare Montparnasse, 75015 Paris',
      powerType: PowerType.AC_SLOW,
      maxPower: 7.4,
      deviceId: 'ESP32-MONTPARNASSE-003',
    },
    {
      name: 'Station Saint-Lazare D4',
      latitude: 48.8762,
      longitude: 2.3255,
      address: 'Gare Saint-Lazare, 75008 Paris',
      powerType: PowerType.AC_FAST,
      maxPower: 22.0,
      deviceId: 'ESP32-SAINTLAZARE-004',
    },
  ]

  for (const stationData of stations) {
    const station = await prisma.chargingStation.upsert({
      where: { deviceId: stationData.deviceId },
      update: {},
      create: stationData,
    })
    console.log('✅ Created charging station:', station.name)
  }

  console.log('\n🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
