import { IEventRepository } from "../repository/EventRepository.js";
import { EventError, EventNotFound, InvalidContent } from "../lib/errors.js";
import { Ok, Err, Result } from "../lib/result.js";
import { CreateEventInput, Event, Category, EditEventInput } from "../model/Event.js";
import { ValidationError } from "../lib/errors.js";

export interface IEventService {
    createEvent(
        input: CreateEventInput, 
        organizerId: string,
        organizerDisplayName: string
    ): Promise<Result<Event, EventError>>;
    editEvent(
        id: number, 
        input: EditEventInput
    ): Promise<Result<Event, EventError>>,

    getEvent(id: number, currentUser: { userId: string; role: string } | null): Promise<Result<Event, EventError>>;
    getAllEvents(): Promise<Result<Event[], EventError>>;
<<<<<<< HEAD

    publishEvent(
        id: number,
        actingUserId: string,
    ): Promise<Result<Event, EventError>>;

    cancelEvent(
        id: number,
        actingUserId: string,
        actingUserRole: "admin" | "staff" | "user",
    ): Promise<Result<Event, EventError>>;
=======
    getAllEventsByOrganizer(organizerId: string): Promise<Result<Event[], EventError>>;
    searchEvents(query: string): Promise<Result<Event[], EventError>>;
>>>>>>> f70f4952f9d28c9a6a059d1a836e8fdcbe55f5a8
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

    async createEvent(input: CreateEventInput, organizerId: string, organizerDisplayName: string): Promise<Result<Event, EventError>> {
        // can add role permissions later
        
        //validations 
        const title = input.title.trim();
        if (!title) return Err(ValidationError("Title is required"));
        
        const description = input.description.trim();
        if (!description) return Err(ValidationError("Description is required"));
        
        const location = input.location.trim();
        if (!location) return Err(ValidationError("Location is required"));   

        const validationError = this.validateEventInput(input);
        if (validationError !== undefined) return Err(validationError);

        // ADD CHECK TO CHECK FOR VALID CATEGORY

        const eventInput: CreateEventInput = {
            title: title,
            description: description,
            startDate: input.startDate,
            endDate: input.endDate,
            location: location,
            category: input.category,
            status: input.status,
            maxCapacity: input.maxCapacity,
            organizerId: organizerId,
            organizerName: organizerDisplayName,
        };
        return await this.repo.add(eventInput);
    }

    async editEvent(id: number, input: EditEventInput): Promise<Result<Event, EventError>> {
        const validationError = this.validateEventInput(input);
        if (validationError !== undefined) return Err(validationError);

        return await this.repo.edit(id, input);
    }

    private validateEventInput(input: CreateEventInput | EditEventInput): EventError | undefined {
        if (input.title !== undefined) {
            const title = input.title.trim();
            if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
                return ValidationError(`Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters`);
            }
        }

        if (input.description !== undefined) {
            const description = input.description.trim();
            if (description.length < DESC_MIN || description.length > DESC_MAX) {
                return ValidationError(`Description must be between ${DESC_MIN} and ${DESC_MAX} characters`);
            }
        }

        if (input.location !== undefined) {
            const location = input.location.trim();
            if (location.length < LOCATION_MIN) {
                return ValidationError(`Location must be at least ${LOCATION_MIN} characters`);
            }
        }

        if (input.startDate !== undefined) {
            const startDate = input.startDate;
            if (isNaN(startDate.getTime())) return ValidationError("Start date is invalid");
            if (startDate < new Date()) return ValidationError("Start date must be in the future");
        }

        if (input.endDate !== undefined) {
            const endDate = input.endDate;
            if (isNaN(endDate.getTime())) return ValidationError("End date is invalid");
            if (endDate < new Date()) return ValidationError("End date must be in the future");
        }

        if (input.maxCapacity !== undefined) {
            const capacity = input.maxCapacity;
            if (capacity <= 0) return ValidationError("Max capacity must be greater than 0");
        }

        if (input.status !== undefined) {
            const status = input.status;
            if (status !== "published" && status !== "cancelled") {
                return ValidationError("Status input can only be set to published or cancelled");
            }
        }
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

    async publishEvent(
        id: number,
        actingUserId: string,
    ): Promise<Result<Event, EventError>> {
        const found = await this.repo.getById(id);

        if (!found.ok) {
            return found;
        }

        const event = found.value;

        if (event.organizerId !== actingUserId) {
            return Err(ValidationError("Only the organizer can publish this event."));
        }

        if (event.status !== "draft") {
            return Err(ValidationError("Only draft events can be published."));
        }

        return await this.repo.updateStatus(id, "published");
    }

    async cancelEvent(
        id: number,
        actingUserId: string,
        actingUserRole: "admin" | "staff" | "user",
    ): Promise<Result<Event, EventError>> {
        const found = await this.repo.getById(id);

        if (!found.ok) {
            return found;
        }

        const event = found.value;
        const isOwner = event.organizerId === actingUserId;
        const isAdmin = actingUserRole === "admin";

        if (!isOwner && !isAdmin) {
            return Err(ValidationError("Only the organizer or an admin can cancel this event."));
        }

        if (event.status !== "published") {
            return Err(ValidationError("Only published events can be cancelled."));
        }

        return await this.repo.updateStatus(id, "cancelled");
    async getAllEventsByOrganizer(organizerId: string): Promise<Result<Event[], EventError>> {
        if (!organizerId) return Err(ValidationError("Organizer ID is required"));
        return await this.repo.getAllByOrganizer(organizerId);
    }

    async searchEvents(query: string): Promise<Result<Event[], EventError>> {
        return await this.repo.search(query);
    }
}

export function CreateEventService(repo: IEventRepository): IEventService {
    return new EventService(repo);
}