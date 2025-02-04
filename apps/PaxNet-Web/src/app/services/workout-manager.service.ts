import { Injectable, inject } from "@angular/core";
import { Firestore, collection, doc, setDoc, DocumentReference, updateDoc, arrayUnion, getDoc, increment, getDocs, query, orderBy } from "@angular/fire/firestore";
import { PersonalWorkoutConverter } from "../utils/personal-workout.converter";
import { CommunityWorkoutConverter } from "../utils/community-workout.converter";
import { IPaxUser, PaxUser } from "../models/users.model";
import { PaxModelConverter } from "../utils/pax-model.converter";
import { IBeatdownAttendance, MyTotalAttendance, UserReportedWorkout } from "../models/beatdown-attendance";
import { PreActivity } from "@shared/src/types/Workout";

@Injectable({
    providedIn: 'root'
})
export class WorkoutManagerService {
    /**
     * Two processes and two tables for workout data - Community Workout & Personal Workouts
     * 
     * First, self-reporting a workout. This records a user statistic 'Personal Workout' and marks attendance at
     * that location's 'Community Workout' for the date.
     * 
     * Second, Site-Q reported workout, or Community Workout. This records data for the entire 'Community Workout' and creates the
     * user statistic records - 'Personal Workout' for all the attending pax.
     */
    firestore: Firestore = inject(Firestore);
    communityWorkoutCollection = collection(this.firestore, 'beatdown_attendance').withConverter(this.communityWorkoutConverter.getConverter());
    paxCollection = collection(this.firestore, 'users').withConverter(this.paxUserConverter.getConverter());
    currentYear = new Date().getFullYear();

    constructor(
        private readonly personalWorkoutConverter: PersonalWorkoutConverter,
        private readonly communityWorkoutConverter: CommunityWorkoutConverter,
        private readonly paxUserConverter: PaxModelConverter) {}

    // A self reported personal workout tries to create the community workout as well as individual statistic records
    public async createPersonalReportedWorkout(workoutReport: UserReportedWorkout, user: PaxUser) {
        const currentUserRef: DocumentReference<PaxUser> = doc(this.paxCollection, user.id);
        await this.tryCreatePersonalWorkoutForUserRef(workoutReport, currentUserRef);
    }

    // If the community workout does not exist, create it. Otherwise, update it without touching other fields.
    public async createCommunityReportWithValidation(workout: Partial<IBeatdownAttendance>) {
        if (!workout.beatdown) {
            console.error("Beatdown must be provided");
            return;
        }

        if (await this.doesCommunityWorkoutExist(workout.beatdown.id)) {
            await this.updateCommunityWorkoutData(workout);
        } else {
            // We are going to create it with the given data
            await this.createOrFindCommunityWorkout({
                beatdown: workout.beatdown,
                fngCount: workout.fngCount ?? 0,
                usersAttended: workout.usersAttended ?? [],
                totalPaxCount: workout.totalPaxCount ?? 0,
                qReported: true,
            })
        }
    }

    private async createSiteQReportedWorkout(workoutReport: IBeatdownAttendance) {
        await this.createOrFindCommunityWorkout(workoutReport);
        await this.updateCommunityWorkoutData(workoutReport);
    }

    public async updateCommunityWorkoutData(workoutData: Partial<IBeatdownAttendance>) {
        if (workoutData.beatdown?.id) {
            const beatdownAttendanceRef = doc(this.communityWorkoutCollection, workoutData.beatdown.id);
            const workoutEntity: Record<string, any> = {};

            if (workoutData.fngCount) {
                workoutEntity['fngCount'] = workoutData.fngCount;
            }
            if (workoutData.totalPaxCount) {
                workoutEntity['totalPaxCount'] = workoutData.totalPaxCount;
            }
            if (workoutData.usersAttended) {
                workoutEntity['usersAttended'] = arrayUnion(...workoutData.usersAttended);
            }

            workoutEntity['qReported'] = workoutData.qReported ?? true;

            return await updateDoc(beatdownAttendanceRef, { ...workoutEntity });
        }
    }

    public async getAllBeatdownAttendanceForUser(userId: string): Promise<UserReportedWorkout[]> {
        const userPersonalWorkoutCollection = collection(this.firestore, `users/${userId}/personal_attendance`).withConverter(this.personalWorkoutConverter.getConverter());
        const q = query(userPersonalWorkoutCollection, orderBy("date", "desc"));
        const docRes = await getDocs(q);
        if (docRes.empty) {
            return [];
        }
        return docRes.docs.map(d => d.data());
    }

    public async getTotalAttendanceDataForPax(paxDataId: string): Promise<MyTotalAttendance> {
        const yearlyAttendanceCountCollection = collection(this.firestore, `users/${paxDataId}/yearly_attendance_counts`);
        const attendenceDoc = doc(yearlyAttendanceCountCollection, String(this.currentYear));
        const yearlyAttendance = await getDoc(attendenceDoc);
        if (yearlyAttendance.exists()) {
            return yearlyAttendance.data() as MyTotalAttendance;
        } else {
            return <MyTotalAttendance> {
                preactivitiesCompleted: 0,
                beatdownsAttended: 0,
                favoriteActivity: 'None'
            }
        }
      }

    public async updateFavoriteActivityForYear(paxDataId: any, favoriteActivity: string) {
        const yearlyAttendanceCountCollection = collection(this.firestore, `users/${paxDataId}/yearly_attendance_counts`);
        const attendenceDoc = doc(yearlyAttendanceCountCollection, String(this.currentYear));
        const yearlyAttendance = await getDoc(attendenceDoc);
        if (yearlyAttendance.exists()) {
            await updateDoc(attendenceDoc, {
                favoriteActivity
            });
        } 
    }

    private async tryCreatePersonalWorkoutForUserRef(workoutReport: UserReportedWorkout, userRef: DocumentReference<PaxUser>): Promise<void> {
        // Three records to add / update
        // First we need to see if the workout is already reported, create it if not.
        // If not created, we need to update the yearly attendance count for the user.
        // Finally, we need to update the community record with the user's attendance
        const userPersonalWorkoutCollection = collection(this.firestore, `users/${userRef.id}/personal_attendance`).withConverter(this.personalWorkoutConverter.getConverter());
        const yearlyAttendanceCountCollection = collection(this.firestore, `users/${userRef.id}/yearly_attendance_counts`);

        let docRef: DocumentReference<UserReportedWorkout>;
        if(workoutReport.activityType !== 'f3Omaha') {
            docRef = doc(userPersonalWorkoutCollection);
        } else {
            docRef = doc(userPersonalWorkoutCollection, workoutReport.beatdown.id);
        }

        const userPersonalWorkout = await (getDoc(docRef));
        if (userPersonalWorkout.exists()) {
            // We can just update the record, no need to update other records
            await updateDoc(docRef, {
                date: workoutReport.date,
                preActivity: workoutReport.preActivity
            });
            return;
        } else {
            // Otherwise, create the record with the data
            await setDoc(docRef, workoutReport);
        }

        // Now we need to update the user's attendance count
        const yearlyCountsRef = doc(yearlyAttendanceCountCollection, `${this.currentYear}`);
        const yearlyCountsDoc = await (getDoc(yearlyCountsRef));
        if (yearlyCountsDoc.exists()) {
            const statsToUpdate = {
                beatdownsAttended: increment(0),
                preactivitiesCompleted: increment(0),
                milesCompleted: increment(workoutReport.milesCompleted),
                preActivityMiles: increment(workoutReport.preActivityMiles),
            };
            if (workoutReport.activityType === 'f3Omaha') {
                statsToUpdate.beatdownsAttended = increment(1);
            }
            if (workoutReport.preActivity !== PreActivity.None) {
                statsToUpdate.preactivitiesCompleted = increment(1);
            }
            await updateDoc(yearlyCountsRef, statsToUpdate);
        } else {
            const defaultStats = {
                beatdownsAttended: 0,
                preactivitiesCompleted: 0,
                milesCompleted: workoutReport.milesCompleted,
                preActivityMiles: workoutReport.preActivityMiles,
            }

            if (workoutReport.activityType === 'f3Omaha') {
                defaultStats.beatdownsAttended = 1;
            }

            if (workoutReport.preActivity !== PreActivity.None) {
                defaultStats.preactivitiesCompleted = 1;
            }

            await setDoc(yearlyCountsRef, defaultStats);
        }

        if (workoutReport.activityType !== 'f3Omaha') {
            return;
        }

        // Finally, update the community record with user's attendance for today.
        // If the community beatdown is not created, this will create it so we must pass default info.
        const defaultAttendanceData: IBeatdownAttendance = {
            beatdown: workoutReport.beatdown,
            fngCount: 0,
            totalPaxCount: 0,
            usersAttended: [],
            qReported: false,
        };
        const beatdownAttendanceData = await this.createOrFindCommunityWorkout(defaultAttendanceData);
        await this.addUserToCommunityWorkoutAttendanceIfMissing(beatdownAttendanceData, userRef);
    }

    // Tries to update an existing workout or create a new workout record
    private async createOrFindCommunityWorkout(workout: IBeatdownAttendance): Promise<IBeatdownAttendance> {
        const beatdownAttendanceRef = doc(this.communityWorkoutCollection, workout.beatdown.id);
        const beatdownAttendanceEntity = (await getDoc(beatdownAttendanceRef));
        if (beatdownAttendanceEntity.exists()) {
            return beatdownAttendanceEntity.data();
        } else {
            await setDoc(beatdownAttendanceRef, workout);
            return workout;
        }
    }

    public async doesCommunityWorkoutExist(beatdownId: string): Promise<boolean> {
        const beatdownAttendanceRef = doc(this.communityWorkoutCollection, beatdownId);
        const beatdownAttendanceEntity = (await getDoc(beatdownAttendanceRef));
        if (beatdownAttendanceEntity.exists()) {
            return true;
        } else {
            return false;
        }
    }

    public async getReportedAttendance(beatdownId: string): Promise<IBeatdownAttendance | null> {
        const beatdownAttendanceRef = doc(this.communityWorkoutCollection, beatdownId);
        const beatdownAttendanceEntity = (await getDoc(beatdownAttendanceRef));
        if (beatdownAttendanceEntity.exists())
            return beatdownAttendanceEntity.data();
        else
            return null;
    }

    private async addUserToCommunityWorkoutAttendanceIfMissing(beatdownAttendance: IBeatdownAttendance, userRef: DocumentReference<PaxUser>): Promise<void> {
        const beatdownAttendanceData = await this.createOrFindCommunityWorkout(beatdownAttendance);
        if (!beatdownAttendanceData.usersAttended.includes(userRef)) {
            const beatdownAttendanceRef = doc(this.communityWorkoutCollection, beatdownAttendance.beatdown.id);
            return await updateDoc(beatdownAttendanceRef, {
                usersAttended: arrayUnion(userRef)
            });
        }
    }
}
