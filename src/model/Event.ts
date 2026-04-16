import { IUserSummary } from "../auth/User.js";

export type Category = "None" | "test1" | "test2" | "test3"; // ben i made this up, you can move and change the category types
export type EventStatus = "draft" | "published" | "cancelled"; // could change to enum later

export interface IEvent {
    id: number;
    title: string;
    description: string;
    startDate: Date;
    location: string;
    category: Category; 
    status: EventStatus; // Changed: was "public"
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
    status?: EventStatus;
    organizerId: string; //required

};


export class Event implements IEvent { 
    id: number;
    title: string;
    description: string;
    startDate: Date;
    location: string;
    category: Category;
    status: EventStatus;
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
        this.status = data.status ?? "draft";
        this.maxCapacity = data.maxCapacity ;
        this.organizerId = organizerId;
        this.attendingUsers = [];
    }
}
