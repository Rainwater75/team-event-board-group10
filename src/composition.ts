import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";
import { CreateEventService } from "./service/EventService";
import { CreateEventController } from "./controller/EventController";
import { CreateInMemoryEventRepository } from "./repository/InMemoryEventRepository";
import { CreateInMemoryRsvpRepository } from "./repository/InMemoryRsvpRepository";
import { CreateRsvpService } from "./service/RsvpService";
import { CreateRsvpController } from "./controller/RsvpController";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { CreatePrismaEventRepository } from "./repository/PrismaRepository";
import { CreatePrismaUserRepository } from "./auth/PrismaUserRepository";

export function createComposedApp(
   mode: "memory" | "prisma",
  logger?: ILoggingService
): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // NEW PRISMA CODE (for both user & event repositories)
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db", }), });
  mode === "prisma" ? resolvedLogger.info("Using Prisma repositories") : resolvedLogger.info("Using in-memory repositories");

  const repository = mode === "prisma" ? CreatePrismaEventRepository(prisma) : CreateInMemoryEventRepository();

//  const repository = CreateInMemoryEventRepository();

  // Authentication & authorization wiring
  const authUsers = mode === "prisma" ? CreatePrismaUserRepository(prisma) : CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  const service = CreateEventService(repository);

  // RSVP wiring
  const rsvpRepository = CreateInMemoryRsvpRepository();
  const rsvpService = CreateRsvpService(repository, rsvpRepository, authUsers);
  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);
  const controller = CreateEventController(service, rsvpService, resolvedLogger);

  return CreateApp(authController, resolvedLogger, controller, rsvpController);
}
