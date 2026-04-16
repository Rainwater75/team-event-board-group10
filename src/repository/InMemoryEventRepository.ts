import { Ok, Err, type Result } from "../lib/result.js";
import { EditEventInput, Event, type CreateEventInput } from "../model/Event.js";
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

        // Persist organizer id so organizer dashboard filtering works.
        const organizerId = input.organizerId ?? "";
        const event = new Event(this.nextId++, input, organizerId);
        this.events.set(event.id, event);
        return Ok(event);
    }

    async edit(id: number, input: EditEventInput): Promise<Result<Event, EventError>> {
        const event = this.events.get(id);
        if (!event) {
            return Err(EventNotFound(`Event ${id} not found.`));
        }
        
        for (const key of Object.keys(input) as Array<keyof EditEventInput>) {
            const value = input[key];
            if (typeof value === "string") {
                if (value.trim() === "") {
                    return Err(ValidationError(`${key} cannot be empty.`));
                }
            }
        }

        event.applyEdits(input);
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
        status: "draft" | "published" | "cancelled" | "past"
    ): Promise<Result<Event, EventError>> {
        const event = this.events.get(id);

        if (!event) {
            return Err(EventNotFound(`Event ${id} not found.`));
        }

        event.status = status;
        this.events.set(id, event);

        return Ok(event);
    }
    async getAllByOrganizer(organizerId: string): Promise<Result<Event[], EventError>> {
        const filteredEvents = Array.from(this.events.values()).filter(event => event.organizerId === organizerId);
        return Ok(filteredEvents);
    }

    async search(query: string): Promise<Result<Event[], EventError>> {
        const lowerQuery = query.toLowerCase();
        const now = new Date();
        if (!lowerQuery.trim()) { // change to only allow published events status later
            return Ok(Array.from(this.events.values()).filter(event => event.status !== undefined && event.endDate > now));
        }
        const filteredEvents = Array.from(this.events.values()).filter((event) => {
          return ((event.title.toLowerCase().includes(lowerQuery) ||
            event.description.toLowerCase().includes(lowerQuery) ||
            event.location.toLowerCase().includes(lowerQuery)) &&
            event.status !== undefined && event.endDate > now); // change to only allow published events status later
        });
        return Ok(filteredEvents);
    }

}

// factory function 
export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository();
}
