import { Result } from "../lib/result.js";
import { EventError } from "../lib/errors.js";
import { IUserSummary } from "../auth/User.js";

export type Category = "test1" | "test2" | "test3"; // ben i made this up, you can move and change the category types

export type Event = {
    id: number;
    title: string;
    description: string;
    startDate: Date;
    location: string;
    category: Category; 
    public: boolean;
    maxCapacity: number;
    organizerId: string; // CHANGE THIS TO UUID
    attendingUsers: IUserSummary[];
};

export type CreateEventInput = {
    title: string;
    description: string;
    startDate: Date;
    location: string;
    category?: Category; 
    maxCapacity: number;
};

// functions for event handling, implement in the repository
export interface IEventRepository {
    add(input: CreateEventInput): Promise<Result<Event, EventError>>;
    getById(id: number): Promise<Result<Event, EventError>>;
    getAll(): Promise<Result<Event[], EventError>>;
}
