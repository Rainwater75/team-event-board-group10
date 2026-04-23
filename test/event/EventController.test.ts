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

//Tests for Publish and Cancel events
describe("EventController publishEvent / cancelEvent", () => {
  const makeSession = (): IAppBrowserSession => ({
    browserId: "browser-1",
    browserLabel: "Browser 1",
    visitCount: 1,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    authenticatedUser: {
      userId: "user-1",
      email: "user@example.com",
      displayName: "Test User",
      role: "user",
      signedInAt: new Date().toISOString(),
    },
  });

  const makeRes = () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      redirect: jest.fn(),
      set: jest.fn().mockReturnThis(),
      req: {
        get: jest.fn().mockReturnValue(undefined),
      },
    };
    return res;
  };

  it("returns 400 when publishEvent fails with InvalidStateTransitionError", async () => {
    const publishEvent = jest.fn().mockResolvedValue({
      ok: false,
      value: {
        name: "InvalidStateTransitionError",
        message: "Only draft events can be published",
      },
    });

    const controller = CreateEventController(
      {
        publishEvent,
      } as any,
      {} as any,
      { error: jest.fn(), info: jest.fn(), warn: jest.fn() } as any,
    );

    const res = makeRes();

    await controller.publishEvent(res, makeSession(), 1);

    expect(publishEvent).toHaveBeenCalledWith(1, "user-1");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      "partials/error",
      expect.objectContaining({
        message: "Only draft events can be published",
        layout: false,
      }),
    );
  });

  it("returns 403 when publishEvent fails with UnauthorizedEventActionError", async () => {
    const publishEvent = jest.fn().mockResolvedValue({
      ok: false,
      value: {
        name: "UnauthorizedEventActionError",
        message: "Only the organizer can publish this event",
      },
    });

    const controller = CreateEventController(
      {
        publishEvent,
      } as any,
      {} as any,
      { error: jest.fn(), info: jest.fn(), warn: jest.fn() } as any,
    );

    const res = makeRes();

    await controller.publishEvent(res, makeSession(), 1);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith(
      "partials/error",
      expect.objectContaining({
        message: "Only the organizer can publish this event",
        layout: false,
      }),
    );
  });

  it("returns 400 when cancelEvent fails with InvalidStateTransitionError", async () => {
    const cancelEvent = jest.fn().mockResolvedValue({
      ok: false,
      value: {
        name: "InvalidStateTransitionError",
        message: "Only published events can be cancelled",
      },
    });

    const controller = CreateEventController(
      {
        cancelEvent,
      } as any,
      {} as any,
      { error: jest.fn(), info: jest.fn(), warn: jest.fn() } as any,
    );

    const res = makeRes();

    await controller.cancelEvent(res, makeSession(), 1);

    expect(cancelEvent).toHaveBeenCalledWith(1, "user-1");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      "partials/error",
      expect.objectContaining({
        message: "Only published events can be cancelled",
        layout: false,
      }),
    );
  });

  it("returns 403 when cancelEvent fails with UnauthorizedEventActionError", async () => {
    const cancelEvent = jest.fn().mockResolvedValue({
      ok: false,
      value: {
        name: "UnauthorizedEventActionError",
        message: "Only the organizer can cancel this event",
      },
    });

    const controller = CreateEventController(
      {
        cancelEvent,
      } as any,
      {} as any,
      { error: jest.fn(), info: jest.fn(), warn: jest.fn() } as any,
    );

    const res = makeRes();

    await controller.cancelEvent(res, makeSession(), 1);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith(
      "partials/error",
      expect.objectContaining({
        message: "Only the organizer can cancel this event",
        layout: false,
      }),
    );
  });
});