import { CreateEventService } from "../../src/service/EventService";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";

// Write tests that cover published events, missing events, and the draft visibility rule from different user perspectives.
describe("EventService getEvent", () => {
    const eventInput = {
        title: "Event",
        description: "This event is not published yet, only available to organizer & admins.",
        startDate: new Date(Date.now() + 60 * 60 * 1000),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: "Main Hall",
        maxCapacity: 100,
        organizerId: "organizer-1",
        organizerName: "Alice Organizer",
    };

    it("retrieves a published event for any user", async () => {
        const repo = CreateInMemoryEventRepository();
        const service = CreateEventService(repo);  
        const createdEvent = await service.createEvent(eventInput, eventInput.organizerId, eventInput.organizerName);
        if (!createdEvent.ok) throw new Error("Failed to create event for testing");

        // Update event status to published
        await repo.updateStatus(createdEvent.value.id, "published");
        const result = await service.getEvent(createdEvent.value.id, {userId: "organizer-1", role: "user"});

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.title).toBe(eventInput.title);
            expect(result.value.description).toBe(eventInput.description);
            expect(result.value.location).toBe(eventInput.location);
            expect(result.value.maxCapacity).toBe(eventInput.maxCapacity);
            expect(result.value.status).toBe("published");
            expect(result.value.organizerId).toBe(eventInput.organizerId);
            expect(result.value.organizerName).toBe(eventInput.organizerName);
        }
    });

});