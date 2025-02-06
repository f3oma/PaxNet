import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PreActivity } from '@shared/src';
import { BehaviorSubject, Observable, Subject, debounceTime, map } from 'rxjs';
import { UserReportedWorkout } from 'src/app/models/beatdown-attendance';
import { BaseChallenge } from 'src/app/models/user-challenge.model';
import { PaxUser } from 'src/app/models/users.model';
import { BeatdownSearchService } from 'src/app/services/beatdown-search.service';
import { BeatdownService } from 'src/app/services/beatdown.service';
import { ChallengeManager } from 'src/app/services/challenge-manager.service';
import { WeatherService } from 'src/app/services/weather-api.service';
import { WorkoutManagerService } from 'src/app/services/workout-manager.service';
import { Challenges, preRunRuckChallengeHelper, winterWarriorChallengeHelper } from 'src/app/utils/challenges';

export interface UserReportedWorkoutProps {
  user: PaxUser,
  activeChallenges: BaseChallenge[];
}

export const enum AvailableTabs {
  F3Omaha = "F3Omaha",
  Downrange = "Downrange",
  ShieldLock = "ShieldLock",
};

@Component({
  selector: 'app-personal-workout-report',
  templateUrl: './personal-workout-report.component.html',
  styleUrls: ['./personal-workout-report.component.scss']
})
export class PersonalWorkoutReportComponent {
  personalWorkoutReportForm: FormGroup = new FormGroup({
    'activityType': new FormControl(''),
    'beatdown': new FormControl(''),
    'date': new FormControl(new Date()),
    'preActivity': new FormControl('None'),
    'preActivityMiles': new FormControl(0),
    'totalMiles': new FormControl(0),
    'workoutCategory': new FormControl('None'),
    'workoutDifficulty': new FormControl('light'),
    'notes': new FormControl(''),
  });

  user: PaxUser;
  activeChallenges: BaseChallenge[] = [];
  userSaveLoading: boolean = false;

  filteredBeatdownOptionsSubject: Subject<any[]> = new BehaviorSubject<any[]>([]);
  filteredBeatdownOptions$: Observable<any[]> = this.filteredBeatdownOptionsSubject.asObservable();
  selectedBeatdownOption: any = '';

  activeTab: AvailableTabs = AvailableTabs.F3Omaha;
  userIsCommittedToPreRunRuckChallenge: boolean = false;

  constructor(
    private workoutService: WorkoutManagerService,
    private beatdownSearchService: BeatdownSearchService,
    private beatdownService: BeatdownService,
    private challengeManager: ChallengeManager,
    public dialogRef: MatDialogRef<PersonalWorkoutReportComponent>,
    public weatherService: WeatherService,
    @Inject(MAT_DIALOG_DATA) public data: UserReportedWorkoutProps
    ) {
    this.user = data.user;
    this.activeChallenges = data.activeChallenges;
    for (let challenge of data.activeChallenges) {
      if (challenge.challengeInfoId === Challenges.PreRuckRunChallenge && new Date(challenge.startDateString) < new Date()) {
        this.userIsCommittedToPreRunRuckChallenge = true;
      }
    }

    this.personalWorkoutReportForm.controls['preActivity'].setValue('None');
    this.personalWorkoutReportForm.controls['beatdown'].valueChanges.pipe(
      debounceTime(1000),
      map(async (value: string) => {
          if (value) {
              await this.updateBeatdownAutocompleteResults(value);
          }
          return [];
      })).subscribe();
  }

  async submit() {
    this.userSaveLoading = true;
    let workoutData = null;

    if (!this.personalWorkoutReportForm.valid) {
      this.userSaveLoading = false;
      alert("Check inputs and try again");
      return null;
    }

    var activityType = this.personalWorkoutReportForm.controls['activityType'].value;
    if (activityType === 'f3Omaha') {
      workoutData = await this.generateF3OmahaWorkoutData();
    } else {
      workoutData = await this.generateNonBeatdownWorkoutData();
    }

    if (!workoutData) {
      return;
    }

    await this.workoutService.createPersonalReportedWorkout(workoutData, this.user);

    // Challenges, this will need to be centralized...
    if (this.activeChallenges.length > 0) {
      for (let challenge of this.activeChallenges) {

        // Do we have an active challenge
        if (challenge.challengeInfoId === Challenges.WinterWarrior2024 && new Date(challenge.startDateString) < new Date()) {
          const feelsLike: number | undefined = await this.weatherService.getFeelsLikeForDate(workoutData.date);
          if (feelsLike && feelsLike <= 20) {
            await winterWarriorChallengeHelper(challenge, this.challengeManager);
          }
        }

        if (challenge.challengeInfoId === Challenges.PreRuckRunChallenge && 
          new Date(challenge.startDateString) < new Date() && 
          this.isEligibleForPreRunRuckChallenge(workoutData.preActivity, workoutData.beatdown)) {
          const completedTotal = this.getNumberOfMilesPreRan();
          await preRunRuckChallengeHelper(challenge, completedTotal, this.challengeManager);
        }
      }
    }

    this.dialogRef.close();
  }

  isEligibleForPreRunRuckChallenge(preactivitySelected: string, beatdownSelected?: string) {
    if (!this.userIsCommittedToPreRunRuckChallenge)
      return false;

    if (preactivitySelected === 'Run' || preactivitySelected === 'Ruck' || preactivitySelected === 'Smurph' || beatdownSelected?.includes('Halfway House')) {
      return true;
    }
  
    return false;
  }

  private getNumberOfMilesPreRan(): number {
    let milesCompleted = 0;

    if (this.personalWorkoutReportForm.controls['activityType'].value !== 'personal') {
      milesCompleted = this.personalWorkoutReportForm.controls['preActivityMiles'].value;
    }

    return milesCompleted;
  }

  async generateF3OmahaWorkoutData(): Promise<UserReportedWorkout | null> {
    const beatdown = this.personalWorkoutReportForm.controls['beatdown'].value;
    const beatdownRef = this.beatdownService.getBeatdownReference(beatdown.ref);
    let workoutData: UserReportedWorkout = {
      preActivity: this.personalWorkoutReportForm.controls['preActivity'].value,
      milesCompleted: this.personalWorkoutReportForm.controls['totalMiles'].value,
      date: beatdown.date,
      beatdown: beatdownRef,
      notes: this.personalWorkoutReportForm.controls['notes'].value,
      workoutCategory: this.personalWorkoutReportForm.controls['workoutCategory'].value,
      workoutDifficulty: this.personalWorkoutReportForm.controls['workoutDifficulty'].value,
      activityType: this.personalWorkoutReportForm.controls['activityType'].value,
      preActivityMiles: this.personalWorkoutReportForm.controls['preActivityMiles'].value,
    }
    return workoutData;
  }

  async generateNonBeatdownWorkoutData(): Promise<UserReportedWorkout | null> {
    let workoutData: UserReportedWorkout = {
      preActivity: this.personalWorkoutReportForm.controls['activityType'].value === 'personal' ? PreActivity.None : this.personalWorkoutReportForm.controls['preActivity'].value,
      preActivityMiles: this.personalWorkoutReportForm.controls['preActivityMiles'].value,
      milesCompleted: this.personalWorkoutReportForm.controls['totalMiles'].value,
      date: this.personalWorkoutReportForm.controls['date'].value,
      notes: this.personalWorkoutReportForm.controls['notes'].value,
      workoutCategory: this.personalWorkoutReportForm.controls['workoutCategory'].value,
      workoutDifficulty: this.personalWorkoutReportForm.controls['workoutDifficulty'].value,
      activityType: this.personalWorkoutReportForm.controls['activityType'].value,
    }

    return workoutData;
  }

  public displayBeatdownOptions(option: any) {
    if (!option)
      return '';

    const date = option.date;
    return `${date.toDateString('MM/dd')} - ${option.name}`;
  }

  userCancel() {
    this.dialogRef.close();
  }

  private async updateBeatdownAutocompleteResults(partialBeatdownQuery: string): Promise<void> {
    const result = await this.findBeatdownByName(partialBeatdownQuery);
    const beatdowns = result.map((res) => {
        const date = new Date(res.date);
        date.setHours(date.getHours() + 5);
        return { 
            ref: res.path,
            date: date,
            name: res.eventName ?? res.aoName
        };
    });
    this.filteredBeatdownOptionsSubject.next(beatdowns);
  }

  private async findBeatdownByName(partialBeatdownName: string): Promise<any[]> {
    return await this.beatdownSearchService.findByName(partialBeatdownName);
  }
}
