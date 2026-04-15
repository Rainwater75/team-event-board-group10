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
    ): Promise<void>;

    showCreateForm(res: Response, session: IAppBrowserSession, pageError?: string | null): Promise<void>;
    displayOrganizerDashboard(res: Response, session: IAppBrowserSession, pageError?: string | null): Promise<void>;
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
            // default to 1 hour in the future
            startDate: new Date(Date.now() + 60 * 60 * 1000),
            location: "TBD",
            maxCapacity: 100, // placeholder, can add capacity input later
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
        const events = await this.service.getAllEventsByOrganizer(currentUser.userId);
        res.render("organizerDashboard", { pageError, session, events });
    }
}

export function CreateEventController(
    service: IEventService,
    logger: ILoggingService,
): IEventController {
    return new EventController(service, logger);
}