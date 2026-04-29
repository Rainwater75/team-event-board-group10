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
    
      async edit(): Promise<Result<Event, EventError>> {
        return Err(ValidationError("Not implemented"));
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
    
      async updateStatus(): Promise<Result<Event, EventError>> {
        return Err(ValidationError("Not implemented"));
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
            create: {
              eventId: record.eventId,
              userId: record.userId,
              status: record.status,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
            },
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
            records.map((record) => ({
              eventId: record.eventId,
              userId: record.userId,
              status: record.status as RsvpStatus,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
            })),
          );
        } catch {
          return Err(RsvpDependencyError("Failed to list RSVPs."));
        }
      }
} 
    // factory
    export function CreatePrismaRepository(prisma: PrismaClient) {
      return new PrismaRepository(prisma);
    }