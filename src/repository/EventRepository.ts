import { Result } from "../lib/result.js";
import { EventError } from "../lib/errors.js";


export type Event = {
    id: number;
    title: string;
    description: string;
    startDate: Date;
    location: string;
    category: string; // update to category object later @Ben
    public: boolean;
    maxCapacity: number;
    organizerId: number;
    attendingUsers: User[];
};

export type CreateEventInput = {
    title: string;
    description: string;
    startDate: Date;
    location: string;
    category?: string; // update this too 
    maxCapacity: number;
};

// functions for event handling, implement in the repository
export interface IEventRepository {
    add(input: CreateEventInput): Promise<Result<Event, EventError>>;
    getById(id: number): Promise<Result<Event, EventError>>;
    getAll(): Promise<Result<Event[], EventError>>;
}
