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
import { CreatePrismaEventRepository } from "./repository/PrismaRepository";
import { CreateInMemoryRsvpRepository } from "./repository/InMemoryRsvpRepository";
import { CreateRsvpService } from "./service/RsvpService";
import { CreateRsvpController } from "./controller/RsvpController";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { CreatePrismaUserRepository } from "./auth/PrismaUserRepository";

export function createComposedApp(
  logger?: ILoggingService
): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();
  const usePrisma = (process.env.DATA_STORE ?? "memory") === "prisma";
  const repository = usePrisma
    ? CreatePrismaEventRepository(
        new PrismaClient({
          adapter: new PrismaBetterSqlite3({
            url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
          }),
        })
      )
    : CreateInMemoryEventRepository();

  // Authentication & authorization wiring
  const authUsers = usePrisma ? CreatePrismaUserRepository(
    new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
      }),
    })
  ) : CreateInMemoryUserRepository();
  
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
