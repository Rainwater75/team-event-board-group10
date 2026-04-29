import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result.js";
import { EditEventInput, Event, type CreateEventInput } from "../model/Event.js";
import { type EventError, EventNotFound, ValidationError } from "../lib/errors.js";
import type { IEventRepository } from "./EventRepository.js";

class PrismaEventRepository implements IEventRepository {
    constructor(private prisma: PrismaClient) {}

    // helper method to convert a PrismaEvent record to our Event model
    private toEvent(record: {
        id: number;
        title: string;
        description: string;
        startDate: Date;
        endDate: Date;
        location: string;
        category: string;
        status: string;
        maxCapacity: number;
        organizerId: string;
        organizerName: string | null;
    }): Event {
        return Object.assign(
            new Event(record.id, {
                title: record.title,
                description: record.description,
                startDate: record.startDate,
                endDate: record.endDate,
                location: record.location,
                category: record.category as CreateEventInput["category"],
                status: record.status as CreateEventInput["status"],
                maxCapacity: record.maxCapacity,
                organizerId: record.organizerId,
                organizerName: record.organizerName ?? undefined,
            }, record.organizerId),
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
        return Err(ValidationError("Not implemented"));
    }

    async getById(id: number): Promise<Result<Event, EventError>> {
      const event = await this.prisma.event.findUnique({ where: { id } });
      if (!event) return Err(EventNotFound(`Event ${id} not found.`));
      return Ok(this.toEvent(event));
    }

    async getAll(): Promise<Result<Event[], EventError>> {
      const events = await this.prisma.event.findMany();
      return Ok(events.map((e) => this.toEvent(e)));
    }

    async updateStatus(id: number, status: "draft" | "published" | "cancelled" | "past"): Promise<Result<Event, EventError>> {
        return Err(ValidationError("Not implemented"));
    }

    async getAllByOrganizer(organizerId: string): Promise<Result<Event[], EventError>> {
        const filtered = await this.prisma.event.findMany({ where: { organizerId } });
        return Ok(filtered.map(this.toEvent));
    }

    async search(query: string): Promise<Result<Event[], EventError>> {
        const now = new Date();
        const lowerQuery = query.trim().toLowerCase();
        if (!lowerQuery) { // return all if query is empty/whitespace
            const events = await this.prisma.event.findMany({
                where: {
                    status: "published",
                    endDate: { gt: now },
                },
            });
            return Ok(events.map((e) => this.toEvent(e)));
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