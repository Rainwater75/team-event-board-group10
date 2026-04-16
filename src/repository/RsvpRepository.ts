import type { Result } from "../lib/result.js";
import type { RsvpError } from "../lib/RsvpErrors.js";

export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export interface IRsvpRecord {
  eventId: number;
  userId: string;
  status: RsvpStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRsvpToggleResult {
  eventId: number;
  userId: string;
  rsvpStatus: RsvpStatus;
  attendeeCount: number;
}

export interface IAttendeeListItem {
  userId: string;
  status: RsvpStatus;
  createdAt: Date;
}

export interface IRsvpRepository {
  findByEventAndUser(
    eventId: number,
    userId: string,
  ): Promise<Result<IRsvpRecord | null, RsvpError>>;

  upsert(rsvp: IRsvpRecord): Promise<Result<IRsvpRecord, RsvpError>>;

  countGoingByEvent(eventId: number): Promise<Result<number, RsvpError>>;
  
  listByEvent(eventId: number): Promise<Result<IAttendeeListItem[], RsvpError>>;
}

