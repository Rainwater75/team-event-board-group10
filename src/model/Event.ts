import { IUserSummary } from "../auth/User.js";

export type Category = "None" | "test1" | "test2" | "test3"; // ben i made this up, you can move and change the category types

export interface IEvent {
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

export interface CreateEventInput {
    title: string;
    description: string;
    startDate: Date;
    location: string;
    category?: Category; 
    maxCapacity: number;
    public?: boolean;
};


export class Event implements IEvent { 
    id: number;
    title: string;
    description: string;
    startDate: Date;
    location: string;
    category: Category;
    public: boolean;
    maxCapacity: number;
    organizerId: string;
    attendingUsers: IUserSummary[];

    constructor(id: number, data: CreateEventInput, organizerId: string) { //change organizerId to UUID
        this.id = id;
        this.title = data.title;
        this.description = data.description;
        this.startDate = data.startDate;
        this.location = data.location;
        this.category = data.category ?? "None";
        this.public = data.public ?? false;
        this.maxCapacity = data.maxCapacity ;
        this.organizerId = organizerId;
        this.attendingUsers = [];
    }
}
