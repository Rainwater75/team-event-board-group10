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

export interface IAttendeeListGroup {
  attending: { displayName: string; createdAt: Date }[];
  waitlisted: { displayName: string; createdAt: Date }[];
  cancelled: { displayName: string; createdAt: Date }[];
}

export interface GetAttendeeListInput {
  eventId: number;
  requesterId: string;
}

export interface IRsvpService {
  toggleRsvp(input: ToggleRsvpInput): Promise<Result<IRsvpToggleResult, RsvpError>>;

  getAttendeeList(
    input: GetAttendeeListInput,
  ): Promise<Result<IAttendeeListGroup, RsvpError>>;
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
    
    if (event.status === "cancelled") {
      return Err(RsvpInvalidState("Cancelled events cannot accept RSVPs."));
    }
    
    if (event.status === "past" || event.startDate.getTime() <= Date.now()) {
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

      const nextStatus: RsvpStatus = "cancelled";

      return Ok({
        eventId: input.eventId,
        userId: input.userId,
        rsvpStatus: nextStatus,
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

  async getAttendeeList(
    input: GetAttendeeListInput,
  ): Promise<Result<IAttendeeListGroup, RsvpError>> {
    if (!Number.isInteger(input.eventId) || input.eventId <= 0) {
      return Err(RsvpValidationError("A valid event ID is required."));
    }

    if (!input.requesterId.trim()) {
      return Err(RsvpValidationError("A valid requester ID is required."));
    }

    const eventResult = await this.events.getById(input.eventId);
    if (eventResult.ok === false) {
      return Err(RsvpNotFound(`Event ${input.eventId} not found.`));
    }

    const event = eventResult.value;

    const requesterResult = await this.users.findById(input.requesterId);
    if (requesterResult.ok === false) {
      return Err(RsvpDependencyError("Failed to resolve requester."));
    }

    const requester = requesterResult.value;
    if (!requester) {
      return Err(RsvpValidationError("Requester not found."));
    }

    const isOrganizer = event.organizerId === requester.id;
    const isAdmin = requester.role === "admin";

    if (!isOrganizer && !isAdmin) {
      return Err(RsvpNotAllowed("Only organizer or admin can view attendees."));
    }

    const attendeeResult = await this.rsvps.listByEvent(input.eventId);
    if (attendeeResult.ok === false) {
      return Err(RsvpDependencyError("Failed to load attendee list."));
    }

    const grouped: IAttendeeListGroup = {
      attending: [],
      waitlisted: [],
      cancelled: [],
    };

    for (const record of attendeeResult.value) {
      const userResult = await this.users.findById(record.userId);

      if (userResult.ok === false) {
        return Err(RsvpDependencyError("Failed to resolve attendee user."));
      }

      if (!userResult.value) {
        return Err(RsvpDependencyError("Failed to resolve attendee user."));
      }

      const entry = {
        displayName: userResult.value.displayName,
        createdAt: record.createdAt,
      };

      if (record.status === "going") {
        grouped.attending.push(entry);
      } else if (record.status === "waitlisted") {
        grouped.waitlisted.push(entry);
      } else {
        grouped.cancelled.push(entry);
      }
    }

    const sortByCreatedAt = (
      a: { displayName: string; createdAt: Date },
      b: { displayName: string; createdAt: Date },
    ) => a.createdAt.getTime() - b.createdAt.getTime();

    grouped.attending.sort(sortByCreatedAt);
    grouped.waitlisted.sort(sortByCreatedAt);
    grouped.cancelled.sort(sortByCreatedAt);

    return Ok(grouped);
  }
}

export function CreateRsvpService(
  events: IEventRepository,
  rsvps: IRsvpRepository,
  users: IUserRepository,
): IRsvpService {
  return new RsvpService(events, rsvps, users);
}