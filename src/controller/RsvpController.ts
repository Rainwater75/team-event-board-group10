import type { Response } from "express";
import type { ILoggingService } from "../service/LoggingService.js";
import type { IRsvpService } from "../service/RsvpService.js";
import type { RsvpError } from "../lib/RsvpErrors.js";

export interface IRsvpController {
  toggleFromRequest(
    res: Response,
    input: { eventIdRaw: string; userId: string },
  ): Promise<void>;

  attendeeListFromRequest(
    res: Response,
    input: { eventIdRaw: string; requesterId: string },
  ): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly service: IRsvpService,
    private readonly logger: ILoggingService,
  ) {}

  private mapErrorStatus(error: RsvpError): number {
    if (error.name === "RsvpValidationError") return 400;
    if (error.name === "RsvpNotAllowed") return 403;
    if (error.name === "RsvpNotFound") return 404;
    if (error.name === "RsvpInvalidState") return 409;
    if (error.name === "RsvpCapacityError") return 409;
    return 500;
  }

  private isHtmxRequest(res: Response): boolean {
    return res.req?.get("HX-Request") === "true";
  }

  async toggleFromRequest(
    res: Response,
    input: { eventIdRaw: string; userId: string },
  ): Promise<void> {
    const eventId = Number.parseInt(input.eventIdRaw, 10);

    const result = await this.service.toggleRsvp({
      eventId,
      userId: input.userId,
    });

    if (result.ok === false) {
      const status = this.mapErrorStatus(result.value);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `RSVP toggle failed: ${result.value.message}`);

      if (this.isHtmxRequest(res)) {
        res.status(status).render("partials/rsvp-button", {
          layout: false,
          eventId: Number.isNaN(eventId) ? 0 : eventId,
          attendeeCount: null,
          maxCapacity: null,
          rsvpStatus: null,
          pageError: result.value.message,
        });
        return;
      }

      res.status(status).json({
        ok: false,
        error: result.value,
      });
      return;
    }

    this.logger.info(
      `RSVP toggled for user ${result.value.userId} on event ${result.value.eventId} -> ${result.value.rsvpStatus}`,
    );

    if (this.isHtmxRequest(res)) {
      res.render("partials/rsvp-button", {
        layout: false,
        eventId: result.value.eventId,
        attendeeCount: result.value.attendeeCount,
        maxCapacity: null,
        rsvpStatus: result.value.rsvpStatus,
        pageError: null,
      });
      return;
    }

    res.json({
      ok: true,
      value: result.value,
    });
  }

  async attendeeListFromRequest(
    res: Response,
    input: { eventIdRaw: string; requesterId: string },
  ): Promise<void> {
    const eventId = Number.parseInt(input.eventIdRaw, 10);

    const result = await this.service.getAttendeeList({
      eventId,
      requesterId: input.requesterId,
    });

    if (result.ok === false) {
      const status = this.mapErrorStatus(result.value);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Attendee list failed: ${result.value.message}`);

      if (this.isHtmxRequest(res)) {
        res.status(status).render("partials/attendee-list", {
          layout: false,
          attendeeGroups: null,
          pageError: result.value.message,
        });
        return;
      }

      res.status(status).json({
        ok: false,
        error: result.value,
      });
      return;
    }

    this.logger.info(`Loaded attendee list for event ${eventId}`);

    if (this.isHtmxRequest(res)) {
      res.render("partials/attendee-list", {
        layout: false,
        attendeeGroups: result.value,
        pageError: null,
      });
      return;
    }

    res.json({
      ok: true,
      value: result.value,
    });
  }
}

export function CreateRsvpController(
  service: IRsvpService,
  logger: ILoggingService,
): IRsvpController {
  return new RsvpController(service, logger);
}