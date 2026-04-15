import { IEventRepository } from "../repository/EventRepository.js";
import { EventError } from "../lib/errors.js";
import { Ok, Err, Result } from "../lib/result.js";
import { CreateEventInput, Event, Category } from "../model/Event.js";
import { ValidationError } from "../lib/errors.js";

export interface IEventService {
    createEvent(
        input: CreateEventInput, 
        organizerId: string
    ): Promise<Result<Event, EventError>>;

    getEvent(id: number): Promise<Result<Event, EventError>>;
    getAllEvents(): Promise<Result<Event[], EventError>>;

    publishEvent(
        id: number,
        actingUserId: string,
    ): Promise<Result<Event, EventError>>;

    cancelEvent(
        id: number,
        actingUserId: string,
        actingUserRole: "admin" | "staff" | "user",
    ): Promise<Result<Event, EventError>>;
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

        const capacity = input.maxCapacity;
        if (capacity <= 0) return Err(ValidationError("Max capacity must be greater than 0"));

        const eventInput: CreateEventInput = {
            title: title,
            description: description,
            startDate: startDate,
            location: location,
            category: input.category,
            maxCapacity: capacity,
            public: input.public, // or set to to false by default 

        };
        return await this.repo.add(eventInput);
    }

    async getEvent(id: number): Promise<Result<Event, EventError>> {
        return await this.repo.getById(id);
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
    }
}

export function CreateEventService(repo: IEventRepository): IEventService {
    return new EventService(repo);
}