import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result.js";
import { EditEventInput, Event, type CreateEventInput } from "../model/Event.js";
import { type EventError, EventNotFound, ValidationError } from "../lib/errors.js";
import type { IEventRepository } from "./EventRepository.js";
import { Event as PrismaEvent} from "@prisma/client";
import e from "express";
import { error } from "node:console";

// this is a type that simplifies using the prisma client into simple actions
type PrismaEventDelegate = {
    create(args: { data: Omit<PrismaEvent, "id"> }): Promise<PrismaEvent>;
    findUnique(args: { where: { id: number } }): Promise<PrismaEvent | null>;
    findMany(args?: {
        where?: {
            organizerId?: string;
            OR?: Array<{
                title?: { contains: string; mode?: "insensitive" };
                description?: { contains: string; mode?: "insensitive" };
                location?: { contains: string; mode?: "insensitive" };
            }>;
        };
        orderBy?: { id: "asc" | "desc" };
    }): Promise<PrismaEvent[]>;
    update(args: { where: { id: number }; data: Partial<Omit<PrismaEvent, "id">> }): Promise<PrismaEvent>;
};


class PrismaEventRepository implements IEventRepository {
    constructor(private prisma: PrismaClient) {}

    // getter to access PrismaEventDelegate
    private get events(): PrismaEventDelegate {
        // treat this.prisma as if it has an "event" property that behaves like the PrismaEventDelegate type defined above
        return (this.prisma as unknown as { event: PrismaEventDelegate }).event;
    }

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

            const event = await this.events.create({
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
        return Err(ValidationError("Not implemented"));
    }

    async getAll(): Promise<Result<Event[], EventError>> {
        return Err(ValidationError("Not implemented"));
    }

    async updateStatus(id: number, status: "draft" | "published" | "cancelled" | "past"): Promise<Result<Event, EventError>> {
        return Err(ValidationError("Not implemented"));
    }

    async getAllByOrganizer(organizerId: string): Promise<Result<Event[], EventError>> {
        return Err(ValidationError("Not implemented"));
    }

    async search(query: string): Promise<Result<Event[], EventError>> {
        return Err(ValidationError("Not implemented"));
    }

}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
    return new PrismaEventRepository(prisma);
}