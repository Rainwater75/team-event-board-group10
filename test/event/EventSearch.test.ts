import { CreateEventService, IEventService } from "../../src/service/EventService";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import { IEventRepository } from "../../src/repository/EventRepository";

// Write tests covering matching results, no results, empty queries, and invalid input.

describe("EventSearch", () => {
  let eventRepository: IEventRepository;
  let eventService: IEventService;
  const input = {
    title: "Tech Conference",
    description: "A conference",
    startDate: new Date("2030-10-01"),
    endDate: new Date("2030-10-01"),
    location: "Online",
    organizerId: "john-doe",
    maxCapacity: 100,
  };

  beforeEach(() => {
    eventRepository = CreateInMemoryEventRepository();
    eventService = CreateEventService(eventRepository);
  });

  describe("Repository - search", () => {
    it("should return events matching the search query by title", async () => {
      await eventRepository.add(input);
      await eventRepository.updateStatus(1, "published");

      const result = await eventRepository.search("Tech");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].title).toBe("Tech Conference");
      }
    });

    it("should return empty array if no events match the query", async () => {
      await eventRepository.add(input);
      await eventRepository.updateStatus(1, "published");

      const result = await eventRepository.search("Nonexistent");
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should be case insensitive", async () => {
      await eventRepository.add(input);
      await eventRepository.updateStatus(1, "published");
      const result = await eventRepository.search("tech");
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].title).toBe("Tech Conference");
      }
    });

    it("should return all events if no query given", async () => {
      await eventRepository.add(input);
      await eventRepository.updateStatus(1, "published");
      const result = await eventRepository.search("");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
      }
    });

  });

  describe("Service - searchEvents", () => {
    it("should return events matching the search query", async () => {
      await eventRepository.add(input);
      // Assuming createResult.value contains the new event with its ID

      await eventRepository.updateStatus(1, "published");

      const result = await eventService.searchEvents("Tech");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].title).toBe("Tech Conference");
      }
    });

    it("should return events matching the search query", async () => {
      await eventRepository.add(input);
      await eventRepository.updateStatus(1, "published");

      const result = await eventService.searchEvents("Tech");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].title).toBe("Tech Conference");
      }
    });

    it("should return all events if no query given", async () => {
      await eventRepository.add(input);
      await eventRepository.updateStatus(1, "published");

      const result = await eventService.searchEvents("");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
      }
    });

    it("should return empty array if no events match the query", async () => {
      await eventRepository.add(input);
      await eventRepository.updateStatus(1, "published");
      const result = await eventService.searchEvents("Nonexistent");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should return InvalidSearchInput error if query is too long", async () => {
      const longQuery = "a".repeat(505);
      const result = await eventService.searchEvents(longQuery);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.message).toBe("Search query is too long");
      }
    });
  });
});
