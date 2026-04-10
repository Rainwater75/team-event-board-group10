import { Result } from "../lib/result.js";


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



