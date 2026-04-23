import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result.js";
import { EditEventInput, Event, type CreateEventInput } from "../model/Event.js";
import { type EventError, EventNotFound, ValidationError } from "../lib/errors.js";
import type { IEventRepository } from "./EventRepository.js";


class PrismaEventRepository implements IEventRepository {
    constructor(private prisma: PrismaClient) {}

    async add(input: CreateEventInput): Promise<Result<Event, EventError>> {
        return Err(ValidationError("Not implemented"));
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