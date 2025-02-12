import { Component, OnInit } from '@angular/core';
import { SupportTicket } from 'src/app/models/support-ticket.model';
import { SupportTicketService } from 'src/app/services/support-ticket.service';

@Component({
  selector: 'app-my-tickets',
  template: `
    <div class="container mt-4 px-4">
      <h2>My Support Tickets</h2>
      <div class="list-group mt-3">
        <div *ngFor="let ticket of tickets" class="list-group-item">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-1">Ticket ID: {{ticket.id}}</h5>
              <p class="mb-1">{{ticket.description}}</p>
              <small>Created: {{ticket.createdAt | date}}</small>
            </div>
            <span class="badge bg-{{getStatusBadgeColor(ticket.status)}}">
              {{ticket.status}}
            </span>
          </div>
          <div *ngIf="ticket.adminNotes" class="mt-2">
            <small class="text-muted">Admin Notes: {{ticket.adminNotes}}</small>
          </div>
        </div>
      </div>
      <button routerLink="/support/create" mat-flat-button color="primary" class="btn mt-3">
        Create New Ticket
      </button>
    </div>
  `
})
export class MyTicketsComponent implements OnInit {
  tickets: SupportTicket[] = [];

  constructor(private supportTicketService: SupportTicketService) {}

  async ngOnInit() {
    this.tickets = await this.supportTicketService.getUserTickets();
  }

  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'open': return 'primary';
      case 'in-progress': return 'warning';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  }
}
