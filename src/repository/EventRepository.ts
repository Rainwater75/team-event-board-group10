// this is the central repository where the interfaces are defined
// they will be implemented in memory and prisma
import type { EventError } from "../lib/errors.js";
import type { Result } from "../lib/result.js";
import type { CreateEventInput, Event } from "../model/Event.js";

// functions for event handling, implement in the repository
export interface IEventRepository {
    add(input: CreateEventInput): Promise<Result<Event, EventError>>;
    getById(id: number): Promise<Result<Event, EventError>>;
    getAll(): Promise<Result<Event[], EventError>>;
}