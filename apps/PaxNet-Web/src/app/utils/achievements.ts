import { Achievement } from "../models/user-profile-data.model";
import { ChallengeInformation, Challenges } from "./challenges";

export function getCompletedAchievementForChallenge(challengeInfo: ChallengeInformation): Achievement | undefined {
    var completedDate = formatDate(new Date());
    return {
        name: challengeInfo.name,
        dateCompleted: completedDate,
        text: challengeInfo.name,
        challengeInfoId: challengeInfo.id!              
    };
}

function formatDate(date: Date): string {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
        .getDate()
        .toString()
        .padStart(2, '0')}/${date.getFullYear()}`;
}