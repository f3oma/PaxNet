import { Injectable, inject } from "@angular/core";
import { CollectionReference, DocumentData, DocumentReference, Firestore, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, deleteField, setDoc, updateDoc } from "@angular/fire/firestore";
import { PaxUser } from "../models/users.model";
import { Achievement, Badge, IUserProfileDataEntity, UserProfileData } from "../models/user-profile-data.model";
import { PaxManagerService } from "./pax-manager.service";
import { PaxModelConverter } from "../utils/pax-model.converter";
import { Badges, getBadgeDetail } from "../utils/badges";
import { Storage, getDownloadURL, ref, uploadBytes } from "@angular/fire/storage";
import { Challenges } from "../utils/challenges";

@Injectable({
    providedIn: 'root'
})
export class UserProfileService {
    firestore: Firestore = inject(Firestore);
    storage: Storage = inject(Storage);

    private userProfileCollection: CollectionReference = collection(this.firestore, 'user_profile_data');
    private readonly defaultProfileData: UserProfileData = {
        links: {},
        badges: [],
        countOfEHUsers: 0,
        ehUsers: [],
        achievements: [],
    }

    constructor(
        private paxManagerService: PaxManagerService,
        private paxConverter: PaxModelConverter) {
    }

    async getOrCreateUserProfileById(id: string): Promise<UserProfileData | null> {
        const userProfile = await this.getProfileByUserId(id);
        if (userProfile !== null) {
            return userProfile;
        } else {
            await this.createProfileData(id, this.defaultProfileData);
            return await this.getProfileByUserId(id);
        }
    }

    private async getProfileByUserId(userId: string) {
        const docRef = doc(this.userProfileCollection, userId);
        let getDocResponse = (await getDoc(docRef));
        if (getDocResponse.exists()) {
            let entity = getDocResponse.data() as IUserProfileDataEntity;
            
            // Quickly update the details before returning
            if (entity.countOfEHUsers > 0 && (!entity.ehUserJsonString || entity.ehUserJsonString.length === 0)) {
                await this.updateUsersEHTree(userId);
                getDocResponse = (await getDoc(docRef))
                entity = getDocResponse.data() as IUserProfileDataEntity;
            }

            const users = entity.ehUserJsonString ? JSON.parse(entity.ehUserJsonString) : [];
            let profileData: UserProfileData = {
                badges: entity.badges,
                countOfEHUsers: entity.countOfEHUsers,
                links: entity.links,
                ehUsers: users,
                achievements: entity.achievements ?? []
            };
            return profileData;
        } else {
            return null;
        }
    }

    private async getUsersFromRefs(userRefs: DocumentReference<DocumentData>[]) {
        const users: PaxUser[] = [];
        if (!userRefs || userRefs.length === 0) {
            return users;
        }
        for (let user of userRefs) {
            const data = (await getDoc(user.withConverter(this.paxConverter.getConverter()))).data() as PaxUser;
            users.push(data);
        }
        return users;
    }

    async uploadProfileImage(image: any, id: string): Promise<string> {
        const path = `images/profiles/${id}`;
        const storage = new Storage(this.storage);
        const storageRef = ref(storage, path);
        const metadata = {
            contentType: 'image/jpeg'
        };
        await uploadBytes(storageRef, image, metadata);
        return await getDownloadURL(storageRef);
    }

    public async createProfileData(userId: string, profileData: UserProfileData) {
        const createReference = doc(this.userProfileCollection, userId);
        let profileDataEntity: Partial<IUserProfileDataEntity> = {
            badges: profileData.badges,
            links: profileData.links,
        };
        const pax = await this.paxManagerService.getAllEHDataForUserId(userId);
        const paxData: { id: string, f3Name: string }[] = pax.map((p) => { return { id: p.id, f3Name: p.f3Name} });
        profileDataEntity.countOfEHUsers = pax.length;
        profileDataEntity.ehUserJsonString = JSON.stringify(paxData);
        return await setDoc(createReference, profileDataEntity);
    }

    public getUserProfileRefById(userId: string) {
        const ref = doc(this.userProfileCollection, userId);
        return ref;
    }

    public async updateUsersEHTree(userId: string): Promise<void> {
        const userProfileRef = await this.getUserProfileRefById(userId);
        const pax = await this.paxManagerService.getAllEHDataForUserId(userId);
        const paxData: { id: string, f3Name: string }[] = pax.map((p) => { return { id: p.id, f3Name: p.f3Name} });
        await updateDoc(userProfileRef, {
            countOfEHUsers: pax.length,
            ehUserJsonString: JSON.stringify(paxData)
        });
    }

    public async updateUserProfile(userId: string, profileData: Partial<UserProfileData> | null): Promise<void> {
        if (!profileData) {
            return;
        }

        let profileDataEntity: Partial<IUserProfileDataEntity> = {
            badges: profileData.badges,
            links: profileData.links,
            achievements: profileData.achievements,
        };

        await this.updateUsersEHTree(userId);
        
        const docRef = doc(this.userProfileCollection, userId);
        return await updateDoc(docRef, {
            ...profileDataEntity
        });
    }

    async cleanUpDuplicateAchievements(userId: string, achievements: Achievement[]) {
        // Given a list of achievements from the user profile, remove any duplicates based on the challengeInfoId
        // and update the profile with the new list
        const uniqueAchievements: Achievement[] = [];
        for (let achievement of achievements) {
            if (uniqueAchievements.find(a => a.challengeInfoId === achievement.challengeInfoId)) {
                continue;
            }
            uniqueAchievements.push(achievement);
        }

        const docRef = doc(this.userProfileCollection, userId);
        return await updateDoc(docRef, {
            achievements: uniqueAchievements
        });
    }

    async updateAchievementFormat(achievement: Achievement, userId: string) {
        if (achievement.challengeInfoId) {
            return;
        }

        const docRef = doc(this.userProfileCollection, userId);
        await updateDoc(docRef, {
            achievements: arrayRemove(achievement)
        });

        // Field is removed
        if (achievement.imageSrc)
        {
            delete achievement.imageSrc;
        }

        if (achievement.text == "Summer Murph Challenge - 2024") {
            achievement.challengeInfoId = "aI66pjf8m5wq5FBjGh4j";
        } else if (achievement.text === "Winter Warrior Challenge - 2024") {
            achievement.challengeInfoId = "N7vPPQBYKo3irbzhjaHw";
        } else if (achievement.text === "300x300 Challenge - 2024") {
            achievement.challengeInfoId = "iVJUt1cvLpE0mmigwo4s";
        }

        // Add it back...
        await this.addAchievementToProfile(achievement, userId);
    }

    public async deleteUserProfile(userId: string) {
        const docRef = doc(this.userProfileCollection, userId);
        return await deleteDoc(docRef);
    }

    public async addAchievementToProfile(achievement: Achievement, userId: string) {
        await this.getOrCreateUserProfileById(userId);
        const docRef = doc(this.userProfileCollection, userId);
        return await updateDoc(docRef, {
            achievements: arrayUnion(achievement)
        });
    }

    public async addBadgeToProfile(badgeName: Badges, userId: string) {
        const badge = getBadgeDetail(badgeName);
        await this.addBadgeToProfileInternal(badge, userId);
    }

    public async addBadgeToProfileInternal(badge: Badge | undefined, userId: string) {
        await this.getOrCreateUserProfileById(userId);
        const docRef = doc(this.userProfileCollection, userId);
        return await updateDoc(docRef, {
            badges: arrayUnion(badge)
        });
    }

    public async removeBadgeFromProfile(badgeName: Badges, userId: string) {
        const badge = getBadgeDetail(badgeName);
        await this.removeBadgeFromProfileInternal(badge, userId);
    }

    public async removeBadgeFromProfileInternal(badge: Badge | undefined, userId: string) {
        await this.getOrCreateUserProfileById(userId);
        const docRef = doc(this.userProfileCollection, userId);
        return await updateDoc(docRef, {
            badges: arrayRemove(badge)
        });
    }
}