import { IEventRepository } from "../repository/EventRepository.js";
import { EventError, EventNotFound, InvalidContent } from "../lib/errors.js";
import { Ok, Err, Result } from "../lib/result.js";
import { CreateEventInput, Event, Category, EditEventInput } from "../model/Event.js";
import { ValidationError } from "../lib/errors.js";

//Add filter types for category and timeframe
export type EventTimeframe = "upcoming" | "week" | "weekend";

export interface EventFilter {
    category?: Category | "all";
    timeframe?: EventTimeframe;
}

export interface IEventService {
    createEvent(
        input: CreateEventInput, 
        organizerId: string
    ): Promise<Result<Event, EventError>>;
    editEvent(
        id: number, 
        input: EditEventInput
    ): Promise<Result<Event, EventError>>,

    getEvent(id: number, currentUser: { userId: string; role: string } | null): Promise<Result<Event, EventError>>;
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
    
    filterEvents(filter: EventFilter): Promise<Result<Event[], EventError>>;
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
    //Added helper methods for filter to check this week and this weekend
    private isThisWeek(date: Date): boolean {
        const now = new Date();
        const end = new Date(now);
        end.setDate(now.getDate() + 7);
        return date >= now && date <= end;
    }

    private isThisWeekend(date: Date): boolean {
        const now = new Date();
        const day = now.getDay(); // 0 = Sun, 6 = Sat

        const saturday = new Date(now);
        saturday.setDate(now.getDate() + ((6 - day + 7) % 7));
        saturday.setHours(0, 0, 0, 0);

        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        sunday.setHours(23, 59, 59, 999);

        return date >= saturday && date <= sunday;
    }

    async createEvent(input: CreateEventInput, organizerId: string): Promise<Result<Event, EventError>> {
        // can add role permissions later
        
        //validations 
        const title = input.title.trim();
        if (!title) return Err(ValidationError("Title is required"));
        
        const description = input.description.trim();
        if (!description) return Err(ValidationError("Description is required"));
        
        const location = input.location.trim();
        if (!location) return Err(ValidationError("Location is required"));   
        if (location.length < LOCATION_MIN) {
            return Err(ValidationError(`Location must be at least ${LOCATION_MIN} characters`));
        }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e6e69cefc9e0d3922e0bd46080377765992756dd
        const startDate = input.startDate;
        if (isNaN(startDate.getTime())) return Err(ValidationError("Start date is invalid"));
        if (startDate < new Date()) return Err(ValidationError("Start date must be in the future"));

        const capacity = input.maxCapacity;
        if (capacity <= 0) return Err(ValidationError("Max capacity must be greater than 0"));
<<<<<<< HEAD
=======
        const validationError = this.validateEventInput(input);
        if (validationError !== undefined) return Err(validationError);
>>>>>>> 723a0471dc06f9d4979e6b48e748f271f25e1f3a
=======
>>>>>>> e6e69cefc9e0d3922e0bd46080377765992756dd

        // ADD CHECK TO CHECK FOR VALID CATEGORY

        const eventInput: CreateEventInput = {
            title: title,
            description: description,
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e6e69cefc9e0d3922e0bd46080377765992756dd
            startDate: startDate,
            location: location,
            category: input.category,
            status: input.status, // or set to to false by default 
            maxCapacity: capacity,
<<<<<<< HEAD
=======
            startDate: input.startDate,
            endDate: input.endDate,
            location: location,
            category: input.category,
            status: input.status,
            maxCapacity: input.maxCapacity,
>>>>>>> 723a0471dc06f9d4979e6b48e748f271f25e1f3a
=======
>>>>>>> e6e69cefc9e0d3922e0bd46080377765992756dd
            organizerId: organizerId,
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

    async filterEvents(filter: EventFilter): Promise<Result<Event[], EventError>> {
        const found = await this.repo.getAll();

        if (!found.ok) {
            return found;
        }

        const now = new Date();

        let events = found.value.filter((event) => {
            return event.status === "published" && event.startDate >= now;
        });

        if (filter.category && filter.category !== "all") {
            events = events.filter((event) => event.category === filter.category);
        }

        if (filter.timeframe === "week") {
            events = events.filter((event) => this.isThisWeek(event.startDate));
        } else if (filter.timeframe === "weekend") {
            events = events.filter((event) => this.isThisWeekend(event.startDate));
        }

        return Ok(events);
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