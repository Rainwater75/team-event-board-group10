import { CreateInMemoryUserRepository } from "../../src/auth/InMemoryUserRepository.js";
import {
  EventNotFound,
  type EventError,
} from "../../src/lib/errors.js";
import { Err, Ok, type Result } from "../../src/lib/result.js";
import type { CreateEventInput, EditEventInput, Event } from "../../src/model/Event.js";
import type { IEventRepository } from "../../src/repository/EventRepository.js";
import { CreateInMemoryRsvpRepository } from "../../src/repository/InMemoryRsvpRepository.js";
import type { IRsvpRecord } from "../../src/repository/RsvpRepository.js";
import { CreateRsvpService } from "../../src/service/RsvpService.js";

class FakeEventRepository implements IEventRepository {
  constructor(private readonly events: Event[]) {}

  async add(_input: CreateEventInput): Promise<Result<Event, EventError>> {
    return Err(EventNotFound("Not implemented for this test."));
  }

  async getById(id: number): Promise<Result<Event, EventError>> {
    const event = this.events.find((entry) => entry.id === id);
    return event ? Ok(event) : Err(EventNotFound(`Event ${id} not found.`));
  }

  async getAll(): Promise<Result<Event[], EventError>> {
    return Ok(this.events);
  }

  async edit(id: number, input: EditEventInput): Promise<Result<Event, EventError>> {
    const event = this.events.find((entry) => entry.id === id);
    if (!event) {
      return Err(EventNotFound(`Event ${id} not found.`));
    }

    if (typeof event.applyEdits === "function") {
      event.applyEdits(input);
    }

    return Ok(event);
  }

  async updateStatus(
    id: number,
    status: Event["status"],
  ): Promise<Result<Event, EventError>> {
    const event = this.events.find((entry) => entry.id === id);
    if (!event) {
      return Err(EventNotFound(`Event ${id} not found.`));
    }

    event.status = status;
    return Ok(event);
  }

  async getAllByOrganizer(organizerId: string): Promise<Result<Event[], EventError>> {
    return Ok(this.events.filter((entry) => entry.organizerId === organizerId));
  }

  async search(query: string): Promise<Result<Event[], EventError>> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return Ok(this.events);
    }

    return Ok(
      this.events.filter((entry) => {
        return (
          entry.title.toLowerCase().includes(normalized) ||
          entry.description.toLowerCase().includes(normalized) ||
          entry.location.toLowerCase().includes(normalized)
        );
      }),
    );
  }
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    title: "Sprint Demo Event",
    description: "Test event",
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
    location: "Campus Center",
    category: "None",
    status: "published",
    maxCapacity: 2,
    organizerId: "user-admin",
    organizerName: "Avery Admin",
    attendingUsers: [],
    applyEdits: jest.fn(),
    ...overrides,
  } as unknown as Event;
}

function makeRecord(overrides: Partial<IRsvpRecord> = {}): IRsvpRecord {
  const now = new Date();
  return {
    eventId: 1,
    userId: "user-reader",
    status: "going",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("RsvpService.toggleRsvp", () => {
  it("creates a new RSVP as going when capacity allows", async () => {
    const users = CreateInMemoryUserRepository();
    const events = new FakeEventRepository([makeEvent({ maxCapacity: 2 })]);
    const rsvps = CreateInMemoryRsvpRepository();
    const service = CreateRsvpService(events, rsvps, users);

    const result = await service.toggleRsvp({
      eventId: 1,
      userId: "user-reader",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvpStatus).toBe("going");
      expect(result.value.attendeeCount).toBe(1);
    }
  });

  it("creates a new RSVP as waitlisted when the event is full", async () => {
    const users = CreateInMemoryUserRepository();
    const events = new FakeEventRepository([makeEvent({ maxCapacity: 1 })]);
    const rsvps = CreateInMemoryRsvpRepository();

    await rsvps.upsert(
      makeRecord({
        userId: "user-admin",
        status: "going",
      }),
    );

    const service = CreateRsvpService(events, rsvps, users);

    const result = await service.toggleRsvp({
      eventId: 1,
      userId: "user-reader",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvpStatus).toBe("waitlisted");
      expect(result.value.attendeeCount).toBe(1);
    }
  });

  it("changes an active RSVP to cancelled", async () => {
    const users = CreateInMemoryUserRepository();
    const events = new FakeEventRepository([makeEvent({ maxCapacity: 2 })]);
    const rsvps = CreateInMemoryRsvpRepository();
    const service = CreateRsvpService(events, rsvps, users);

    await service.toggleRsvp({ eventId: 1, userId: "user-reader" });
    const result = await service.toggleRsvp({ eventId: 1, userId: "user-reader" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvpStatus).toBe("cancelled");
      expect(result.value.attendeeCount).toBe(0);
    }
  });

  it("reactivates a cancelled RSVP", async () => {
    const users = CreateInMemoryUserRepository();
    const events = new FakeEventRepository([makeEvent({ maxCapacity: 2 })]);
    const rsvps = CreateInMemoryRsvpRepository();
    const service = CreateRsvpService(events, rsvps, users);

    await service.toggleRsvp({ eventId: 1, userId: "user-reader" });
    await service.toggleRsvp({ eventId: 1, userId: "user-reader" });
    const result = await service.toggleRsvp({ eventId: 1, userId: "user-reader" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvpStatus).toBe("going");
      expect(result.value.attendeeCount).toBe(1);
    }
  });

  it("rejects organizers from RSVPing to their own event", async () => {
    const users = CreateInMemoryUserRepository();
    const events = new FakeEventRepository([
      makeEvent({
        organizerId: "user-reader",
        organizerName: "Una User",
      }),
    ]);
    const rsvps = CreateInMemoryRsvpRepository();
    const service = CreateRsvpService(events, rsvps, users);

    const result = await service.toggleRsvp({
      eventId: 1,
      userId: "user-reader",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpNotAllowed");
    }
  });

  it("rejects non-member roles from RSVPing", async () => {
    const users = CreateInMemoryUserRepository();
    const events = new FakeEventRepository([makeEvent()]);
    const rsvps = CreateInMemoryRsvpRepository();
    const service = CreateRsvpService(events, rsvps, users);

    const result = await service.toggleRsvp({
      eventId: 1,
      userId: "user-staff",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpNotAllowed");
      expect(result.value.message).toBe("Only members can RSVP.");
    }
  });

  it("rejects cancelled events", async () => {
    const users = CreateInMemoryUserRepository();
    const events = new FakeEventRepository([
      makeEvent({
        status: "cancelled",
      }),
    ]);
    const rsvps = CreateInMemoryRsvpRepository();
    const service = CreateRsvpService(events, rsvps, users);

    const result = await service.toggleRsvp({
      eventId: 1,
      userId: "user-reader",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpInvalidState");
    }
  });

  it("rejects past events", async () => {
    const users = CreateInMemoryUserRepository();
    const events = new FakeEventRepository([
      makeEvent({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 23 * 60 * 60 * 1000),
        status: "past",
      }),
    ]);
    const rsvps = CreateInMemoryRsvpRepository();
    const service = CreateRsvpService(events, rsvps, users);

    const result = await service.toggleRsvp({
      eventId: 1,
      userId: "user-reader",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpInvalidState");
    }
  });
});