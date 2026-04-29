import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result.js";
import { EditEventInput, Event, type CreateEventInput } from "../model/Event.js";
import { type EventError, EventNotFound, ValidationError } from "../lib/errors.js";
import type { IEventRepository } from "./EventRepository.js";
import type {
  IRsvpRepository,
  IRsvpRecord,
  RsvpStatus,
} from "./RsvpRepository.js";
import { RsvpDependencyError, type RsvpError } from "../lib/RsvpErrors.js";

class PrismaRepository implements IEventRepository, IRsvpRepository {
  constructor(private prisma: PrismaClient) {}

    // helper method to convert a PrismaEvent record to our Event model

    private toEvent(record: any): Event {
        return Object.assign(
          new Event(
            record.id,
            {
              title: record.title,
              description: record.description,
              startDate: record.startDate,
              endDate: record.endDate,
              location: record.location,
              category: record.category,
              status: record.status,
              maxCapacity: record.maxCapacity,
              organizerId: record.organizerId,
              organizerName: record.organizerName ?? undefined,
            },
            record.organizerId
          ),
          { attendingUsers: [] }
        );
      }
    
      async add(input: CreateEventInput): Promise<Result<Event, EventError>> {
        try {
          const event = await this.prisma.event.create({
            data: {
              title: input.title,
              description: input.description,
              startDate: input.startDate,
              endDate: input.endDate,
              location: input.location,
              category: input.category ?? "None",
              status: input.status ?? "draft",
              maxCapacity: input.maxCapacity,
              organizerId: input.organizerId,
              organizerName: input.organizerName ?? null,
            },
          });
    
          return Ok(this.toEvent(event));
        } catch {
          return Err(ValidationError("Unable to create event."));
        }
      }

  async edit(id: number, input: EditEventInput): Promise<Result<Event, EventError>> {
    try {
      const existingEvent = await this.prisma.event.findUnique({ where: { id } });
      if (!existingEvent) {
        return Err(EventNotFound(`Event ${id} not found.`));
      }

      const updateData: { [key: string]: any } = {};
      for (const key in input) {
        if (input[key as keyof EditEventInput] !== undefined) {
          updateData[key] = input[key as keyof EditEventInput];
        }
      }

      const updatedEvent = await this.prisma.event.update({
        where: { id },
        data: updateData,
      });

      return Ok(this.toEvent(updatedEvent));
    } catch (error) {
      return Err(ValidationError(`Failed to update event ${id}.`));
    }
  }
    
      async getById(id: number): Promise<Result<Event, EventError>> {
        const event = await this.prisma.event.findUnique({ where: { id } });
        if (!event) return Err(EventNotFound(`Event ${id} not found`));
        return Ok(this.toEvent(event));
      }
    
      async getAll(): Promise<Result<Event[], EventError>> {
        const events = await this.prisma.event.findMany();
        return Ok(events.map(this.toEvent.bind(this)));
      }
    
      async updateStatus(
        id: number,
        status: "draft" | "published" | "cancelled" | "past"
      ): Promise<Result<Event, EventError>> {
        try {
          const existingEvent = await this.prisma.event.findUnique({ where: { id } });
          if (!existingEvent) {
            return Err(EventNotFound(`Event ${id} not found.`));
          }
          const updatedEvent = await this.prisma.event.update({
            where: { id },
            data: { status: status },
          });
          return Ok(this.toEvent(updatedEvent));
        } catch (error) {
          console.error("Prisma update status error:", error);
          return Err(ValidationError(`Failed to update event status for event ${id}.`));
        }
      }
    
      async getAllByOrganizer(organizerId: string): Promise<Result<Event[], EventError>> {
        const filtered = await this.prisma.event.findMany({ where: { organizerId } });
        return Ok(filtered.map(this.toEvent.bind(this)));
      }
    
      async search(): Promise<Result<Event[], EventError>> {
        return Err(ValidationError("Not implemented"));
      }
    
    
      // RSVP METHODS (NEW)

    
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

        const events = await this.prisma.event.findMany({
          where: {
            status: "published",
            endDate: { gt: now },
            OR: lowerQuery ? [
              { title: { contains: lowerQuery } },
              { description: { contains: lowerQuery } },
              { location: { contains: lowerQuery } },
            ] : undefined,
          },
        });
        return Ok(events.map((e) => this.toEvent(e)));
    }

    // RSVP methods go here
}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
    return new PrismaEventRepository(prisma);
}
