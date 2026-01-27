-- AlterTable
ALTER TABLE "telemetry_data" ADD COLUMN     "battVoltage" DOUBLE PRECISION,
ADD COLUMN     "pvPower" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "device_commands" (
    "id" TEXT NOT NULL,
    "stationId" INTEGER NOT NULL,
    "command" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "ackedAt" TIMESTAMP(3),

    CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_commands_stationId_status_idx" ON "device_commands"("stationId", "status");

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "charging_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
