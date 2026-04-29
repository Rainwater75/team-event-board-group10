import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result.js";
import { EditEventInput, Event, type CreateEventInput } from "../model/Event.js";
import { type EventError, EventNotFound, ValidationError } from "../lib/errors.js";
import type { IEventRepository } from "./EventRepository.js";

class PrismaRepository implements IEventRepository {
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
}
    
    
    
    export function CreatePrismaRepository(prisma: PrismaClient) {
      return new PrismaRepository(prisma);
    }
