import type { Response } from "express";
import { AuthenticationRequired, AuthError, AuthorizationRequired } from "../auth/errors.js";
import { Category, CreateEventInput, EditEventInput, EventStatus } from "../model/Event.js";
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
    editFromForm(
        res: Response,
        session: IAppBrowserSession,
        id: number,
        title?: string,
        description?: string,
        startDateRaw?: string,
        endDateRaw?: string,
        location?: string,
        category?: Category,
        maxCapacityRaw?: string,
        status?: EventStatus,
    ): Promise<void>

<<<<<<< HEAD
    showCreateForm(res: Response, session: IAppBrowserSession): void;

    publishFromForm(
        res: Response,
        session: IAppBrowserSession,
        eventIdRaw: string,
    ): Promise<void>;

    cancelFromForm(
        res: Response,
        session: IAppBrowserSession,
        eventIdRaw: string,
    ): Promise<void>;
=======
    showCreateForm(res: Response, session: IAppBrowserSession, pageError?: string | null): Promise<void>;
    displayOrganizerDashboard(res: Response, session: IAppBrowserSession, pageError?: string | null): Promise<void>;
    showEventDetails(res: Response, session: IAppBrowserSession, eventId: number): Promise<void>;
    searchEvents(res: Response, session: IAppBrowserSession, query: string): Promise<void>;
>>>>>>> f70f4952f9d28c9a6a059d1a836e8fdcbe55f5a8
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

    private mapErrorStatus(error: EventError | AuthError): number {
        if (error.name === "ValidationError" || error.name === "InvalidContent") return 400; // bad request
        if (error.name === "AuthorizationRequired") return 403; // forbidden
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
            organizerName: currentUser.displayName,
        };

        const result = await this.service.createEvent(input, currentUser.userId, currentUser.displayName);
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
            res.set("HX-Redirect", "/events");
            res.status(204).send();
            return;
        }
        res.redirect("/events");
    }
    
    async editFromForm(
        res: Response,
        session: IAppBrowserSession,
        id: number,
        title?: string,
        description?: string,
        startDateRaw?: string,
        endDateRaw?: string,
        location?: string,
        category?: Category,
        maxCapacityRaw?: string,
        status?: EventStatus,
    ): Promise<void> {
        this.logger.info("Editing event from form");
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
        
        //authorization check: Only the organizer or an admin can edit the event
        const eventResult = await this.service.getEvent(id, currentUser);
        if (!eventResult.ok) {
            //if getEvent failed, it means the event doesn't exist or the user doesn't have view permissions
            const status = this.mapErrorStatus(eventResult.value);
            const log = status === 400 ? this.logger.warn : this.logger.error;
            log.call(this.logger, `Failed to retrieve event for editing: ${eventResult.value.message}`);
            res.status(isHtmx ? 200 : status).render("partials/error", {
                message: eventResult.value.message,
                layout: false,
            });
            return;
        }

        const event = eventResult.value;
        const isOrganizer = currentUser.userId === event.organizerId;
        const isAdmin = currentUser.role === "admin";

        if (!isOrganizer && !isAdmin) {
            this.logger.warn(`User ${currentUser.userId} attempted to edit event ${id} without authorization.`);
            res.status(isHtmx ? 200 : 403).render("partials/error", {
                message: AuthorizationRequired("You are not authorized to edit this event.").message,
                layout: false,
            });
            return;
        }


        const input: EditEventInput = {
            title: title,
            description: description,
            startDate: startDateRaw !== undefined ? new Date(startDateRaw) : undefined,
            endDate: endDateRaw !== undefined ? new Date(endDateRaw) : undefined,
            location: location,
            category: category,
            maxCapacity: maxCapacityRaw !== undefined ? Number(maxCapacityRaw) : undefined,
            status: status
        };

        const result = await this.service.editEvent(id, input);
        if (!result.ok && this.isEventError(result.value)) {
            const status = this.mapErrorStatus(result.value);
            const log = status === 400 ? this.logger.warn : this.logger.error;
            log.call(this.logger, `Failed to edit event: ${result.value.message}`);
            res.status(isHtmx ? 200 : status).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }

        if(!result.ok) {
            res.status(isHtmx ? 200 : 500).render("partials/error", {
                message: "An unexpected error occurred while editing the event.",
                layout: false,
            });
            return;
        }

        this.logger.info(`Edited event id: ${id} by organizer: ${currentUser.userId}`);
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
        // we can later check if member before allowing RSVP, but for now anyone can RSVP to published events

        res.render("event-detail", {
            session,
            event,
            attendingCount: event.attendingUsers.length,
            canEdit: isOrganizer || isAdmin,
            canCancel: isOrganizer || isAdmin,
            canRSVP: true, // Later we should check if user is member and event is published before allowing RSVP
            isDraft: event.status === "draft",
            organizerName: event.organizerName,
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
            return Promise.resolve();
        }

        res.render("create", { pageError, session });
        return Promise.resolve(); // returning here to fix typing error
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
            return Promise.resolve();
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

    async searchEvents( res: Response, session: IAppBrowserSession, query: string): Promise<void> {
        this.logger.info(`Searching events with query: "${query}"`);
        const result = await this.service.searchEvents(query);
        if (!result.ok) {
            const message = this.isEventError(result.value) ? result.value.message : "Failed to search events.";
            this.logger.error(`Event search failed: ${message}`);
            res.status(500).render("partials/error", { message, layout: false});
            return;
        }  
        res.render("event-list", { session, events: result.value, query });
    }
    
    async publishFromForm(
        res: Response,
        session: IAppBrowserSession,
        eventIdRaw: string,
    ): Promise<void> {
        const currentUser = session.authenticatedUser;
        if (!currentUser) {
            res.status(401).render("partials/error", {
                message: AuthenticationRequired("Please log in to continue.").message,
                layout: false,
            });
            return;
        }

        const eventId = Number(eventIdRaw);
        if (Number.isNaN(eventId)) {
            res.status(400).render("partials/error", {
                message: "Invalid event id.",
                layout: false,
            });
            return;
        }

        const result = await this.service.publishEvent(eventId, currentUser.userId);

        if (!result.ok) {
            const status = this.mapErrorStatus(result.value);
            res.status(status).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }

        res.redirect("/home");
    }

    async cancelFromForm(
        res: Response,
        session: IAppBrowserSession,
        eventIdRaw: string,
    ): Promise<void> {
        const currentUser = session.authenticatedUser;
        if (!currentUser) {
            res.status(401).render("partials/error", {
                message: AuthenticationRequired("Please log in to continue.").message,
                layout: false,
            });
            return;
        }

        const eventId = Number(eventIdRaw);
        if (Number.isNaN(eventId)) {
            res.status(400).render("partials/error", {
                message: "Invalid event id.",
                layout: false,
            });
            return;
        }

        const result = await this.service.cancelEvent(
            eventId,
            currentUser.userId,
            currentUser.role,
        );

        if (!result.ok) {
            const status = this.mapErrorStatus(result.value);
            res.status(status).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }

        res.redirect("/home");
    }
}

export function CreateEventController(
    service: IEventService,
    logger: ILoggingService,
): IEventController {
    return new EventController(service, logger);
}