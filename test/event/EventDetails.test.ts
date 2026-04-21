import { CreateEventService } from "../../src/service/EventService";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";

// Write tests that cover published events, missing events, and the draft visibility rule from different user perspectives.
describe("EventService getEvent", () => {
    const eventInput = { // this event is in draft mode by default, so only visible to organizer and admins
        title: "Event",
        description: "This event is not published yet, only available to organizer & admins.",
        startDate: new Date(Date.now() + 60 * 60 * 1000),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        location: "Main Hall",
        maxCapacity: 100,
        organizerId: "organizer-1",
        organizerName: "Alice Organizer",
    };

    it("retrieves an unpublished event for organizer & admins", async () => {
        const repo = CreateInMemoryEventRepository();
        const service = CreateEventService(repo);  
        const createdEvent = await service.createEvent(eventInput, eventInput.organizerId, eventInput.organizerName);
        if (!createdEvent.ok) throw new Error("Failed to create event for testing");

        // Update event status to published
        const result = await service.getEvent(createdEvent.value.id, {userId: "organizer-1", role: "user"});

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.title).toBe(eventInput.title);
            expect(result.value.description).toBe(eventInput.description);
            expect(result.value.location).toBe(eventInput.location);
            expect(result.value.maxCapacity).toBe(eventInput.maxCapacity);
            expect(result.value.status).toBe("draft");
            expect(result.value.organizerId).toBe(eventInput.organizerId);
            expect(result.value.organizerName).toBe(eventInput.organizerName);
        }

        const adminResult = await service.getEvent(createdEvent.value.id, {userId: "admin-1", role: "admin"});
        expect(adminResult.ok).toBe(true);
    });

    it("does not retrieve an unpublished event for non-organizer", async () => {
        const repo = CreateInMemoryEventRepository();
        const service = CreateEventService(repo);  
        const createdEvent = await service.createEvent(eventInput, eventInput.organizerId, eventInput.organizerName);
        if (!createdEvent.ok) throw new Error("Failed to create event for testing");
        const result = await service.getEvent(createdEvent.value.id, {userId: "user-2", role: "user"});
        expect(result.ok).toBe(false);
    });

    it("returns an error for non-existent event", async () => {
        const service = CreateEventService(CreateInMemoryEventRepository());
        const result = await service.getEvent(999, {userId: "user-1", role: "user"});
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.value.message).toBe("Event 999 not found.");
        }
    });

    it("retrieves a published event for any user", async () => {
        const repo = CreateInMemoryEventRepository();
        const service = CreateEventService(repo);  
        const createdEvent = await service.createEvent(eventInput, eventInput.organizerId, eventInput.organizerName);
        if (!createdEvent.ok) throw new Error("Failed to create event for testing");
        await service.publishEvent(createdEvent.value.id, eventInput.organizerId); 
        const result = await service.getEvent(createdEvent.value.id, {userId: "user-2", role: "user"});
        expect(result.ok).toBe(true);
        const result3 = await service.getEvent(createdEvent.value.id, {userId: "admin-1", role: "admin"});
        expect(result3.ok).toBe(true);
        const result4 = await service.getEvent(createdEvent.value.id, {userId: "organizer-1", role: "staff"});
        expect(result4.ok).toBe(true);
    });

    it("published events do not show up for unauthenticated users", async () => {
        const repo = CreateInMemoryEventRepository();
        const service = CreateEventService(repo);  
        const createdEvent = await service.createEvent(eventInput, eventInput.organizerId, eventInput.organizerName);
        if (!createdEvent.ok) throw new Error("Failed to create event for testing");
        await service.publishEvent(createdEvent.value.id, eventInput.organizerId); 
        const result = await service.getEvent(createdEvent.value.id, null); // null session, unauthenticated user
        expect(result.ok).toBe(false);
    });
});