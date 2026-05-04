// this is the central repository where the interfaces are defined
// they will be implemented in memory and prisma
import type { EventError } from "../lib/errors.js";
import type { Result } from "../lib/result.js";
import type { CreateEventInput, EditEventInput, Event } from "../model/Event.js";

// functions for event handling, implement in the repository
export interface IEventRepository {
    add(input: CreateEventInput): Promise<Result<Event, EventError>>;
    edit(id: number, input: EditEventInput): Promise<Result<Event, EventError>>;
    getById(id: number): Promise<Result<Event, EventError>>;
    getAll(): Promise<Result<Event[], EventError>>;
    updateStatus(id: number, status: "draft" | "published" | "cancelled" | "past"): Promise<Result<Event, EventError>>;
    getAllByOrganizer(organizerId: string): Promise<Result<Event[], EventError>>;
    search(query: string): Promise<Result<Event[], EventError>>;
    filterEvents(category?: string,timeframe?: "all" | "week" | "weekend",query?: string,): Promise<Result<Event[], EventError>>;
}