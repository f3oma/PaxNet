import { DocumentData, QueryDocumentSnapshot, Timestamp } from "@angular/fire/firestore";
import { Injectable } from "@angular/core";
import { SupportTicket, SupportTicketEntity } from "../models/support-ticket.model";

@Injectable({
    providedIn: 'root'
})  
export class SupportTicketConverter {
  
    constructor() {}
  
    public getConverter() {
      return {
        toFirestore: (data: SupportTicket): DocumentData => {
            return <SupportTicketEntity> {
                userId: data.userId,
                description: data.description,
                status: data.status,
                createdAt: Timestamp.fromDate(data.createdAt),
                updatedAt: Timestamp.fromDate(data.updatedAt),
                adminNotes: data.adminNotes,
            }
        },
        fromFirestore: (snap: QueryDocumentSnapshot): SupportTicket => {
            const data = snap.data() as SupportTicketEntity;
            return <SupportTicket> {
                id: snap.id,
                userId: data.userId,
                description: data.description,
                status: data.status,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
                adminNotes: data.adminNotes ?? "",
            };
        }
      }
    }
}
