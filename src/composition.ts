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
import { CreatePrismaRepository } from "./repository/PrismaRepository";
import { CreatePrismaRsvpRepository } from "./repository/RsvpPrismaRepository";
import { CreateInMemoryRsvpRepository } from "./repository/InMemoryRsvpRepository";
import { CreateRsvpService } from "./service/RsvpService";
import { CreateRsvpController } from "./controller/RsvpController";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { CreatePrismaUserRepository } from "./auth/PrismaUserRepository";
import { runSeed } from "./seed";

export function createComposedApp(
  logger?: ILoggingService
): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();
  const usePrisma = (process.env.DATA_STORE ?? "memory") === "prisma";

  const prismaClient = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    }),
  });

  usePrisma ? runSeed(new PrismaClient({ // runs seed (creates default users in userDB) if using Prisma
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    }),
  })) : resolvedLogger.info("Using in-memory data store (data will not persist across restarts)");

  const repository = usePrisma
    ? CreatePrismaRepository(
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
  const rsvpRepository = usePrisma
    ? CreatePrismaRsvpRepository(prismaClient)
    : CreateInMemoryRsvpRepository();

  const rsvpService = CreateRsvpService(repository, rsvpRepository, authUsers);
  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);
  const controller = CreateEventController(service, rsvpService, resolvedLogger);

  return CreateApp(authController, resolvedLogger, controller, rsvpController);
}
