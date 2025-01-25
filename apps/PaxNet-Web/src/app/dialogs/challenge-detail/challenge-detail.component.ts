import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ChallengeState, ChallengeType, IterativeCompletionChallenge } from "src/app/models/user-challenge.model";
import { PaxUser } from "src/app/models/users.model";
import { ChallengeManager } from "src/app/services/challenge-manager.service";
import { ChallengeInformation, getChallengeImageByName, IterativeCompletionRequirements } from "src/app/utils/challenges";

export interface ChallengeDetailProps {
    challenge: ChallengeInformation;
    paxUser: PaxUser;
}

@Component({
    selector: 'challenge-detail',
    templateUrl: './challenge-detail.component.html',
    styleUrls: ['./challenge-detail.component.scss']
  })
  export class ChallengeDetail {

    challenge: ChallengeInformation;
    paxUser: PaxUser;
    showCompleteMessage = false;

    constructor(    
        public challengeManager: ChallengeManager,
        public dialogRef: MatDialogRef<ChallengeDetail>,
        @Inject(MAT_DIALOG_DATA) public data: ChallengeDetailProps) {
          this.challenge = data.challenge;
          this.paxUser = data.paxUser;
    }

    get isActive(): boolean {
        if (!this.challenge) {
            return false;
        }
        const today = new Date();
        const startTime = new Date(this.challenge.startDateString);
        const endTime = new Date(this.challenge.endDateString);

        if (startTime <= today && endTime > today) {
            return true;
        }
        return false;
    }

    async joinChallenge() {
        if (this.challenge.type === ChallengeType.IterativeCompletions) {
            const completionRequirements = this.challenge.completionRequirements as IterativeCompletionRequirements;
            const iterativeChallenge: IterativeCompletionChallenge = new IterativeCompletionChallenge({
                id: '',
                paxUser: this.paxUser,
                type: this.challenge.type,
                state: ChallengeState.NotStarted,
                startDateString: this.challenge.startDateString,
                endDateString: this.challenge.endDateString,
                endDateTime: new Date(this.challenge.endDateString),
                name: this.challenge.name,
                totalToComplete: completionRequirements.totalCompletionsRequired,
                activeCompletions: 0,
                challengeInfoId: this.challenge.id!
            });
            await this.challengeManager.startChallenge(iterativeChallenge);
            this.showCompleteMessage = true;
            setTimeout(() => {
                this.dialogRef.close(true);
            }, 3000);
        }
    }

    async preRegister() {
        if (this.challenge.type === ChallengeType.IterativeCompletions) {
            const completionRequirements = this.challenge.completionRequirements as IterativeCompletionRequirements;
            const iterativeChallenge: IterativeCompletionChallenge = new IterativeCompletionChallenge({
                id: '',
                paxUser: this.paxUser,
                type: this.challenge.type,
                state: ChallengeState.PreRegistered,
                startDateString: this.challenge.startDateString,
                endDateString: this.challenge.endDateString,
                endDateTime: new Date(this.challenge.endDateString),
                name: this.challenge.name,
                totalToComplete: completionRequirements.totalCompletionsRequired,
                activeCompletions: 0,
                challengeInfoId: this.challenge.id!
            });
            await this.challengeManager.startChallenge(iterativeChallenge);
            this.showCompleteMessage = true;
            setTimeout(() => {
                this.dialogRef.close(true);
            }, 3000);
        }
    }

    userCancel() {
        this.dialogRef.close();
    }

    getChallengeImage(challenge: ChallengeInformation) {
        return getChallengeImageByName(challenge.name);
    }
}
    