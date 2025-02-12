import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupportTicketService } from 'src/app/services/support-ticket.service';

@Component({
  selector: 'app-create-ticket',
  template: `
    <div class="container mt-4">
      <h2>Submit Support Ticket</h2>
      <p>Please allow 48-72 hours for issue resolution.</p>
      <form [formGroup]="ticketForm" (ngSubmit)="onSubmit()">
        <div class="mb-3">
          <label for="description" class="form-label">Description</label>
          <textarea
            class="form-control"
            id="description"
            formControlName="description"
            rows="4"
          ></textarea>
        </div>
        <button type="submit" mat-flat-button color="primary" class="btn" [disabled]="!ticketForm.valid">
          Submit Ticket
        </button>
      </form>
    </div>
  `
})
export class CreateTicketComponent {
  ticketForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private supportTicketService: SupportTicketService,
    private router: Router
  ) {
    this.ticketForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  async onSubmit() {
    if (this.ticketForm.valid) {
      await this.supportTicketService.createTicket(this.ticketForm.get('description')?.value);
      this.router.navigate(['/support/my-tickets']);
    }
  }
}
