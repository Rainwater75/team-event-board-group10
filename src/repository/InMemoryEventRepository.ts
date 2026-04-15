import { Ok, Err, type Result } from "../lib/result.js";
import { Event, type CreateEventInput } from "../model/Event.js";
import { type EventError, EventNotFound, ValidationError } from "../lib/errors.js";
import type { IEventRepository } from "./EventRepository.js";

class InMemoryEventRepository implements IEventRepository {
    // storing events in a map
    private events: Map<number, Event> = new Map();
    private nextId = 1;

    async add(input: CreateEventInput): Promise<Result<Event, EventError>> {
        // checks inputs for problems
        if (!input.title.trim()) {
            return Err(ValidationError("Title is required."));
        }

        if (!input.description.trim()) {
            return Err(ValidationError("Description is required."));
        }

        if (!input.location.trim()) {
            return Err(ValidationError("Location is required."));
        }

        // creates the event and adds to the map
        const event = new Event(this.nextId++, input, "");
        this.events.set(event.id, event);
        return Ok(event);
    }

    // can search up a specific event by id 
    async getById(id: number): Promise<Result<Event, EventError>> {
        const event = this.events.get(id);
        if (!event) {
            return Err(EventNotFound(`Event ${id} not found.`));
        }
        return Ok(event);
    }

    // returns all events 
    // not really useful for rn, ideally we filter by events a user is attending 
    async getAll(): Promise<Result<Event[], EventError>> {
        return Ok(Array.from(this.events.values()));
    }

    async updateStatus(
        id: number,
        status: "draft" | "published" | "cancelled"
    ): Promise<Result<Event, EventError>> {
        const event = this.events.get(id);

        if (!event) {
            return Err(EventNotFound(`Event ${id} not found.`));
        }

        event.status = status;
        this.events.set(id, event);

        return Ok(event);
    }
}

// factory function 
export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository();
}
