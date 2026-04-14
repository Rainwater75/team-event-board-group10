import type { Response } from "express";
import { AuthenticationRequired } from "../auth/errors.js";
import type { Category, CreateEventInput } from "../model/Event.js";
import { getAuthenticatedUser, type AppSessionStore } from "../session/AppSession.js";
import type { IEventService } from "../service/EventService.js";
import type { ILoggingService } from "../service/LoggingService.js";
import { EventError } from "../lib/errors.js";

export interface IEventController {
    createFromForm(
        res: Response,
        store: AppSessionStore,
        title: string,
        description: string,
        category: Category,
    ): Promise<void>;
}

class EventController implements IEventController {
    constructor(
        private readonly service: IEventService,
        private readonly logger: ILoggingService,
    ) {}

    private isEventError(value: unknown): value is EventError {
        return (
            typeof value === "object" &&
            value !== null &&
            "name" in value &&
            "message" in value
        );
    }

    private mapErrorStatus(error: EventError): number {
        if (error.name === "ValidationError" || error.name === "InvalidContent") return 400; // bad request
        if (error.name === "EventNotFound") return 404; // not found
        return 500; // internal server error for unexpected errors
    }

    async createFromForm(
        res: Response,
        store: AppSessionStore,
        title: string,
        description: string,
        category: Category,
    ): Promise<void> {
        this.logger.info("Creating event from form");

        const currentUser = getAuthenticatedUser(store);
        // maybe this should be a redirect 302
        if (!currentUser) {
            res.status(401).render("partials/error", {
                message: AuthenticationRequired("Please log in to continue.").message,
                layout: false,
            });
            return;
        }

        const input: CreateEventInput = {
            title,
            description,
            category,
            startDate: new Date(), // placeholder, can add date input later
            location: "TBD",
            maxCapacity: 100, // placeholder, can add capacity input later
        };

        const result = await this.service.createEvent(input, currentUser.userId);
        if (!result.ok && this.isEventError(result.value)) {
            const status = this.mapErrorStatus(result.value);
            const log = status === 400 ? this.logger.warn : this.logger.error;
            log.call(this.logger, `Failed to create event: ${result.value.message}`);
            res.status(status).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }

        if(!result.ok) {
            res.status(500).render("partials/error", {
                message: "An unexpected error occurred while creating the event.",
                layout: false,
            });
            return;
        }

        this.logger.info(`Created event id: ${result.value.id} by organizer: ${currentUser.userId}`);
        res.redirect("/home");
    }
}

export function CreateEventController(
    service: IEventService,
    logger: ILoggingService,
): IEventController {
    return new EventController(service, logger);
}