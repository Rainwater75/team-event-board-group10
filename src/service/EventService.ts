import { IEventRepository } from "../repository/EventRepository.js";
import { EventError, EventNotFound, InvalidContent, InvalidSearchInput } from "../lib/errors.js";
import { Ok, Err, Result } from "../lib/result.js";
import { CreateEventInput, Event, Category, EditEventInput } from "../model/Event.js";
import { ValidationError } from "../lib/errors.js";
import { UnauthorizedEventActionError } from "../lib/errors.js";
import { InvalidStateTransitionError } from "../lib/errors.js";

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
    publishEvent(id: number, userId: string): Promise<Result<Event, EventError>>;
    cancelEvent(id: number, userId: string): Promise<Result<Event, EventError>>;
    getAllEventsByOrganizer(organizerId: string): Promise<Result<Event[], EventError>>;
    searchEvents(query: string): Promise<Result<Event[], EventError>>;

    filterEvents?(
    category: string,
    query?: string,
    startAfter?: Date,
    ): Promise<Result<Event[], EventError>>;
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

    async filterEvents( // FIXED ONLY SHOWS PUBLISHED EVENTS, TAKE IN SEARCH PARAMS ALSO, AND USER ROLE (ORGANIZER, ADMIN,ETC)
        category?: string,
        query?: string,
        startAfter?: Date,
    ): Promise<Result<Event[], EventError>> {
        const result = await this.repo.getAll();
        if (!result.ok) return result;

        let events = result.value;

        //Only published events for filter
        events = events.filter(event => event.status === "published");

        // filter by category
        if (category && category.trim() && category !== "None") {
        events = events.filter(event => event.category === category);
    }
        // Search filter
        if (query && query.trim()) {
        const search = query.trim().toLowerCase();
        events = events.filter(event =>
            event.title.toLowerCase().includes(search) ||
            event.description.toLowerCase().includes(search) ||
            event.location.toLowerCase().includes(search)
            );
        }

        // filter by date
        if (startAfter) {
            events = events.filter(event => new Date(event.startDate) >= startAfter);
        }
        return Ok(events);
    }
    async publishEvent(id: number, userId: string): Promise<Result<Event, EventError>> {
    const result = await this.repo.getById(id);
    if (!result.ok) return result;

    const event = result.value;

    if (event.organizerId !== userId) {
        return Err(UnauthorizedEventActionError("Only the organizer can publish this event"));
    }

    if (event.status !== "draft") {
        return Err(InvalidStateTransitionError("Event must be draft to publish"));
    }

    return await this.repo.edit(id, { status: "published" });
}

    async cancelEvent(id: number, userId: string): Promise<Result<Event, EventError>> {
    const result = await this.repo.getById(id);
    if (!result.ok) return result;

    const event = result.value;

    //Can add permission for admin override but leaving it like this for now
    if (event.organizerId !== userId) {
        return Err(UnauthorizedEventActionError("Only the organizer can cancel this event"));
    }

    if (event.status !== "published") {
        return Err(InvalidStateTransitionError("Only published events can be cancelled"));
    }

    return await this.repo.edit(id, { status: "cancelled" });
    }

    async createEvent(input: CreateEventInput, organizerId: string, organizerDisplayName: string): Promise<Result<Event, EventError>> {
        // can add role permissions later
        
        //validations 
        const title = input.title.trim();
        if (!title) return Err(ValidationError("Title is required"));
        
        const description = input.description.trim();
        if (!description) return Err(ValidationError("Description is required"));
        
        const location = input.location.trim();
        if (!location) return Err(ValidationError("Location is required"));
        
        if (input.maxCapacity === undefined || input.maxCapacity === null) {
            return Err(ValidationError("Max capacity is required"));
        }

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

        if (input.startDate !== undefined && input.endDate !== undefined) {
            if (input.endDate <= input.startDate) {
                return ValidationError("End date must be after start date");
            }
        }

        if (input.maxCapacity !== undefined) {
            const capacity = input.maxCapacity;
            if (!Number.isFinite(capacity) || capacity <= 0) {
                return ValidationError("Max capacity must be greater than 0");
            }
        }

        if (input.status !== undefined) {
            const status = input.status;
            const allowedStatuses = ["draft", "published", "cancelled", "past"];
            if (!allowedStatuses.includes(status)) {
                return ValidationError("Status input must be " + allowedStatuses.slice(0, -1).join(", ") + " or " + allowedStatuses[allowedStatuses.length - 1]);
            }
        }
    }

    async getEvent(id: number, currentUser: { userId: string; role: string } | null): Promise<Result<Event, EventError>> {
        if (!currentUser) {
            return Err(ValidationError("User must be authenticated to view event details"));
        }
        var event = await this.repo.getById(id);
        if (!event.ok) return event; // pass on repository errors

        // Draft visibility rule: only organizers and admins can see draft events
        const isAdmin = currentUser.role === "admin";
        const isOrganizer = currentUser.userId === event.value.organizerId;
        if (event.value.status !== "published") {
          if (!isOrganizer && !isAdmin) {
            return { ok: false, value: EventNotFound("Event not found") };
          }
        }

        // Invalid state: Only admins/organizers can see cancelled/past events.
        if (event.value.status === "cancelled" && !isAdmin && !isOrganizer) {
          return { ok: false, value: InvalidContent("Event is cancelled") };
        }
        if (event.value.status === "past" && !isAdmin && !isOrganizer) {
          return { ok: false, value: InvalidContent("Event has past") };
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

    async searchEvents(query: string): Promise<Result<Event[], EventError>> {
        // search req can be empty
        if (query.trim().length > 500) return Err(InvalidSearchInput("Search query is too long"));
        return await this.repo.search(query);
    }
}

export function CreateEventService(repo: IEventRepository): IEventService {
    return new EventService(repo);
}