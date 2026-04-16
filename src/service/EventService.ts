import { IEventRepository } from "../repository/EventRepository.js";
import { EventError, EventNotFound, InvalidContent } from "../lib/errors.js";
import { Ok, Err, Result } from "../lib/result.js";
import { CreateEventInput, Event, Category } from "../model/Event.js";
import { ValidationError } from "../lib/errors.js";
// import { CreateInMemoryEventRepository } from "../repository/InMemoryEventRepository.js";

export interface IEventService {
    createEvent(
        input: CreateEventInput, 
        organizerId: string
    ): Promise<Result<Event, EventError>>;

    getEvent(id: number, currentUser: { userId: string; role: string } | null): Promise<Result<Event, EventError>>;
    getAllEvents(): Promise<Result<Event[], EventError>>;
    getAllEventsByOrganizer(organizerId: string): Promise<Result<Event[], EventError>>;
}

// validation invariants 
const TITLE_MIN = 3;
const TITLE_MAX = 100;
const DESC_MIN = 10;
const DESC_MAX = 1000;
const LOCATION_MIN = 3;
// can also add valid categories here


export class EventService implements IEventService {
    constructor(private readonly repo: IEventRepository) {}

    async createEvent(input: CreateEventInput, organizerId: string): Promise<Result<Event, EventError>> {
        // can add role permissions later
        
        //validations 
        const title = input.title.trim();
        if (!title) return Err(ValidationError("Title is required"));
        if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
            return Err(ValidationError(`Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters`));
        }
        const description = input.description.trim();
        if (!description) return Err(ValidationError("Description is required"));
        if (description.length < DESC_MIN || description.length > DESC_MAX) {
            return Err(ValidationError(`Description must be between ${DESC_MIN} and ${DESC_MAX} characters`));
        }
        const location = input.location.trim();
        if (!location) return Err(ValidationError("Location is required"));   
        if (location.length < LOCATION_MIN) {
            return Err(ValidationError(`Location must be at least ${LOCATION_MIN} characters`));
        }

        const startDate = input.startDate;
        if (isNaN(startDate.getTime())) return Err(ValidationError("Start date is invalid"));
        if (startDate < new Date()) return Err(ValidationError("Start date must be in the future"));

        const endDate = input.endDate;
        if (isNaN(endDate.getTime())) return Err(ValidationError("End date is invalid"));
        if (endDate <= startDate) return Err(ValidationError("End date must be after start date"));

        const capacity = input.maxCapacity;
        if (capacity <= 0) return Err(ValidationError("Max capacity must be greater than 0"));

        const status = input.status ?? "draft";
        if (input.status !== undefined && input.status !== "published" && input.status !== "cancelled") {
            return Err(ValidationError("Status input can only be set to published or cancelled"));
        }

        // ADD CHECK TO CHECK FOR VALID CATEGORY

        const eventInput: CreateEventInput = {
            title: title,
            description: description,
            startDate: startDate,
            endDate: endDate,
            location: location,
            category: input.category,
            status: status,
            maxCapacity: capacity,
            organizerId: organizerId,
        };
        return await this.repo.add(eventInput);
    }

    // user role is now passed to getEvent()
    async getEvent(id: number, currentUser: { userId: string; role: string }): Promise<Result<Event, EventError>> {
        
        var event = await this.repo.getById(id);
        if (!event.ok) return event; // pass on repository errors

        // Draft visibility rule: only organizers and admins can see draft events
        const isAdmin = currentUser.role === "admin";
        if (event.value.status === "draft") {
          const isOrganizer = currentUser.userId === event.value.organizerId;
          if (!isOrganizer && !isAdmin) {
            return { ok: false, value: EventNotFound("Event not found") };
          }
        }

        // Invalid state: For now only admins can see cancelled events, maybe organizers later.
        if (event.value.status === "cancelled" && !isAdmin) {
          return { ok: false, value: InvalidContent("Event is cancelled") };
        }
        return event;
    }

    async getAllEvents(): Promise<Result<Event[], EventError>> {
        return await this.repo.getAll();
    }

    async getAllEventsByOrganizer(organizerId: string): Promise<Result<Event[], EventError>> {
        if (!organizerId) return Err(ValidationError("Organizer ID is required"));
        return await this.repo.getAllByOrganizer(organizerId);
    }
}

export function CreateEventService(repo: IEventRepository): IEventService {
    return new EventService(repo);
}