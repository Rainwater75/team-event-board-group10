import { CreateEventService } from "../../src/service/EventService";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import { Event, EditEventInput } from "../../src/model/Event";

const makeValidInput = () => ({
  title: "Team Planning Session",
  description: "A meeting to plan the next project milestones.",
  startDate: new Date(Date.now() + 60 * 60 * 1000),
  endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
  location: "Room 204",
  maxCapacity: 20,
  organizerId: "user-1",
  organizerName: "Taylor Organizer",
});

describe("EventService createEvent", () => {
  it("creates an event from valid input", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(input, input.organizerId, input.organizerName);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe(input.title);
      expect(result.value.description).toBe(input.description);
      expect(result.value.location).toBe(input.location);
      expect(result.value.maxCapacity).toBe(input.maxCapacity);
      expect(result.value.status).toBe("draft");
      expect(result.value.organizerId).toBe(input.organizerId);
      expect(result.value.organizerName).toBe(input.organizerName);
    }
  });

  it("rejects a missing title", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, title: "   " },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Title is required");
    }
  });

  it("rejects an end date that is not after the start date", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, endDate: new Date(input.startDate.getTime()) },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("End date must be after start date");
    }
  });

  it("rejects a non-positive max capacity", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, maxCapacity: 0 },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Max capacity must be greater than 0");
    }
  });

  it("rejects whitespace-only description", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, description: "   " },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Description is required");
    }
  });

  it("rejects whitespace-only location", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, location: "   " },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Location is required");
    }
  });

  it("rejects a start date in the past", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, startDate: new Date(Date.now() - 60 * 60 * 1000) },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Start date must be in the future");
    }
  });

  it("rejects an invalid end date", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, endDate: new Date("not-a-date") },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("End date is invalid");
    }
  });

  it("rejects title longer than the maximum length", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, title: "a".repeat(101) },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Title must be between 3 and 100 characters");
    }
  });

  it("trims title before saving it", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, title: "   Trimmed Title   " },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Trimmed Title");
    }
  });

  it("rejects infinite max capacity", async () => {
    const service = CreateEventService(CreateInMemoryEventRepository());
    const input = makeValidInput();

    const result = await service.createEvent(
      { ...input, maxCapacity: Number.POSITIVE_INFINITY },
      input.organizerId,
      input.organizerName,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Max capacity is invalid");
    }
  });
});


describe("EventService editEvent", () => {
  let service: ReturnType<typeof CreateEventService>;
  let input: ReturnType<typeof makeValidInput>;
  let createdEvent: Event;

  beforeEach(async () => {
    service = CreateEventService(CreateInMemoryEventRepository());
    input = makeValidInput();
    createdEvent = (await service.createEvent(input, input.organizerId, input.organizerName)).value as Event;
  });

  it("edits an event from valid input", async () => {
    const inputs: EditEventInput[] = [
      { title: "a new event title" },
      { description: "a new event description" },
      { location: "a new location" },
      { endDate: new Date(Date.now() + 36 * 60 * 60 * 1000) },
      { startDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      { 
        startDate: new Date(Date.now() + 72 * 60 * 60 * 1000), 
        endDate: new Date(Date.now() + 96 * 60 * 60 * 1000) 
      },
      { category: "music" },
      { maxCapacity: 50 },
      { status: "published" },
    ];

    let currentExpected: any = { ...createdEvent };

    for (const editInput of inputs) {
      const result = await service.editEvent(createdEvent.id, editInput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        currentExpected = { ...currentExpected, ...editInput };

        for (const [key, value] of Object.entries(result.value)) {
          const expectedValue = currentExpected[key as keyof Event];

          if (expectedValue instanceof Date) {
            expect(value).toEqual(expectedValue);
          } else {
            expect(value).toBe(expectedValue);
          }
        }
      }
    }
  });

  it("rejects a title that is too short", async () => {
    const result = await service.editEvent(createdEvent.id, { title: "a" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Title must be between 3 and 100 characters");
    }
  });

  it("rejects a title that is too long", async () => {
    const result = await service.editEvent(createdEvent.id, { title: "a".repeat(101) });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Title must be between 3 and 100 characters");
    }
  });

  it("rejects a description that is too short", async () => {
    const result = await service.editEvent(createdEvent.id, { description: "a" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Description must be between 10 and 1000 characters");
    }
  });

  it("rejects a description that is too long", async () => {
    const result = await service.editEvent(createdEvent.id, { description: "a".repeat(1001) });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Description must be between 10 and 1000 characters");
    }
  });

  it("rejects a location that is too short", async () => {
    const result = await service.editEvent(createdEvent.id, { location: "a" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Location must be at least 3 characters");
    }
  });

  it("rejects a start date in the past", async () => {
    const result = await service.editEvent(createdEvent.id, { startDate: new Date(Date.now() - 1000) });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Start date must be in the future");
    }
  });

  it("rejects an end date that is not after the start date", async () => {
    const startDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() - 1000);
    const result = await service.editEvent(createdEvent.id, { startDate, endDate });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("End date must be after start date");
    }
  });

  it("rejects a non-positive max capacity", async () => {
    const result = await service.editEvent(createdEvent.id, { maxCapacity: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Max capacity must be greater than 0");
    }
  });

  it("rejects an invalid max capacity", async () => {
    const result = await service.editEvent(createdEvent.id, { maxCapacity: 10.5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Max capacity is invalid");
    }
  });

  it("rejects an infinite max capacity", async () => {
    const result = await service.editEvent(createdEvent.id, { maxCapacity: Number.POSITIVE_INFINITY });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Max capacity is invalid");
    }
  });

  it("rejects an invalid status", async () => {
    const result = await service.editEvent(createdEvent.id, { status: "invalid-status" as any });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toContain("Status input must be");
    }
  });

  it("rejects an invalid date", async () => {
    const result = await service.editEvent(createdEvent.id, { startDate: new Date("invalid") });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.message).toBe("Start date is invalid");
    }
  });
});