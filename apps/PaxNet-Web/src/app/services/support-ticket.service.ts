import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, updateDoc, doc, CollectionReference } from '@angular/fire/firestore';
import { SupportTicket } from '../models/support-ticket.model';
import { UserAuthenticationService } from './user-authentication.service';
import { SupportTicketConverter } from '../utils/support-ticket.converter';
import { Collection } from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class SupportTicketService {

  private supportTicketCollection: CollectionReference<SupportTicket>;

  constructor(
    private firestore: Firestore,
    private authService: UserAuthenticationService,
    private converter: SupportTicketConverter
  ) {
    this.supportTicketCollection = collection(this.firestore, 'supportTickets').withConverter(this.converter.getConverter());
  }

  async createTicket(description: string): Promise<void> {
    const paxUser = await this.authService.getPaxUser();
    const ticket: SupportTicket = {
      userId: paxUser.id,
      description,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await addDoc(this.supportTicketCollection, ticket);
  }

  async getUserTickets(): Promise<SupportTicket[]> {
    const paxUser = await this.authService.getPaxUser();
    const ticketsQuery = query(
      this.supportTicketCollection,
      where('userId', '==', paxUser.id)
    );
    
    const snapshot = await getDocs(ticketsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
  }

  async getAllTickets(): Promise<SupportTicket[]> {
    const snapshot = await getDocs(this.supportTicketCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
  }

  async updateTicketStatus(ticketId: string, status: SupportTicket['status'], adminNotes?: string): Promise<void> {
    const ticketRef = doc(this.firestore, 'supportTickets', ticketId);
    await updateDoc(ticketRef, {
      status,
      adminNotes,
      updatedAt: new Date()
    });
  }
}
