export type EventStatus = "draft" | "published" | "cancelled";
export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export interface IEventRecord {
  id: number;
  title: string;
  description: string;
  location: string;
  category?: string | null;
  organizerId: string;
  published: boolean;
  status: EventStatus;
  startDate: Date;
  maxCapacity?: number | null;
}

export interface IRsvpRecord {
  eventId: number;
  userId: string;
  status: RsvpStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRsvpToggleResult {
  eventId: number;
  userId: string;
  rsvpStatus: RsvpStatus;
  attendeeCount: number;
}