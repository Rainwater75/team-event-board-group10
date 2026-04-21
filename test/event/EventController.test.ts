import { CreateEventController } from "../../src/controller/EventController.js";
import type { IAppBrowserSession } from "../../src/session/AppSession.js";

describe("EventController displayOrganizerDashboard", () => {
  const users = {
    admin: {
      userId: "admin-1",
      email: "admin@example.com",
      displayName: "Admin User",
      role: "admin" as const,
    },
    organizer: {
      userId: "staff-1",
      email: "organizer@example.com",
      displayName: "Organizer User",
      role: "staff" as const,
    },
    member: {
      userId: "user-1",
      email: "member@example.com",
      displayName: "Member User",
      role: "user" as const,
    },
  };

  const makeSession = (user: (typeof users)[keyof typeof users]): IAppBrowserSession => ({
    browserId: "browser-1",
    browserLabel: "Browser 1",
    visitCount: 1,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    authenticatedUser: {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      signedInAt: new Date().toISOString(),
    },
  });

  const makeController = () => {
    const getAllEvents = jest.fn().mockResolvedValue({
      ok: true,
      value: [{ id: 1, title: "All Events" }],
    });
    const getAllEventsByOrganizer = jest.fn().mockResolvedValue({
      ok: true,
      value: [{ id: 2, title: "Organizer Only" }],
    });

    const controller = CreateEventController(
      {
        getAllEvents,
        getAllEventsByOrganizer,
      } as any,
      {} as any,
      { error: jest.fn(), info: jest.fn(), warn: jest.fn() } as any,
    );

    return { controller, getAllEvents, getAllEventsByOrganizer };
  };

  it("loads all events for admins", async () => {
    const { controller, getAllEvents, getAllEventsByOrganizer } = makeController();
    const render = jest.fn();

    await controller.displayOrganizerDashboard(
      { render } as any,
      makeSession(users.admin),
    );

    expect(getAllEvents).toHaveBeenCalledTimes(1);
    expect(getAllEventsByOrganizer).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith(
      "organizerDashboard",
      expect.objectContaining({
        events: [{ id: 1, title: "All Events" }],
      }),
    );
  });

  it("loads only the organizer's events for organizers", async () => {
    const { controller, getAllEvents, getAllEventsByOrganizer } = makeController();
    const render = jest.fn();

    await controller.displayOrganizerDashboard(
      { render } as any,
      makeSession(users.organizer),
    );

    expect(getAllEvents).not.toHaveBeenCalled();
    expect(getAllEventsByOrganizer).toHaveBeenCalledTimes(1);
    expect(getAllEventsByOrganizer).toHaveBeenCalledWith(users.organizer.userId);
    expect(render).toHaveBeenCalledWith(
      "organizerDashboard",
      expect.objectContaining({
        events: [{ id: 2, title: "Organizer Only" }],
      }),
    );
  });
});