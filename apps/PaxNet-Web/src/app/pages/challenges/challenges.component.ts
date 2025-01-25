import { Component } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser, UserRole } from 'src/app/models/authenticated-user.model';
import { BaseChallenge, BestAttemptChallenge,IterativeCompletionChallenge, UserSelectedGoalChallenge } from 'src/app/models/user-challenge.model';
import { PaxUser } from 'src/app/models/users.model';
import { ChallengeManager } from 'src/app/services/challenge-manager.service';
import { PaxManagerService } from 'src/app/services/pax-manager.service';
import { UserAuthenticationService } from 'src/app/services/user-authentication.service';
import { ChallengeInformation, getChallengeImageByName } from 'src/app/utils/challenges';

@Component({
  selector: 'app-challenges',
  templateUrl: './challenges.component.html',
  styleUrls: ['./challenges.component.scss']
})
export class ChallengesComponent {
  public authUserData$: Observable<AuthenticatedUser | undefined>;
  public activeUserChallenges: BaseChallenge[] = [];
  public activeChallenges: ChallengeInformation[] = [];
  public completedChallenges: ChallengeInformation[] = [];
  public loading = true;
  public isAdmin = false;
  
  private paxUser: PaxUser | undefined = undefined;
  private activeUserChallengesSet: Set<string> = new Set();

  constructor(private challengeManager: ChallengeManager,
    private userAuthService: UserAuthenticationService,
    private paxManagerService: PaxManagerService,) {
      this.authUserData$ = this.userAuthService.authUserData$.pipe(
        tap(async (data) => {
            const paxDataId = data?.paxDataId;
            if (paxDataId && paxDataId !== undefined) {
                await this.getPaxUserData(paxDataId);
                if (data.roles.includes(UserRole.Admin)) {
                  this.isAdmin = true;
                }
            }
        })
      );
    }

    async getPaxUserData(id: string) {
      this.paxUser = await (await this.paxManagerService.getDataByAuthId(id)).data();
      this.activeUserChallenges = await this.challengeManager.getActiveChallengesForUser(id);

      // TODO: For any and all new challenges, this must use a linked ID
      this.activeUserChallengesSet = new Set(this.activeUserChallenges.map((c) => c.challengeInfoId));
      await this.getActiveChallenges();
      await this.getCompletedChallenges();
      this.loading = false;
    }

    async getActiveChallenges() {
      this.activeChallenges = await this.challengeManager.getAllActiveChallenges();
    }

    async getCompletedChallenges() {
      this.completedChallenges = await this.challengeManager.getAllCompletedChallenges();
    }
    
    isIterativeCompletionChallenge(challenge: BaseChallenge): challenge is IterativeCompletionChallenge {
      return (challenge as IterativeCompletionChallenge).activeCompletions !== undefined;
    }

    isBestAttemptChallenge(challenge: BaseChallenge): challenge is BestAttemptChallenge {
      return (challenge as BestAttemptChallenge)?.bestAttempt !== undefined;
    }

    isUserSelectedGoalChallenge(challenge: BaseChallenge): challenge is UserSelectedGoalChallenge {
      return (challenge as UserSelectedGoalChallenge)?.goal !== undefined;
    }

    userIsCommittedToChallenge(challenge: ChallengeInformation) {
      return this.activeUserChallengesSet.has(challenge.id);
    }

    getChallengeImageSrc(challenge: ChallengeInformation) {
      return getChallengeImageByName(challenge.id);
    }
}
