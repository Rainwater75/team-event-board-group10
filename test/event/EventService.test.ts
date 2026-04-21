import { CreateEventService } from "../../src/service/EventService";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";

describe("EventService createEvent", () => {
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
      expect(result.value.message).toBe("Max capacity must be greater than 0");
    }
  });
});