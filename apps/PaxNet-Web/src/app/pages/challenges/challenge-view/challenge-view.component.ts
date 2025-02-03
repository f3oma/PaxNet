import { transition, trigger, useAnimation } from '@angular/animations';
import { Location } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { SetPersonalGoalDialog, SetPersonalGoalDialogProps, SetPersonalGoalDialogResult } from 'src/app/dialogs/set-personal-goal/set-personal-goal.dialog.component';
import { AuthenticatedUser } from 'src/app/models/authenticated-user.model';
import { BaseChallenge, BestAttemptChallenge, ChallengeState, ChallengeType, IBestAttemptChallenge, IterativeCompletionChallenge, UserSelectedGoalChallenge } from 'src/app/models/user-challenge.model';
import { PaxUser } from 'src/app/models/users.model';
import { ChallengeManager } from 'src/app/services/challenge-manager.service';
import { PaxManagerService } from 'src/app/services/pax-manager.service';
import { UserAuthenticationService } from 'src/app/services/user-authentication.service';
import { fadeIn, fadeOut } from 'src/app/utils/animations';
import { ChallengeInformation, ChallengeStatus, Challenges, IterativeCompletionRequirements, getChallengeIdByName, getChallengeImageByName, getChallengesEnumKeyByValue, getUserSelectedGoalOptionsByName } from 'src/app/utils/challenges';

@Component({
  selector: 'app-challenge-view',
  templateUrl: './challenge-view.component.html',
  styleUrls: ['./challenge-view.component.scss'],
  animations: [
    trigger("fadeInOut", [
      transition("void => *", [useAnimation(fadeIn)]),
      transition("* => void", [useAnimation(fadeOut)]),
    ])
  ]
})
export class ChallengeViewComponent implements OnInit {  
  public authUserData$: Observable<AuthenticatedUser | undefined>;
  public displayedColumns: string[] = ['f3Name', 'status', 'totalCompleted'];
  public tableData: BaseChallenge[] = [];
  public dataSource: any;
  public showChallengeNotFoundError = false;
  public loading = true;
  public challengeInformation: ChallengeInformation | null = null;
  public paxChallengeData: BaseChallenge | undefined;
  private paxUser: PaxUser | undefined = undefined;

  // Challenge specific
  public showLoggedState: boolean = false;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private challengeManager: ChallengeManager,
    private userAuthService: UserAuthenticationService,
    private paxManagerService: PaxManagerService,
    private location: Location,
    private route: ActivatedRoute,
    private matDialog: MatDialog) {
      this.authUserData$ = this.userAuthService.authUserData$.pipe(
        tap(async (data: any) => {
            const paxDataId = data?.paxDataId;
            if (paxDataId && paxDataId !== undefined) {
                await this.getPaxUserData(paxDataId);
            }
        })
      );
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    await this.getChallengeData(id);
  }

  async getPaxUserData(id: string) {
    this.paxUser = await (await this.paxManagerService.getDataByAuthId(id)).data();
    if (this.challengeInformation && this.paxUser) {
      this.paxChallengeData = await this.challengeManager.getUserChallengeData(this.challengeInformation.id, this.paxUser!.id);
      this.refreshData(this.tableData);
    }
  }

  async withdraw() {
    if (confirm("Are you sure? All challenge progress will be lost.") && this.paxChallengeData) {
      await this.challengeManager.withdrawUserFromChallenge(this.paxChallengeData);
      this.paxChallengeData = undefined;
      this.tableData = this.tableData.filter((a) => !(a.paxUser.id === this.paxUser!.id));
      this.refreshData(this.tableData);
    }
  }

  async joinChallenge() {
    let challenge: BaseChallenge | null = null;
    const challengeState = this.challengeInformation?.status === ChallengeStatus.PreRegistration ? ChallengeState.PreRegistered : ChallengeState.NotStarted;
    if (this.challengeInformation?.type === ChallengeType.IterativeCompletions) {
        const completionRequirements = this.challengeInformation.completionRequirements as IterativeCompletionRequirements;
        challenge = new IterativeCompletionChallenge({
            id: '',
            paxUser: this.paxUser!,
            type: this.challengeInformation.type,
            state: challengeState,
            startDateString: this.challengeInformation.startDateString,
            endDateString: this.challengeInformation.endDateString,
            endDateTime: new Date(this.challengeInformation.endDateString),
            name: this.challengeInformation.name,
            totalToComplete: completionRequirements.totalCompletionsRequired,
            activeCompletions: 0,
            challengeInfoId: this.challengeInformation.id!,
        });
    } else if (this.challengeInformation?.type === ChallengeType.BestAttempt) {
      challenge = new BestAttemptChallenge({
        id: '',
        paxUser: this.paxUser!,
        type: this.challengeInformation.type,
        state: challengeState,
        startDateString: this.challengeInformation.startDateString,
        endDateString: this.challengeInformation.endDateString,
        endDateTime: new Date(this.challengeInformation.endDateString),
        name: this.challengeInformation.name,
        bestAttempt: 0,
        challengeInfoId: this.challengeInformation.id!,
      }); 
    } else if (this.challengeInformation?.type === ChallengeType.UserSelectedGoal) {
      let goal = 0;

      const result: SetPersonalGoalDialogResult = await this.matDialog.open(SetPersonalGoalDialog, {
        data: <SetPersonalGoalDialogProps> {
          goalOptions: getUserSelectedGoalOptionsByName(this.challengeInformation.id)
        },
        maxWidth: '100vw',
        maxHeight: '100vh',
        height: '100%',
        width: '100%'
      }).afterClosed().toPromise();

      if (result) {
        goal = result.goal;
      } else {
        // user canceled
        return;
      }

      challenge = new UserSelectedGoalChallenge({
        id: '',
        paxUser: this.paxUser!,
        type: this.challengeInformation.type,
        state: challengeState,
        startDateString: this.challengeInformation.startDateString,
        endDateString: this.challengeInformation.endDateString,
        endDateTime: new Date(this.challengeInformation.endDateString),
        name: this.challengeInformation.name,
        goal: goal,
        currentValue: 0,
        challengeInfoId: this.challengeInformation.id!
      }); 
    }

    if (challenge) {
      await this.challengeManager.startChallenge(challenge);
      this.paxChallengeData = challenge;
      this.tableData.push(challenge);
      this.refreshData(this.tableData);
    }
  }

  getStateForDisplay(state: ChallengeState) {
    switch(state) {
      case ChallengeState.PreRegistered:
        return "Pre-Registered";
      case ChallengeState.NotStarted:
        return "Not Started";
      case ChallengeState.Completed:
        return "🌟 Completed";
      case ChallengeState.Failed:
        return "DNF";
      case ChallengeState.InProgress:
        return "In Progress";
      default:
        return "Unknown";
    }
  }

  canJoinChallenge() {
    if (this.challengeInformation) {
      if (new Date() < new Date(this.challengeInformation.lastDateToRegister)) {
        return true;
      }
    }
    return false;
  }

  async getChallengeData(id: string | null) {
    if (!id) {
      console.error("Unknown challenge");
      return;
    }

    const challengeInformation: ChallengeInformation = await this.challengeManager.getChallengeInformation(id);
    if (!challengeInformation) {
      this.showChallengeNotFoundError = true;
      this.loading = false;
      return;
    }

    const tableData: BaseChallenge[] = await this.challengeManager.getAllChallengeParticipants(id);
    if (!tableData) {
      this.showChallengeNotFoundError = true;
    }

    // As soon as a challenge is active, set the state of all entries to in-progress
    // and update challenge information to started
    if (new Date(challengeInformation.startDateString) < new Date() && 
      challengeInformation.status === ChallengeStatus.PreRegistration) {
      challengeInformation.status = ChallengeStatus.Started;
      await this.challengeManager.updateChallengeInformation(challengeInformation);
      const promises: Promise<any>[] = [];
      for (let challengeEntry of tableData) {
        if (challengeEntry.state === ChallengeState.PreRegistered) {
          challengeEntry.updateState(ChallengeState.InProgress);
          promises.push(this.challengeManager.updateChallenge(challengeEntry));
        }
      }
      await Promise.all(promises);
    }

    // Once the challenge is over:
    // 1. Update the status of the challenge to completed
    // 2. Any entries still in progress set to DNF
    if (new Date(challengeInformation.endDateString) < new Date()) {
      if (challengeInformation.status !== ChallengeStatus.Completed) {
        challengeInformation.status = ChallengeStatus.Completed;
        await this.challengeManager.updateChallengeInformation(challengeInformation);
      }
      const promises: Promise<any>[] = [];
      for (let challengeEntry of tableData) {
        if (challengeEntry.state === ChallengeState.InProgress || challengeEntry.state === ChallengeState.NotStarted) {
          challengeEntry.updateState(ChallengeState.Failed);
          promises.push(this.challengeManager.updateChallenge(challengeEntry));
        }
      }
      await Promise.all(promises);
    }

    this.challengeInformation = challengeInformation;
    if (this.challengeInformation?.status === ChallengeStatus.PreRegistration) {
      this.displayedColumns = ['f3Name', 'status'];
    }
    this.refreshData(tableData);
    this.loading = false;
  }

  refreshData(challenges: BaseChallenge[]) {
    let sorted = challenges;

    if (!this.challengeInformation)
      return;

    if (this.challengeInformation.type === ChallengeType.IterativeCompletions) {
      let iterativeCompletionChallenges = sorted as IterativeCompletionChallenge[];
      // If user is in the challenge put them first, followed by sorted completion status
      sorted = iterativeCompletionChallenges.sort((a, b) => {
        if (this.paxChallengeData) {
          if (a.id === this.paxChallengeData.id && b.id !== this.paxChallengeData.id) {
            return -1;
          }
          if (b.id === this.paxChallengeData.id && a.id !== this.paxChallengeData.id) {
            return 1;
          }
        }
        return b.activeCompletions - a.activeCompletions;
      });
    } else if (this.challengeInformation.type === ChallengeType.UserSelectedGoal) {
      let personalGoalsChallenge = sorted as UserSelectedGoalChallenge[];
      // If user is in the challenge put them first, followed by sorted completion status
      sorted = personalGoalsChallenge.sort((a, b) => {
        if (this.paxChallengeData) {
          if (a.id === this.paxChallengeData.id && b.id !== this.paxChallengeData.id) {
            return -1;
          }
          if (b.id === this.paxChallengeData.id && a.id !== this.paxChallengeData.id) {
            return 1;
          }
        }
        return b.currentValue - a.currentValue;
      });
    }

    // The first element set to status from db
    if (this.paxChallengeData) {
      sorted[0] = this.paxChallengeData;
    }

    this.tableData = sorted;
    this.dataSource = new MatTableDataSource(this.tableData);
    this.dataSource.sort = this.sort;
  }
  
  getRowCount() {
    return this.tableData.length;
  }

  goBack() {
    this.location.back();
  }

  getChallengeImage(challenge: ChallengeInformation) {
    return getChallengeImageByName(challenge.id);
  }

  async logSingleCompletion() {
    if (!this.paxChallengeData)
      return;

    if (this.paxChallengeData.state === ChallengeState.NotStarted || this.paxChallengeData.state === ChallengeState.PreRegistered) {
      this.paxChallengeData.updateState(ChallengeState.InProgress);
    }

    this.showLoggedState = true;

    var isCompleted = this.paxChallengeData.isComplete();

    if (this.paxChallengeData.type === ChallengeType.IterativeCompletions) {
      (this.paxChallengeData as IterativeCompletionChallenge).addNewIteration();
      if (!isCompleted && (this.paxChallengeData as IterativeCompletionChallenge).isComplete())
        await this.challengeManager.completeChallenge(this.paxChallengeData);
      else
        await this.challengeManager.updateChallenge(this.paxChallengeData);
    } else if (this.paxChallengeData.type === ChallengeType.BestAttempt) {
      // TODO: Get attempt value from user, set value and mark completed.

    }

    setTimeout(() => {
      this.showLoggedState = false;
    }, 2000);
  }
}
