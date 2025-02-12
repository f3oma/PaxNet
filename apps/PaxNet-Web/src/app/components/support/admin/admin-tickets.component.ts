import { Component, OnInit } from '@angular/core';
import { SupportTicket } from 'src/app/models/support-ticket.model';
import { SupportTicketService } from 'src/app/services/support-ticket.service';


@Component({
  selector: 'app-admin-tickets',
  template: `
    <div class="container mt-4">
      <h2>Manage Support Tickets</h2>
      <div class="list-group">
        <div *ngFor="let ticket of tickets" class="list-group-item">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-1">Ticket #{{ticket.id}}</h5>
              <p class="mb-1">{{ticket.description}}</p>
              <small>Created: {{ticket.createdAt | date}}</small>
            </div>
            <div>
              <select 
                [(ngModel)]="ticket.status" 
                (change)="updateStatus(ticket)"
                class="form-select"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div class="mt-2">
            <textarea
              [(ngModel)]="ticket.adminNotes"
              (blur)="updateStatus(ticket)"
              class="form-control"
              placeholder="Add admin notes..."
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminTicketsComponent implements OnInit {
  tickets: SupportTicket[] = [];

  constructor(private supportTicketService: SupportTicketService) {}

  async ngOnInit() {
    this.tickets = await this.supportTicketService.getAllTickets();
  }

  async updateStatus(ticket: SupportTicket) {
    if (ticket.id) {
      await this.supportTicketService.updateTicketStatus(
        ticket.id,
        ticket.status,
        ticket.adminNotes
      );
    }
  }
}
