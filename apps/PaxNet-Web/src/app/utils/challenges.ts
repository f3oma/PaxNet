import { BaseChallenge, ChallengeState, ChallengeType, IterativeCompletionChallenge, UserSelectedGoalChallenge } from "../models/user-challenge.model";
import { ChallengeManager } from "../services/challenge-manager.service";

export enum Challenges {
    SummerMurph2024 = "aI66pjf8m5wq5FBjGh4j",
    WinterWarrior2024 = "N7vPPQBYKo3irbzhjaHw",
    ThreeHundredChallenge = "iVJUt1cvLpE0mmigwo4s",
    PreRuckRunChallenge = "igsId7cG26YjfI8OhVre",
    BloodDriveFeb2025 = "XN4RiFoTd45CNajF9qJm",
}

export interface ICompletionRequirements {}

export interface IterativeCompletionRequirements extends ICompletionRequirements {
    totalCompletionsRequired: number;
}

// ChallengeStatus defines whether the actual challenge is in progress
export enum ChallengeStatus {
    PreRegistration = "pre-registration",
    Started = "started",
    Completed = "completed",
    Draft = "draft",
};


// private async createChallenge() {
//     const challenge: ChallengeInformation = {
//       type: ChallengeType.UserSelectedGoal,
//       status: ChallengeStatus.Draft,
//       startDateString: '02/03/2025',
//       endDateString: '03/30/2025',
//       name: Challenges.PreRuckRunChallenge,
//       description: "TODO",
//       lastDateToRegister: '03/30/2025',
//       completionRequirements: {},
//     }

//     await this.challengeManager.addNewChallenge(challenge);
//   }

// Challenge Information defines basic details about the challenge
export interface ChallengeInformation {
    id?: string; // undefined when not set yet
    description: string;
    name: Challenges;
    status: ChallengeStatus;
    type: ChallengeType;
    startDateString: string;
    endDateString: string;
    completionRequirements?: ICompletionRequirements;
    lastDateToRegister: string;
}

export type UserSelectedGoalOptions = {
    name: string;
    value: number;
}

export function getUserSelectedGoalOptionsByName(challengeId: string): UserSelectedGoalOptions[] {
    switch(challengeId) {
        case Challenges.PreRuckRunChallenge:
            return [{
                name: "Bronze - 40mi",
                value: 40,
            }, 
            {
                name: "Silver - 60mi",
                value: 60
            }, 
            {
                name: "Gold - 80mi",
                value: 80
            }];
        default:
            return [];
    }
}

export function getChallengeIdByName(challenge: Challenges): string | null  {
    switch(challenge) {
        case Challenges.SummerMurph2024:
            return "aI66pjf8m5wq5FBjGh4j";
        case Challenges.WinterWarrior2024:
            return "N7vPPQBYKo3irbzhjaHw";
        case Challenges.ThreeHundredChallenge:
            return "iVJUt1cvLpE0mmigwo4s";
        case Challenges.PreRuckRunChallenge:
            return "igsId7cG26YjfI8OhVre";
        case Challenges.BloodDriveFeb2025:
            return "XN4RiFoTd45CNajF9qJm";
        default:
            return null;
    }
}

export function getChallengeImageByName(challengeInfoId: string): string | null {
    switch(challengeInfoId) {
        case Challenges.SummerMurph2024:
            return "assets/images/challenges/murph-challenge-2024.png";
        case Challenges.WinterWarrior2024:
            return "assets/images/challenges/winter-warrior-challenge-2024.png";
        case Challenges.ThreeHundredChallenge:
            return "assets/images/challenges/three-hundred-challenge-2024.png";
        case Challenges.PreRuckRunChallenge:
            return "assets/images/challenges/the-griz-2025.png";
        case Challenges.BloodDriveFeb2025:
            return "assets/images/blood-droplet-achievement.png";
        default:
            return null;
    }
}

// Helpers
export function getChallengesEnumKeyByValue(value: string): Challenges | undefined {
    const enumKey = Object.keys(Challenges).find(key => Challenges[key as keyof typeof Challenges] === value);
    if (enumKey) {
        return Challenges[enumKey as keyof typeof Challenges];
    }
    return undefined;
}

export async function winterWarriorChallengeHelper(challenge: BaseChallenge, challengeManager: ChallengeManager) {
    if (challenge.type === ChallengeType.IterativeCompletions && 
        challenge.challengeInfoId === Challenges.WinterWarrior2024 &&
        new Date(challenge.startDateString) < new Date()) {

        const alreadyCompleted = challenge.state === ChallengeState.Completed;
        const iterativeChallenge = challenge as IterativeCompletionChallenge;

        if (iterativeChallenge.state !== ChallengeState.Completed && (iterativeChallenge.state === ChallengeState.NotStarted || iterativeChallenge.state === ChallengeState.PreRegistered))
            iterativeChallenge.updateState(ChallengeState.InProgress);

        // For this challenge, users just need to post in the winter
        // when temps are at or below 20 deg. We should check this before entering this method.
        iterativeChallenge.addNewIteration();
        
        if (iterativeChallenge.isComplete() && !alreadyCompleted) {
            await challengeManager.completeChallenge(iterativeChallenge);
        }

        await challengeManager.updateChallenge(iterativeChallenge);
    }
}

export async function preRunRuckChallengeHelper(challenge: BaseChallenge, completedTotal: number, challengeManager: ChallengeManager) {
    if (challenge.type === ChallengeType.UserSelectedGoal && challenge.challengeInfoId === Challenges.PreRuckRunChallenge && new Date(challenge.startDateString) < new Date()) {
        const userSelectedGoalChallenge = challenge as UserSelectedGoalChallenge;
        const alreadyCompleted = userSelectedGoalChallenge.state === ChallengeState.Completed;

        if (userSelectedGoalChallenge.state !== ChallengeState.Completed && (userSelectedGoalChallenge.state === ChallengeState.NotStarted || userSelectedGoalChallenge.state === ChallengeState.PreRegistered))
            userSelectedGoalChallenge.updateState(ChallengeState.InProgress);

        const newValue = Math.round((userSelectedGoalChallenge.currentValue + completedTotal) * 100) / 100;
        userSelectedGoalChallenge.updateValue(newValue);

        if (userSelectedGoalChallenge.isComplete() && !alreadyCompleted) {
            await challengeManager.completeChallenge(userSelectedGoalChallenge);
            return;
        }

        await challengeManager.updateChallenge(userSelectedGoalChallenge);
    }
}

export async function threeHundredChallengeHelper(challenge: BaseChallenge, challengeManager: ChallengeManager, numberOfCompletions: number) {
    if (challenge.type === ChallengeType.IterativeCompletions && 
        challenge.challengeInfoId === Challenges.ThreeHundredChallenge &&
        new Date(challenge.startDateString) < new Date()) {

        const iterativeChallenge = challenge as IterativeCompletionChallenge;
        if (iterativeChallenge.state === ChallengeState.NotStarted || iterativeChallenge.state === ChallengeState.PreRegistered)
            iterativeChallenge.updateState(ChallengeState.InProgress);

        // For this challenge, users report they completed an iteration (which is a single day)
        for (let i = 1; i < numberOfCompletions; i++)
            iterativeChallenge.addNewIteration();
        
        if (iterativeChallenge.isComplete()) {
            await challengeManager.completeChallenge(iterativeChallenge);
        }

        await challengeManager.updateChallenge(iterativeChallenge);
    }
}