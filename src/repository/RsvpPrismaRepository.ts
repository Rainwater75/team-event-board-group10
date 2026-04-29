import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result.js";
import type {
  IRsvpRepository,
  IRsvpRecord,
  RsvpStatus,
} from "./RsvpRepository.js";
import { RsvpDependencyError, type RsvpError } from "../lib/RsvpErrors.js";

class PrismaRsvpRepository implements IRsvpRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEventAndUser(
    eventId: number,
    userId: string,
  ): Promise<Result<IRsvpRecord | null, RsvpError>> {
    try {
      const record = await this.prisma.rsvp.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });

      if (!record) return Ok(null);

      return Ok({
        eventId: record.eventId,
        userId: record.userId,
        status: record.status as RsvpStatus,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    } catch {
      return Err(RsvpDependencyError("Failed to find RSVP."));
    }
  }

  async upsert(record: IRsvpRecord): Promise<Result<IRsvpRecord, RsvpError>> {
    try {
      await this.prisma.rsvp.upsert({
        where: {
          eventId_userId: {
            eventId: record.eventId,
            userId: record.userId,
          },
        },
        update: {
          status: record.status,
          updatedAt: record.updatedAt,
        },
        create: record,
      });

      return Ok(record);
    } catch {
      return Err(RsvpDependencyError("Failed to upsert RSVP."));
    }
  }

  async countGoingByEvent(eventId: number): Promise<Result<number, RsvpError>> {
    try {
      const count = await this.prisma.rsvp.count({
        where: { eventId, status: "going" },
      });

      return Ok(count);
    } catch {
      return Err(RsvpDependencyError("Failed to count RSVPs."));
    }
  }

  async listByEvent(eventId: number): Promise<Result<IRsvpRecord[], RsvpError>> {
    try {
      const records = await this.prisma.rsvp.findMany({
        where: { eventId },
      });

      return Ok(
        records.map((r) => ({
          eventId: r.eventId,
          userId: r.userId,
          status: r.status as RsvpStatus,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }))
      );
    } catch {
      return Err(RsvpDependencyError("Failed to list RSVPs."));
    }
  }
}

export function CreatePrismaRsvpRepository(prisma: PrismaClient): IRsvpRepository {
  return new PrismaRsvpRepository(prisma);
}