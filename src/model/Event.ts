import { IUserSummary } from "../auth/User.js";

export type Category = "None" | "test1" | "test2" | "test3"; // ben i made this up, you can move and change the category types
export type EventStatus = "draft" | "published" | "cancelled" | "past";

export interface IEvent {
    id: number;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date; 
    location: string;
    category: Category; 
    status: EventStatus;
    maxCapacity: number;
    organizerId: string; // CHANGE THIS TO UUID
    organizerName?: string;
    attendingUsers: IUserSummary[];
};

export interface CreateEventInput {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location: string;
    category?: Category; 
    maxCapacity: number;
    status?: EventStatus;
    organizerId: string; //required
    organizerName?: string;
};

export interface EditEventInput {
    title?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
    category?: Category; 
    maxCapacity?: number;
    status?: EventStatus;
};


export class Event implements IEvent { 
    id: number;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location: string;
    category: Category;
    status: EventStatus;
    maxCapacity: number;
    organizerId: string;
    organizerName?: string;
    attendingUsers: IUserSummary[];
    
    constructor(id: number, data: CreateEventInput, organizerId: string) { //change organizerId to UUID
        this.id = id;
        this.title = data.title;
        this.description = data.description;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.location = data.location;
        this.category = data.category ?? "None";
        this.status = data.status ?? "draft";
        this.maxCapacity = data.maxCapacity ;
        this.organizerId = organizerId;
        this.organizerName = data.organizerName;
        this.attendingUsers = [];
    }

    public applyEdits(input: EditEventInput) {
        if (input.title !== undefined) this.title = input.title;
        if (input.description !== undefined) this.description = input.description;
        if (input.startDate !== undefined) this.startDate = input.startDate;
        if (input.endDate !== undefined) this.endDate = input.endDate;
        if (input.location !== undefined) this.location = input.location;
        if (input.category !== undefined) this.category = input.category;
        if (input.maxCapacity !== undefined) this.maxCapacity = input.maxCapacity;
        if (input.status !== undefined) this.status = input.status;
    }
}
