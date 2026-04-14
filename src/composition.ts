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



export function createComposedApp(
//   mode: "memory" | "prisma",
  logger?: ILoggingService
): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // UNCOMMENT WHEN PRISMA IS IMPLEMENTED and imported 
//   const repository = 
//     mode === "prisma" 
//       ? CreatePrismaEventRepository(
//         new PrismaClient({
//           adapter: new PrismaBetterSqlite3({
//             url: process.env.DATABASE_URL ?? "file:./dev.db",
//           }),
//         })
//       )
//       : CreateInMemoryEventRepository();

  const repository = CreateInMemoryEventRepository();


  
  
  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  const service = CreateEventService(repository);
  const controller = CreateEventController(service, resolvedLogger);

  return CreateApp(authController, resolvedLogger, controller);
}
