import { Component, OnInit } from '@angular/core';
import { SupportTicket } from 'src/app/models/support-ticket.model';
import { SupportTicketService } from 'src/app/services/support-ticket.service';


@Component({
  selector: 'app-admin-tickets',
  template: `
    <div class="container mt-4">
      <h2 class="mb-3">Manage Support Tickets</h2>
      
      <div class="filters">
        <div class="form-check mb-3">
          <input 
            class="form-check-input" 
            type="checkbox" 
            id="showOpenOnly" 
            [(ngModel)]="showOpenOnly" 
            (change)="filterTickets()">
          <label class="form-check-label" for="showOpenOnly">
            Show Open Tickets Only
          </label>
        </div>
      </div>
      <div class="list-group">
        <div *ngFor="let ticket of filteredTickets" class="list-group-item">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-2" style="font-size: 16px">Ticket ID: {{ticket.id}}</h5>
              <p class="mb-2">{{ticket.description}}</p>
              <small>Created: {{ticket.createdAt | date}}</small>
              <br>
              <small>Submitted by: {{ticket.userId}}</small>
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
  private tickets: SupportTicket[] = [];
  showOpenOnly: boolean = false;
  filteredTickets: SupportTicket[] = [];

  constructor(private supportTicketService: SupportTicketService) {}

  async ngOnInit() {
    this.tickets = await this.supportTicketService.getAllTickets();
    this.filterTickets();
  }

  filterTickets() {
    if (this.showOpenOnly) {
      this.filteredTickets = this.tickets.filter(ticket => ticket.status === 'open');
    } else {
      this.filteredTickets = this.tickets;
    }
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
