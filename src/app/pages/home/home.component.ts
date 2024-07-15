import { transition, trigger, useAnimation } from '@angular/animations';
import { Component } from '@angular/core';
import { or, where } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { Observable, tap } from 'rxjs';
import { ChallengeDetail, ChallengeDetailProps } from 'src/app/dialogs/challenge-detail/challenge-detail.component';
import { CommunityWorkoutReportComponent, CommunityWorkoutReportProps } from 'src/app/dialogs/community-workout-report/community-workout-report.component';
import { PersonalWorkoutReportComponent, UserReportedWorkoutProps } from 'src/app/dialogs/personal-workout-report/personal-workout-report.component';
import { AuthenticatedUser, UserRole } from 'src/app/models/authenticated-user.model';
import { Beatdown } from 'src/app/models/beatdown.model';
import { BaseChallenge, ChallengeState, ChallengeType, IterativeCompletionChallenge } from 'src/app/models/user-challenge.model';
import { AoLocationRef, PaxUser } from 'src/app/models/users.model';
import { AOManagerService } from 'src/app/services/ao-manager.service';
import { BeatdownService } from 'src/app/services/beatdown.service';
import { ChallengeManager } from 'src/app/services/challenge-manager.service';
import { PaxWelcomeEmailService } from 'src/app/services/email-services/pax-welcome-email.service';
import { AnniversaryResponsePax, GetNewPaxResponse, PaxManagerService } from 'src/app/services/pax-manager.service';
import { UserAuthenticationService } from 'src/app/services/user-authentication.service';
import { fadeIn, fadeOut } from 'src/app/utils/animations';
import { Challenges, getChallengeIdByName } from 'src/app/utils/challenges';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger("fadeInOut", [
      transition("void => *", [useAnimation(fadeIn)]),
      transition("* => void", [useAnimation(fadeOut)]),
    ])
  ]
})
export class HomeComponent {

  public authUserData$: Observable<AuthenticatedUser | undefined>;
  public hasClaimedData: boolean = true;
  public isLoggedIn: boolean = false;
  public isAdminOrSiteQ: boolean = false;

  public latestPaxNames: string = '';
  public latestPax: { id: string, f3Name: string, ehUserF3Name: string, ehLocationName: string, profilePhotoUrl: string | undefined }[] = [];
  public anniversaryPax: AnniversaryResponsePax[] = []
  public anniversaryEndDate: Date = new Date();
  public anniversaryStartDate: Date = new Date();
  public user: PaxUser | undefined = undefined;
  beatdownsRequiringAttendanceData: { beatdown: Beatdown, isReported: boolean, paxCount: number }[] = [];
  upcomingQs: Beatdown[] = [];
  activeChallenges: BaseChallenge[] = [];
  showChallengeBanner: boolean = false;
  loadingChallenges: boolean = true;

  constructor(
    private userAuthService: UserAuthenticationService,
    private paxManagerService: PaxManagerService,
    private aoManagerService: AOManagerService,
    private challengeManager: ChallengeManager,
    private beatdownService: BeatdownService,
    private matDialog: MatDialog
  ) {
    if (this.userAuthService.isLoggedIn) {
      this.isLoggedIn = true;
      this.getPaxFromToday();
      this.getWeeklyPaxWithAnniversaries()
    }
    this.authUserData$ = this.userAuthService.authUserData$.pipe(
        tap(async (data) => {
          if (data && data !== undefined) {
            const paxDataId = data?.paxDataId;
            if (!paxDataId) {
              this.hasClaimedData = false;
            } else {
              this.getPaxUserData(paxDataId, data.siteQLocationRef);
            }
            if (data.roles.includes(UserRole.Admin) || data.roles.includes(UserRole.SiteQ)) {
              this.isAdminOrSiteQ = true;
            }
          }
        })
    );
    this.authUserData$.subscribe();
  }

  public async getPaxUserData(paxDataId: string, siteQLocationRef: AoLocationRef | undefined) {
    this.user = await (await this.paxManagerService.getDataByAuthId(paxDataId)).data();
    this.beatdownsRequiringAttendanceData = await this.beatdownService.getBeatdownAttendanceReportForUser(this.user, siteQLocationRef);

    this.handleChallenges(paxDataId);

    const userRef = this.paxManagerService.getUserReference('users/' + paxDataId);
    const threeMonthsOut = new Date();
    const today = new Date();
    threeMonthsOut.setMonth(today.getMonth() + 3);
    this.upcomingQs = await this.beatdownService.getBeatdownsBetweenDates(today, threeMonthsOut, [or(where("qUserRef", "==", userRef), where("coQUserRef", "==", userRef))]);
  }

  async handleChallenges(paxDataId: string) {
    this.loadingChallenges = true;
    this.activeChallenges = await this.challengeManager.getActiveChallengesForUser(paxDataId);
    this.loadingChallenges = false;

    // Remove banner if already joined
    let showChallengeBanner = true;
    for (let challenge of this.activeChallenges) {
      if (challenge.name === Challenges.SummerMurph2024) {
        showChallengeBanner = false;
      }
    }

    // Remove banner if user closed it
    let localStorageChallengeBannerPreference = localStorage.getItem('showChallengeAnnouncement');
    if (localStorageChallengeBannerPreference !== null) {
      const result = localStorageChallengeBannerPreference === 'false' ? false : true;
      showChallengeBanner = result;
    }

    this.showChallengeBanner = showChallengeBanner;

    await this.challengeCleanup(this.activeChallenges);
  }

  async challengeCleanup(challenges: BaseChallenge[]) {
    const today = new Date();
    const challengesToUpdate = [];
    for(let challenge of challenges) {
      const endDate = new Date(challenge.endDateString);
      const startDate = new Date(challenge.startDateString);
      if (endDate < today) {
        if (challenge.state !== ChallengeState.Completed) {
          challenge.updateState(ChallengeState.Failed);
          challengesToUpdate.push(challenge);
          continue;
        }
      }
      if (startDate <= today) {
        if (challenge.state === ChallengeState.PreRegistered) {
          challenge.updateState(ChallengeState.InProgress);
          challengesToUpdate.push(challenge);
        }
      }
    }

    if (challengesToUpdate.length > 0) {
      const promises: Promise<void>[] = [];
      challengesToUpdate.forEach((c) => promises.push(this.challengeManager.updateChallenge(c)));
      await Promise.all(promises);
    }

    this.activeChallenges = await this.challengeManager.getActiveChallengesForUser(this.user!.id);
  }

  async joinChallenge() {
    const challengeId = getChallengeIdByName(Challenges.SummerMurph2024);
    if (!challengeId) {
      console.error("Unknown challenge");
      return;
    }
    const challengeInformation = await this.challengeManager.getChallengeInformation(challengeId);
    this.matDialog.open(ChallengeDetail, {
      data: <ChallengeDetailProps> {
        challenge: challengeInformation,
        paxUser: this.user
      },
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%'
    }).afterClosed().subscribe((res) => {
      if (res) {
        this.handleChallenges(this.user!.id);
      }
    })
  }

  editAttendance(attendance: { beatdown: Beatdown, isReported: boolean, paxCount: number }) {
    this.matDialog.open(CommunityWorkoutReportComponent, {
      data: <CommunityWorkoutReportProps> {
        user: this.user,
        beatdown: attendance.beatdown,
        previouslyReportedTotalPaxCount: attendance.paxCount,
      },
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%'
    }).afterClosed().subscribe((res) => {
      if (!res) {
        return;
      } else {
        this.beatdownsRequiringAttendanceData.find(b => b.beatdown.id === attendance.beatdown.id)!.isReported = true;
        this.beatdownsRequiringAttendanceData.find(b => b.beatdown.id === attendance.beatdown.id)!.paxCount = res.totalPaxCount;
      }
    });
  }

  closeChallengeAnnouncement() {
    localStorage.setItem('showChallengeAnnouncement', 'false');
    this.showChallengeBanner = false;
  }

  isIterativeCompletionChallenge(challenge: BaseChallenge): challenge is IterativeCompletionChallenge {
    return (challenge as IterativeCompletionChallenge).activeCompletions !== undefined;
  }

  reportCommunityBeatdownAttendance(beatdown: Beatdown) {
    this.matDialog.open(CommunityWorkoutReportComponent, {
      data: <CommunityWorkoutReportProps> {
        user: this.user,
        beatdown,
      },
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%'
    }).afterClosed().subscribe((res) => {
      if (!res) {
        return;
      } else {
        this.beatdownsRequiringAttendanceData.find(b => b.beatdown.id === beatdown.id)!.isReported = true;
        this.beatdownsRequiringAttendanceData.find(b => b.beatdown.id === beatdown.id)!.paxCount = res.totalPaxCount;
      }
    });
  }    

  reportAttendance() {
    this.matDialog.open(PersonalWorkoutReportComponent, {
      data: <UserReportedWorkoutProps> {
        user: this.user,
        activeChallenges: this.activeChallenges,
      },
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%'
    }).afterClosed().subscribe((res) => {
      if (!res) {
        return;
      }
    });
  }

  async getPaxFromToday() {
    const paxList: GetNewPaxResponse[] = await this.paxManagerService.getNewPax();
    const latestPax: { id: string, f3Name: string, ehUserF3Name: string, ehLocationName: string, profilePhotoUrl: string | undefined}[] = [];
    for (let pax of paxList) {
      let paxEhUser = undefined, paxEhLocation = undefined;
      if (pax.ehByUserRef)
        paxEhUser = await this.paxManagerService.getPaxInfoByRef(pax.ehByUserRef);

      if (pax.ehLocationRef)
        paxEhLocation = await this.aoManagerService.getDataByRef(pax.ehLocationRef);

      latestPax.push({
        id: pax.id,
        f3Name: pax.f3Name,
        ehUserF3Name: paxEhUser !== undefined ? paxEhUser.f3Name : 'None',
        ehLocationName: paxEhLocation !== undefined ? paxEhLocation.name : 'Unknown',
        profilePhotoUrl: pax.profilePhotoUrl
      });
    }
    this.latestPax = latestPax;
  }

  async getWeeklyPaxWithAnniversaries() {
    const anniversaryResponse = await this.paxManagerService.getWeeklyAnniversaryPax();
    this.anniversaryStartDate = anniversaryResponse.startDate;
    this.anniversaryEndDate = anniversaryResponse.endDate;
    this.anniversaryPax = anniversaryResponse.paxList.sort((a, b) => a.anniversaryYear < b.anniversaryYear ? 1 : -1);
  }
}
