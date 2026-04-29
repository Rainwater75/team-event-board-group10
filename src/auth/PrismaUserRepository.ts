import { PrismaClient } from "@prisma/client";
import { Err, Ok, type Result } from "../lib/result";
import { UnexpectedDependencyError, type AuthError } from "./errors";
import type { IUserRepository } from "./UserRepository";
import type { IUserRecord } from "./User";

class PrismaUserRepository implements IUserRepository {
    constructor(private prisma: PrismaClient) {}

    async findByEmail(email: string): Promise<Result<IUserRecord | null, AuthError>> {
        try {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        return Ok(user as IUserRecord | null);
        } catch (error) {
        return Err(UnexpectedDependencyError("Database error while finding user by email."));
        }
    }

    async findById(id: string): Promise<Result<IUserRecord | null, AuthError>> {
        try {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        return Ok(user as IUserRecord | null);
        } catch (error) {
        return Err(UnexpectedDependencyError("Database error while finding user by ID."));
        }
    }

    async listUsers(): Promise<Result<IUserRecord[], AuthError>> {
        try {
        const users = await this.prisma.user.findMany();
        return Ok(users as IUserRecord[]);
        } catch (error) {
        return Err(UnexpectedDependencyError("Database error while listing users."));
        }
    }

    async createUser(user: IUserRecord): Promise<Result<IUserRecord, AuthError>> {
        try {
        const newUser = await this.prisma.user.create({
            data: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            passwordHash: user.passwordHash,
            },
        });
        return Ok(newUser as IUserRecord);
        } catch (error) {
        return Err(UnexpectedDependencyError("Database error while creating user."));
        }
    }

    async deleteUser(id: string): Promise<Result<boolean, AuthError>> {
        try {
        // Prisma throws if you delete a record that doesn't exist, 
        // so we use deleteMany to return a count for a safe boolean result.
        const deletion = await this.prisma.user.deleteMany({
            where: { id },
        });
        return Ok(deletion.count > 0);
        } catch (error) {
        return Err(UnexpectedDependencyError("Database error while deleting user."));
        }
    }
}

export function CreatePrismaUserRepository(prisma: PrismaClient): IUserRepository {
    return new PrismaUserRepository(prisma);
}