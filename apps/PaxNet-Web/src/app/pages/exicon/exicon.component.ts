import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthenticatedUser } from 'src/app/models/authenticated-user.model';
import { Exercise } from 'src/app/models/exercise.model';
import { IPaxUser } from 'src/app/models/users.model';
import { ExiconService } from 'src/app/services/exicon.service';
import { PaxManagerService } from 'src/app/services/pax-manager.service';
import { UserAuthenticationService } from 'src/app/services/user-authentication.service';

@Component({
  selector: 'app-exicon',
  templateUrl: './exicon.component.html',
  styleUrls: ['./exicon.component.scss']
})
export class ExiconComponent implements OnInit {

  private exerciseSubject: BehaviorSubject<Exercise[]> = new BehaviorSubject<Exercise[]>([]);
  public exercises$: Observable<Exercise[]> = this.exerciseSubject.asObservable();

  public authUserData$: Observable<AuthenticatedUser | undefined>;
  public userDataSubject: BehaviorSubject<IPaxUser | undefined> = new BehaviorSubject<IPaxUser | undefined>(undefined);
  public paxUserData$: Observable<IPaxUser | undefined> = this.userDataSubject.asObservable();
  
  private pageLimit = 100;
  public editMode = false;
  public showApprovalMessage: boolean = false;
  public loading = true;
  public approvalMessage = "Thank you for your submission! Your entry will be available once it's approved";

  constructor(
    private exiconService: ExiconService,
    private userAuthService: UserAuthenticationService,
    private paxManagerService: PaxManagerService) {

      this.authUserData$ = this.userAuthService.authUserData$.pipe(
        tap(async (data) => {
            const paxDataId = data?.paxDataId;
            if (paxDataId && paxDataId !== undefined) {
                await this.getPaxUserData(paxDataId);
            }
            setTimeout(() => {
              this.loading = false;
            }, 500);
        })
      );

    }

    async ngOnInit(): Promise<void> {
      await this.getPaginatedExercises();
    }

    public convertToId(category: string) {
      return category.replace(/\s+/g, '-').toLowerCase();
    }

    private async getPaxUserData(id: string) {
      const paxData = await (await this.paxManagerService.getDataByAuthId(id)).data();
      this.userDataSubject.next(paxData?.toProperties());
    }

    public toggleEditMode() {
      this.editMode = !this.editMode
    }

    async getPaginatedExercises() {
      const exercises = await this.exiconService.getPaginatedExercises(this.pageLimit, null);
      this.exerciseSubject.next(exercises);
    }

    async nextPage(page: number) {
      const exercises = await this.exiconService.getNextPage(this.pageLimit);
      this.exerciseSubject.next(exercises);
    }

    async previousPage(page: number) {
      const exercises = await this.exiconService.getPreviousPage(this.pageLimit);
      this.exerciseSubject.next(exercises);
    }

    async addNewExercise() {
      this.toggleEditMode();
    }

    addedExercise() {
      this.toggleEditMode();
      this.showApprovalMessage = true;
      setTimeout(() => {
        this.showApprovalMessage = false;
      }, 4000);
    }
}
