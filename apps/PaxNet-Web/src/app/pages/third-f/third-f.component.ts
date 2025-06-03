import { Component } from '@angular/core';
import { UserAuthenticationService } from '../../services/user-authentication.service';
import { PaxManagerService } from '../../services/pax-manager.service';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser, UserRole } from '../../models/authenticated-user.model';
import { PaxUser } from '../../models/users.model';
import { BloodDriveService } from '../../services/blood-drive.service';
import { BloodDriveEventInformation } from '../../models/blood-drive.model';

@Component({
  selector: 'third-f',
  templateUrl: './third-f.component.html',
  styleUrl: './third-f.component.scss'
})
export class ThirdFComponent {
  public authUserData$: Observable<AuthenticatedUser | undefined>;
  private paxUser: PaxUser | undefined = undefined;
  public loading = true;
  public isAdmin = false;
  public activeEvents: BloodDriveEventInformation[] = [];
  public pastEvents: BloodDriveEventInformation[] = [];
  public readonly descriptionMaxLength = 150;

  constructor(
    private userAuthService: UserAuthenticationService,
    private paxManagerService: PaxManagerService,
    private bloodDriveService: BloodDriveService) {
      this.authUserData$ = this.userAuthService.authUserData$.pipe(
        tap(async (data) => {
            const paxDataId = data?.paxDataId;
            if (paxDataId && paxDataId !== undefined) {
                await this.getPaxUserData(paxDataId);
                if (data.roles.includes(UserRole.Admin)) {
                  this.isAdmin = true;
                }
            }
            // Load events after user authentication
            await this.loadEvents();
        })
      );
    }

    async getPaxUserData(id: string) {
      this.paxUser = await (await this.paxManagerService.getDataByAuthId(id)).data();
    }

    async loadEvents() {
      try {
        // Get all events
        const allEvents = await this.bloodDriveService.getAllBloodDriveEvents();
        
        // Sort events based on their date
        const today = new Date();
        
        // Filter active events (event date is today or in the future)
        this.activeEvents = allEvents.filter(event => {
          const eventDate = new Date(this.convertToDateObject(event.eventDate));
          return eventDate >= today;
        }).sort((a, b) => {
          return new Date(this.convertToDateObject(a.eventDate)).getTime() - 
                 new Date(this.convertToDateObject(b.eventDate)).getTime();
        });
        
        // Filter past events (event date is in the past)
        this.pastEvents = allEvents.filter(event => {
          const eventDate = new Date(this.convertToDateObject(event.eventDate));
          return eventDate < today;
        }).sort((a, b) => {
          return new Date(this.convertToDateObject(b.eventDate)).getTime() - 
                 new Date(this.convertToDateObject(a.eventDate)).getTime();
        });
        
        this.loading = false;
      } catch (error) {
        console.error('Error loading events:', error);
        this.loading = false;
      }
    }
    
    // Helper method to truncate descriptions
    truncateDescription(description: string): string {
      if (description && description.length > this.descriptionMaxLength) {
        return description.substring(0, this.descriptionMaxLength) + '...';
      }
      return description;
    }
    
    // Helper method to convert MM/DD/YYYY to a date object
    private convertToDateObject(dateString: string): Date {
      const parts = dateString.split('/');
      // Month is 0-indexed in JavaScript Date
      return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
}
