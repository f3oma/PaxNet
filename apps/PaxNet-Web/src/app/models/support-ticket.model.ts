import { Timestamp } from "firebase/firestore";

export interface SupportTicket {
  id?: string;
  userId: string;
  description: string;
  status: 'open' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
}

export interface SupportTicketEntity {
    id: string;
    userId: string;
    description: string;
    status: 'open' | 'in-progress' | 'completed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    adminNotes?: string;
}