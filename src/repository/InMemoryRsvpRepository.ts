import { Err, Ok, type Result } from "../lib/result.js";
import type { RsvpError } from "../lib/RsvpErrors.js";
import { RsvpDependencyError } from "../lib/RsvpErrors.js";
import type { IRsvpRecord, IRsvpRepository } from "./RsvpRepository.js";

class InMemoryRsvpRepository implements IRsvpRepository {
  constructor(private readonly rsvps: IRsvpRecord[] = []) {}

  async findByEventAndUser(
    eventId: number,
    userId: string,
  ): Promise<Result<IRsvpRecord | null, RsvpError>> {
    try {
      const match =
        this.rsvps.find((rsvp) => rsvp.eventId === eventId && rsvp.userId === userId) ?? null;
      return Ok(match);
    } catch {
      return Err(RsvpDependencyError("Unable to read RSVP records."));
    }
  }

  async upsert(rsvp: IRsvpRecord): Promise<Result<IRsvpRecord, RsvpError>> {
    try {
      const index = this.rsvps.findIndex(
        (record) => record.eventId === rsvp.eventId && record.userId === rsvp.userId,
      );

      if (index === -1) {
        this.rsvps.push(rsvp);
      } else {
        this.rsvps[index] = rsvp;
      }

      return Ok(rsvp);
    } catch {
      return Err(RsvpDependencyError("Unable to save RSVP record."));
    }
  }

  async countGoingByEvent(eventId: number): Promise<Result<number, RsvpError>> {
    try {
      const count = this.rsvps.filter(
        (rsvp) => rsvp.eventId === eventId && rsvp.status === "going",
      ).length;

      return Ok(count);
    } catch {
      return Err(RsvpDependencyError("Unable to count attendees."));
    }
  }
}

export function CreateInMemoryRsvpRepository(): IRsvpRepository {
  return new InMemoryRsvpRepository();
}