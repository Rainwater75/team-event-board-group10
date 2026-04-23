import { CreateInMemoryUserRepository } from "../../src/auth/InMemoryUserRepository.js";
import { EventNotFound, type EventError } from "../../src/lib/errors.js";
import { Err, Ok, type Result } from "../../src/lib/result.js";
import type { EditEventInput, Event } from "../../src/model/Event.js";
import type { CreateEventInput } from "../../src/model/Event.js";
import type { IEventRepository } from "../../src/repository/EventRepository.js";
import { CreateInMemoryRsvpRepository } from "../../src/repository/InMemoryRsvpRepository.js";
import type { IRsvpRecord } from "../../src/repository/RsvpRepository.js";
import { CreateRsvpService } from "../../src/service/RsvpService.js";

const now = new Date();

const makeRecord = (overrides: Partial<IRsvpRecord>): IRsvpRecord => ({
  eventId: 1,
  userId: "user-reader",
  status: "going",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

class FakeEventRepo implements IEventRepository {
  constructor(private event: Event) {}

  async add(_input: CreateEventInput): Promise<Result<Event, EventError>> {
    return Err(EventNotFound("not needed"));
  }

  async getById(_id: number): Promise<Result<Event, EventError>> {
    return Ok(this.event);
  }

  async getAll(): Promise<Result<Event[], EventError>> {
    return Ok([this.event]);
  }

  async edit(_id: number, _input: EditEventInput): Promise<Result<Event, EventError>> {
    return Ok(this.event);
  }

  async updateStatus(
    _id: number,
    _status: "draft" | "published" | "cancelled",
  ): Promise<Result<Event, EventError>> {
    return Ok(this.event);
  }

  async getAllByOrganizer(_organizerId: string): Promise<Result<Event[], EventError>> {
    return Ok([this.event]);
  }

  async search(_query: string): Promise<Result<Event[], EventError>> {
    return Ok([this.event]);
  }
}

const makeEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 1,
    title: "Test Event",
    description: "Test Description",
    startDate: new Date(Date.now() + 1000 * 60 * 60),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 2),
    location: "Campus",
    category: "None",
    status: "published",
    maxCapacity: 10,
    organizerId: "user-admin",
    organizerName: "Avery Admin",
    attendingUsers: [],
    applyEdits: () => {},
    ...overrides,
  }) as Event;

describe("getAttendeeList", () => {
  it("allows organizer to view attendees", async () => {
    const users = CreateInMemoryUserRepository();
    const rsvps = CreateInMemoryRsvpRepository();

    const event = makeEvent({
      organizerId: "user-admin",
      status: "published",
    });

    const service = CreateRsvpService(new FakeEventRepo(event), rsvps, users);

    const result = await service.getAttendeeList({
      eventId: 1,
      requesterId: "user-admin",
    });

    expect(result.ok).toBe(true);
  });

  it("blocks normal user", async () => {
    const users = CreateInMemoryUserRepository();
    const rsvps = CreateInMemoryRsvpRepository();

    const event = makeEvent({
      organizerId: "user-admin",
      status: "published",
    });

    const service = CreateRsvpService(new FakeEventRepo(event), rsvps, users);

    const result = await service.getAttendeeList({
      eventId: 1,
      requesterId: "user-reader",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("RsvpNotAllowed");
    }
  });

  it("groups attendees correctly", async () => {
    const users = CreateInMemoryUserRepository();
    const rsvps = CreateInMemoryRsvpRepository();

    await rsvps.upsert(makeRecord({ userId: "user-reader", status: "going" }));
    await rsvps.upsert(makeRecord({ userId: "user-admin", status: "waitlisted" }));
    await rsvps.upsert(makeRecord({ userId: "user-staff", status: "cancelled" }));

    const event = makeEvent({
      organizerId: "user-admin",
      status: "published",
    });

    const service = CreateRsvpService(new FakeEventRepo(event), rsvps, users);

    const result = await service.getAttendeeList({
      eventId: 1,
      requesterId: "user-admin",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.attending.length).toBe(1);
      expect(result.value.waitlisted.length).toBe(1);
      expect(result.value.cancelled.length).toBe(1);
    }
  });
});