import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePrismaUserRepository } from "./auth/PrismaUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";

import { CreateApp } from "./app";
import type { IApp } from "./contracts";

import { CreateEventController } from "./controller/EventController";
import { CreateInMemoryEventRepository } from "./repository/InMemoryEventRepository";
import { CreateInMemoryRsvpRepository } from "./repository/InMemoryRsvpRepository";
import { CreatePrismaRepository } from "./repository/PrismaRepository";

import { CreateEventService } from "./service/EventService";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";
import { CreateRsvpService } from "./service/RsvpService";
import { CreateRsvpController } from "./controller/RsvpController";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();
  const usePrisma = (process.env.DATA_STORE ?? "memory") === "prisma";

  const prismaClient = usePrisma
    ? new PrismaClient({
        adapter: new PrismaBetterSqlite3({
          url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
        }),
      })
    : null;

  const eventRepository =
    usePrisma && prismaClient
      ? CreatePrismaRepository(prismaClient)
      : CreateInMemoryEventRepository();

  const rsvpRepository =
    usePrisma && prismaClient
      ? CreatePrismaRepository(prismaClient)
      : CreateInMemoryRsvpRepository();

  const userRepository =
    usePrisma && prismaClient
      ? CreatePrismaUserRepository(prismaClient)
      : CreateInMemoryUserRepository();

  const passwordHasher = CreatePasswordHasher();

  const authService = CreateAuthService(userRepository, passwordHasher);
  const adminUserService = CreateAdminUserService(userRepository, passwordHasher);
  const authController = CreateAuthController(
    authService,
    adminUserService,
    resolvedLogger,
  );

  const eventService = CreateEventService(eventRepository);
  const rsvpService = CreateRsvpService(
    eventRepository,
    rsvpRepository,
    userRepository,
  );

  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);
  const eventController = CreateEventController(
    eventService,
    rsvpService,
    resolvedLogger,
  );

  return CreateApp(
    authController,
    resolvedLogger,
    eventController,
    rsvpController,
  );
}
