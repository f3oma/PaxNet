import { Injectable, inject } from "@angular/core";
import { BaseChallenge, ChallengeState } from "../models/user-challenge.model";
import { UserProfileService } from "./user-profile.service";
import { DocumentData, Firestore, addDoc, and, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "@angular/fire/firestore";
import { UserChallengeConverter } from "../utils/user-challenge.converter";
import { PaxManagerService } from "./pax-manager.service";
import { ChallengeInformation, Challenges } from "../utils/challenges";
import { ChallengeInformationConverter } from "../utils/challenge-information.converter";
import { getCompletedAchievementForChallenge } from "../utils/achievements";

@Injectable({
    providedIn: 'root'
})
export class ChallengeManager {
    firestore: Firestore = inject(Firestore);
    private UserChallengeCollection = collection(this.firestore, 'user_challenges').withConverter(this.userChallengeConverter.getConverter());
    private ChallengeInformationCollection = collection(this.firestore, 'challenge_information').withConverter(this.challengeInformationConverter.getConverter());

    constructor(
        private paxManagerService: PaxManagerService,
        private userProfileService: UserProfileService,
        private userChallengeConverter: UserChallengeConverter,
        private challengeInformationConverter: ChallengeInformationConverter) {}

    // Get all challenge information for active challenges
    async getAllActiveChallenges(): Promise<ChallengeInformation[]> {
        const q = query(this.ChallengeInformationCollection, and(where("status", "in", ["pre-registration", "started"])));
        return Promise.all((await getDocs<Promise<ChallengeInformation>, DocumentData>(q)).docs.map((d) => d.data()));
    }

    // Get all challenge information for completed challenges
    async getAllCompletedChallenges(): Promise<ChallengeInformation[]> {
        const q = query(this.ChallengeInformationCollection, and(where("status", "in", ["completed"])));
        return Promise.all((await getDocs<Promise<ChallengeInformation>, DocumentData>(q)).docs.map((d) => d.data()));
    }

    // Get challenge information for single challenge
    async getChallengeInformation(challengeId: string) {
        const ref = doc(this.ChallengeInformationCollection, challengeId);
        return (await getDoc(ref)).data();
    }

    async addNewChallenge(challengeInformation: ChallengeInformation) {
        return await addDoc(this.ChallengeInformationCollection, challengeInformation);
    }

    async deleteChallenge(challengeInformation: ChallengeInformation) {
        const ref = doc(this.ChallengeInformationCollection, challengeInformation.id);
        return await deleteDoc(ref);
    }

    async updateChallengeInformation(challengeInformation: ChallengeInformation) {
        const ref = doc(this.ChallengeInformationCollection, challengeInformation.id);
        return await setDoc(ref, challengeInformation);
    }

    // Iterative challenges
    async startChallenge(challenge: BaseChallenge) {
        return await addDoc(this.UserChallengeCollection, challenge);
    }

    async updateChallenge(challenge: BaseChallenge) {
        // Update db
        const ref = doc(this.UserChallengeCollection, challenge.id);
        return await setDoc(ref, challenge);
    }

    async completeChallenge(challenge: BaseChallenge) {
        if (challenge.isComplete()) {
            challenge.updateState(ChallengeState.Completed);
            const challengeInfo = await this.getChallengeInformation(challenge.challengeInfoId);
            const achievement = getCompletedAchievementForChallenge(challengeInfo);
            if (achievement) {
                await this.userProfileService.addAchievementToProfile(achievement, challenge.paxUser.id);
            }    
        }
        return await this.updateChallenge(challenge);
    }

    async withdrawUserFromChallenge(challenge: BaseChallenge) {
        const ref = doc(this.UserChallengeCollection, challenge.id);
        return await deleteDoc(ref);
    }

    async getActiveChallengesForUser(userId: string) {
        const userRef = this.paxManagerService.getUserReference('users/' + userId);
        const q = query(this.UserChallengeCollection, and(where("paxUserRef", "==", userRef), where("state", "not-in", ["failed"]), where("endDateTime", ">=", new Date())));
        const docs = Promise.all((await getDocs<Promise<BaseChallenge>, DocumentData>(q)).docs.map((d) => d.data()));
        return docs;
    }

    async getAllChallengeParticipants(challengeId: string): Promise<BaseChallenge[]> {
        const q = query(this.UserChallengeCollection, and(where("challengeInfoId", "==", challengeId)));
        const docs = Promise.all((await getDocs<Promise<BaseChallenge>, DocumentData>(q)).docs.map((d) => d.data()));
        return docs;
    }

    async getUserChallengeData(name: Challenges, userId: string): Promise<BaseChallenge | undefined> {
        const userRef = this.paxManagerService.getUserReference('users/' + userId);
        const q = query(this.UserChallengeCollection, and(where("name", "==", name.toString()), where("paxUserRef", "==", userRef)));
        const docs = await (await getDocs<Promise<BaseChallenge>, DocumentData>(q)).docs.map((d) => d.data())
        if (docs && docs.length === 1) {
            return docs[0];
        }
        return undefined;
    }
}