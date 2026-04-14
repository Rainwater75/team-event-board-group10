import { Err, Ok, type Result } from "../lib/result.js";
import type { IUserRepository } from "../auth/UserRepository.js";
import type { IEventRepository } from "../repository/EventRepository.js";
import type {
  IRsvpRecord,
  IRsvpRepository,
  IRsvpToggleResult,
  RsvpStatus,
} from "../repository/RsvpRepository.js";
import type { RsvpError } from "../lib/RsvpErrors.js";
import {
  RsvpCapacityError,
  RsvpDependencyError,
  RsvpInvalidState,
  RsvpNotAllowed,
  RsvpNotFound,
  RsvpValidationError,
} from "../lib/RsvpErrors.js";

export interface ToggleRsvpInput {
  eventId: number;
  userId: string;
}

export interface IRsvpService {
  toggleRsvp(input: ToggleRsvpInput): Promise<Result<IRsvpToggleResult, RsvpError>>;
}

class RsvpService implements IRsvpService {
  constructor(
    private readonly events: IEventRepository,
    private readonly rsvps: IRsvpRepository,
    private readonly users: IUserRepository,
  ) {}

  async toggleRsvp(input: ToggleRsvpInput): Promise<Result<IRsvpToggleResult, RsvpError>> {
    if (!Number.isInteger(input.eventId) || input.eventId <= 0) {
      return Err(RsvpValidationError("A valid event ID is required."));
    }

    if (!input.userId.trim()) {
      return Err(RsvpValidationError("A valid user ID is required."));
    }

    const userResult = await this.users.findById(input.userId);
    if (userResult.ok === false) {
      return Err(RsvpDependencyError(userResult.value.message));
    }

    if (!userResult.value) {
      return Err(RsvpValidationError("A valid user ID is required."));
    }

    if (userResult.value.role !== "user") {
      return Err(RsvpNotAllowed("Only members can RSVP."));
    }

    const eventResult = await this.events.getById(input.eventId);
    if (eventResult.ok === false) {
      return Err(RsvpNotFound(`Event ${input.eventId} not found.`));
    }

    const event = eventResult.value;

    if (event.organizerId === input.userId) {
      return Err(RsvpNotAllowed("Organizers cannot RSVP to their own events."));
    }

    if ((event as { cancelled?: boolean }).cancelled === true) {
      return Err(RsvpInvalidState("Cancelled events cannot accept RSVPs."));
    }

    if (event.startDate.getTime() <= Date.now()) {
      return Err(RsvpInvalidState("Past events cannot accept RSVPs."));
    }

    const existingResult = await this.rsvps.findByEventAndUser(input.eventId, input.userId);
    if (existingResult.ok === false) {
      return Err(RsvpDependencyError(existingResult.value.message));
    }

    const attendeeCountResult = await this.rsvps.countGoingByEvent(input.eventId);
    if (attendeeCountResult.ok === false) {
      return Err(RsvpCapacityError(attendeeCountResult.value.message));
    }

    const currentAttendeeCount = attendeeCountResult.value;
    const hasSpace = currentAttendeeCount < event.maxCapacity;
    const now = new Date();
    const existing = existingResult.value;

    if (!existing) {
      const nextStatus: RsvpStatus = hasSpace ? "going" : "waitlisted";
      const newRecord: IRsvpRecord = {
        eventId: input.eventId,
        userId: input.userId,
        status: nextStatus,
        createdAt: now,
        updatedAt: now,
      };

      const saveResult = await this.rsvps.upsert(newRecord);
      if (saveResult.ok === false) {
        return Err(RsvpDependencyError(saveResult.value.message));
      }

      return Ok({
        eventId: input.eventId,
        userId: input.userId,
        rsvpStatus: nextStatus,
        attendeeCount: nextStatus === "going" ? currentAttendeeCount + 1 : currentAttendeeCount,
      });
    }

    if (existing.status === "going" || existing.status === "waitlisted") {
      const cancelledRecord: IRsvpRecord = {
        ...existing,
        status: "cancelled",
        updatedAt: now,
      };

      const saveResult = await this.rsvps.upsert(cancelledRecord);
      if (saveResult.ok === false) {
        return Err(RsvpDependencyError(saveResult.value.message));
      }

      return Ok({
        eventId: input.eventId,
        userId: input.userId,
        rsvpStatus: "cancelled",
        attendeeCount:
          existing.status === "going"
            ? Math.max(0, currentAttendeeCount - 1)
            : currentAttendeeCount,
      });
    }

    const reactivatedStatus: RsvpStatus = hasSpace ? "going" : "waitlisted";
    const reactivatedRecord: IRsvpRecord = {
      ...existing,
      status: reactivatedStatus,
      updatedAt: now,
    };

    const saveResult = await this.rsvps.upsert(reactivatedRecord);
    if (saveResult.ok === false) {
      return Err(RsvpDependencyError(saveResult.value.message));
    }

    return Ok({
      eventId: input.eventId,
      userId: input.userId,
      rsvpStatus: reactivatedStatus,
      attendeeCount:
        reactivatedStatus === "going"
          ? currentAttendeeCount + 1
          : currentAttendeeCount,
    });
  }
}

export function CreateRsvpService(
  events: IEventRepository,
  rsvps: IRsvpRepository,
  users: IUserRepository,
): IRsvpService {
  return new RsvpService(events, rsvps, users);
}