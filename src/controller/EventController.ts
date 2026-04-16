import type { Response } from "express";
import { AuthenticationRequired } from "../auth/errors.js";
import type { Category, CreateEventInput } from "../model/Event.js";
import type { IAppBrowserSession } from "../session/AppSession.js";
import type { IEventService } from "../service/EventService.js";
import type { ILoggingService } from "../service/LoggingService.js";
import { EventError } from "../lib/errors.js";

export interface IEventController {
    createFromForm(
        res: Response,
        session: IAppBrowserSession,
        title: string,
        description: string,
        category: Category,
        location: string,
        startDateRaw: string,
        endDateRaw: string,
        maxCapacityRaw: string,
    ): Promise<void>;

    showCreateForm(res: Response, session: IAppBrowserSession, pageError?: string | null): Promise<void>;
    displayOrganizerDashboard(res: Response, session: IAppBrowserSession, pageError?: string | null): Promise<void>;
    showEventDetails(res: Response, session: IAppBrowserSession, eventId: number,): Promise<void>;
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

    private isHtmxRequest(res: Response): boolean {
        return res.req?.get("HX-Request") === "true";
    }

    async createFromForm(
        res: Response,
        session: IAppBrowserSession,
        title: string,
        description: string,
        category: Category,
        location: string,
        startDateRaw: string,
        endDateRaw: string,
        maxCapacityRaw: string,
    ): Promise<void> {
        this.logger.info("Creating event from form");
        const isHtmx = this.isHtmxRequest(res);

        const currentUser = session.authenticatedUser;
        if (!currentUser) {
            if (isHtmx) {
                res.set("HX-Redirect", "/login");
                res.status(204).send();
                return;
            }
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
            startDate: startDateRaw
                ? new Date(startDateRaw)
                : new Date(Date.now() + 60 * 60 * 1000),
            endDate: endDateRaw
                ? new Date(endDateRaw)
                : new Date(Date.now() + 2 * 60 * 60 * 1000),
            location,
            maxCapacity: Number(maxCapacityRaw),
            organizerId: currentUser.userId,
        };

        const result = await this.service.createEvent(input, currentUser.userId);
        if (!result.ok && this.isEventError(result.value)) {
            const status = this.mapErrorStatus(result.value);
            const log = status === 400 ? this.logger.warn : this.logger.error;
            log.call(this.logger, `Failed to create event: ${result.value.message}`);
            res.status(isHtmx ? 200 : status).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }

        if(!result.ok) {
            res.status(isHtmx ? 200 : 500).render("partials/error", {
                message: "An unexpected error occurred while creating the event.",
                layout: false,
            });
            return;
        }

        this.logger.info(`Created event id: ${result.value.id} by organizer: ${currentUser.userId}`);
        if (isHtmx) {
            res.set("HX-Redirect", "/home");
            res.status(204).send();
            return;
        }
        res.redirect("/home");
    }

    async showEventDetails(
        res: Response,
        session: IAppBrowserSession,
        eventId: number,
    ): Promise<void> {
        this.logger.info(`Fetching event details for id=${eventId}`);
        //const isHtmx = this.isHtmxRequest(res);
        const currentUser = session.authenticatedUser;
        const result = await this.service.getEvent(eventId, currentUser);

        // Error handling
        if (!result.ok && this.isEventError(result.value)) {
            const status = this.mapErrorStatus(result.value);

            const log = status === 400 ? this.logger.warn : this.logger.error;
            log.call(this.logger, `Failed to fetch event: ${result.value.message}`);

            res.status(status).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }
        if (!result.ok) {
            res.status(500).render("partials/error", {
                message: "Unexpected error fetching event.",
                layout: false,
            });
            return;
        }

        const event = result.value;
        // Role logic
        const isOrganizer = currentUser?.userId === event.organizerId;
        const isAdmin = currentUser?.role === "admin";
        const isMember = currentUser?.role === "user";

        res.render("event-detail", {
            session,
            event,
            attendingCount: event.attendingUsers.length,
            canEdit: isOrganizer || isAdmin,
            canCancel: isOrganizer || isAdmin,
            canRSVP: isMember,
            isDraft: event.status === "draft",
        });
    }

    async showCreateForm(
        res: Response, 
        session: IAppBrowserSession,
        pageError: string | null = null
    ): Promise<void> {
        const currentUser = session.authenticatedUser;
        if (!currentUser) {
            res.status(401).render("partials/error", {
                message: AuthenticationRequired("Please log in to continue.").message,
                layout: false,
            });
            return;
        }

        res.render("create", { pageError, session });
    }

    async displayOrganizerDashboard(
        res: Response, 
        session: IAppBrowserSession,
        pageError: string | null = null
    ): Promise<void> {
        const currentUser = session.authenticatedUser;
        if (!currentUser) {
            res.status(401).render("partials/error", {
                message: AuthenticationRequired("Please log in to continue.").message,
                layout: false,
            });
            return;
        }  
        const eventsResult = await this.service.getAllEventsByOrganizer(currentUser.userId);
        if (!eventsResult.ok) {
            const message = this.isEventError(eventsResult.value)
                ? eventsResult.value.message
                : "Failed to load organizer events.";
            this.logger.error(`Failed to load organizer dashboard events: ${message}`);
            res.render("organizerDashboard", { pageError: message, session, events: [] });
            return;
        }

        res.render("organizerDashboard", { pageError, session, events: eventsResult.value });
    }
}

export function CreateEventController(
    service: IEventService,
    logger: ILoggingService,
): IEventController {
    return new EventController(service, logger);
}