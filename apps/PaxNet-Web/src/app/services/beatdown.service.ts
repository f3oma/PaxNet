import { Injectable } from "@angular/core";
import { DocumentData, DocumentReference, Firestore, QueryCompositeFilterConstraint, QueryFieldFilterConstraint, Timestamp, addDoc, and, collection, deleteDoc, doc, getDoc, getDocs, or, orderBy, query, setDoc, where, writeBatch } from "@angular/fire/firestore";
import { BeatdownConverter } from "../utils/beatdown.converter";
import { Beatdown, IBeatdown, IBeatdownEntity, SpecialEventType } from "../models/beatdown.model";
import { AOData, IAOData } from "../models/ao.model";
import { AOManagerService } from "./ao-manager.service";
import { AoLocationRef, PaxUser } from "../models/users.model";
import { PaxManagerService } from "./pax-manager.service";
import { WorkoutManagerService } from "./workout-manager.service";
import { UserReportedWorkout } from "../models/beatdown-attendance";
import { PersonalWorkoutConverter } from "../utils/personal-workout.converter";

@Injectable({
    providedIn: 'root'
})
export class BeatdownService {

    beatdownCollection = 
        collection(this.firestore, 'beatdowns')
        .withConverter(this.beatdownConverter.getConverter())

    public EMPTY_BEATDOWN: IBeatdown = {
        id: '',
        date: new Date(),
        eventAddress: null,
        eventName: null,
        aoLocation: null,
        qUser: undefined,
        coQUser: undefined,
        additionalQs: [],
        specialEvent: SpecialEventType.None,
        canceled: false,
        startTime: '',
        notes: ''
    }

    constructor(
        private firestore: Firestore,
        private aoManagerService: AOManagerService,
        private paxManagerService: PaxManagerService,
        private beatdownConverter: BeatdownConverter,
        private workoutService: WorkoutManagerService,
        private personalWorkoutConverter: PersonalWorkoutConverter) {}

    async getBeatdownDetail(id: string): Promise<Beatdown | undefined> {
        const ref = doc(this.beatdownCollection, id);
        return (await (await getDoc(ref)).data()) as Beatdown;
    }

    async getBeatdownsBetweenDates(startDate: Date, endDate: Date, filter: QueryFieldFilterConstraint[] | QueryCompositeFilterConstraint[]): Promise<Beatdown[]> {
        const beatdowns: Promise<Beatdown>[] = [];
        const q = query(this.beatdownCollection, and(where("date", ">=", startDate), where("date", "<", endDate), ...filter), orderBy("date", "asc"));
        (await getDocs(q)).docs.forEach(async (d) => {
            beatdowns.push(d.data());
        });
        return Promise.all(beatdowns);
    }

    async getBeatdownsByAO(aoLocationRef: DocumentReference<AOData>, filters: QueryFieldFilterConstraint[]): Promise<Beatdown[]> {
        const beatdowns: Promise<Beatdown>[] = [];
        const q = query(this.beatdownCollection, and(where("aoLocationRef", "==", aoLocationRef), where("date", ">=", new Date()), ...filters), orderBy("date", "asc"));
        (await getDocs(q)).docs.forEach(async (d) => {
            beatdowns.push(d.data());
        })
        return Promise.all(beatdowns);
    }

    async getAllPreviousSiteBeatdowns(aoLocationRef: DocumentReference<AOData>, beforeDate: Date) {
        const beatdowns: Promise<Beatdown>[] = [];
        const q = query(this.beatdownCollection, and(where("aoLocationRef", "==", aoLocationRef), where("date", "<=", beforeDate)), orderBy("date", "desc"));
        (await getDocs(q)).docs.forEach(async (d) => {
            beatdowns.push(d.data());
        })
        return Promise.all(beatdowns);
    }

    async deleteAllBeatdownsForAO(siteId: string) {
        const aoRef = this.aoManagerService.getAoLocationReference(siteId);
        const q = query(this.beatdownCollection, and(where("aoLocationRef", "==", aoRef), where("date", ">=", new Date())), orderBy("date", "asc"));
        const batch = writeBatch(this.firestore);
        (await getDocs(q)).docs.forEach(async (d) => {
            batch.delete(d.ref);
        });
        return await batch.commit();
    }  

    // This might need a better name.
    // Look-up beatdowns for today by SQ and Q, ask for attendance reporting
    async getBeatdownAttendanceReportForUser(user: PaxUser | undefined, siteQLocationRef: AoLocationRef | undefined) {
        const beatdownsRequiringAttendanceData: Beatdown[] = [];
        if (!user)
            return [];

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        tomorrow.setHours(11,59,59,0);

        // We need to find out if the user is a SQ or Q for a beatdown occurring today
        // Start with SQ
        if (siteQLocationRef) {
            const beatdownsToday = await this.getBeatdownsBetweenDates(yesterday, tomorrow, [where("aoLocationRef", "==", siteQLocationRef)]);
            if (beatdownsToday && beatdownsToday.length) {
                // Attendance reporting required
                beatdownsRequiringAttendanceData.push(...beatdownsToday);
            }
        }

        // A possible scenario where the SQ is a Q at a different site that day.
        // Any Q
        const userRef = this.paxManagerService.getUserReference('users/' + user.id);
        const beatdownsTodayByQ = await this.getBeatdownsBetweenDates(yesterday, tomorrow, [or(where("qUserRef", "==", userRef), where("coQUserRef", "==", userRef))]);
        if (beatdownsTodayByQ && beatdownsTodayByQ.length) {
            // Assuming just 1 Q, filter down to single beatdown
            // This would happen if user is a SQ but also on the Q this day
            if (beatdownsRequiringAttendanceData.filter(b => b.id === beatdownsTodayByQ[0].id).length === 0)
                beatdownsRequiringAttendanceData.push(...beatdownsTodayByQ);
        }
        
        // Finally, assign beatdowns with their reported status
        const result: { beatdown: Beatdown, isReported: boolean, paxCount: number, fngCount: number }[] = [];
        for (let beatdown of beatdownsRequiringAttendanceData) {
            const attendanceData = await this.workoutService.getReportedAttendance(beatdown.id);
            let isReported = false;
            let paxCount = 0;
            let fngCount = 0;
            if (attendanceData !== null) {
                isReported = attendanceData.qReported;
                paxCount = attendanceData.totalPaxCount;
                fngCount = attendanceData.fngCount;
            }
            result.push({ beatdown, isReported, paxCount, fngCount });
        }

        return result;
    }

    // This really should be in the workout manager service but circular dependency
    public async convertToUpdatedPersonalWorkout(userId: string, workouts: UserReportedWorkout[]): Promise<void> {
        const batch = writeBatch(this.firestore);
        const userPersonalWorkoutCollection = collection(this.firestore, `users/${userId}/personal_attendance`).withConverter(this.personalWorkoutConverter.getConverter());

        for (let workout of workouts) {
            // Already updated
            if (workout.activityType) {
                continue;
            }

            if (workout.beatdown) {
                const beatdownData = await this.getBeatdownDetail(workout.beatdown.id);
                if (beatdownData) {
                    if (beatdownData.aoName.includes('DR')) {
                        workout.activityType = 'downrange';
                    } else if (beatdownData.aoName.includes('Shield Lock')) {
                        workout.activityType = 'shieldLock';
                    } else {
                        workout.activityType = 'f3Omaha';
                    }
                }
            }

            const docRef = doc(userPersonalWorkoutCollection, workout.beatdown.id);
            batch.update(docRef, {
                activityType: workout.activityType
            });
        }

        await batch.commit();
    }

    async createBeatdown(beatdown: Partial<IBeatdown>) {
        return await addDoc(this.beatdownCollection, beatdown)
    }

    async updateBeatdown(beatdown: IBeatdown) {
        const ref = doc(this.beatdownCollection, `${beatdown.id}`);
        return await setDoc(ref, beatdown, { merge: true });
    }

    async deleteBeatdown(beatdown: Beatdown) {
        return await this.deleteBeatdownById(beatdown.id);
    }

    async deleteBeatdownById(id: string) {
        const ref = doc(this.beatdownCollection, id);
        return await deleteDoc(ref);
    }

    getBeatdownReference(dbPath: string) {
        if (dbPath.includes('beatdowns')) {
            dbPath = dbPath.replace('beatdowns/', '');
        }
        return doc(this.beatdownCollection, dbPath);
    }

    public async generateDownrangeBeatdown(downrangeAOName: string, date: Date) {
        // Create a very sparse beatdown, not linked to any AO or data that is tracked in attendance reporting
        const emptyBeatdown: IBeatdown = JSON.parse(JSON.stringify(this.EMPTY_BEATDOWN));
        emptyBeatdown.eventName = `DR - ${downrangeAOName}`;
        emptyBeatdown.date = date;
        emptyBeatdown.aoName = downrangeAOName;
        return await this.createBeatdown(emptyBeatdown);
    }

    public async generateShieldLockBeatdown(date: any) {
       // Create a very sparse beatdown, not linked to any AO or data that is tracked in attendance reporting
       const emptyBeatdown: IBeatdown = JSON.parse(JSON.stringify(this.EMPTY_BEATDOWN));
       emptyBeatdown.eventName = 'Shield Lock';
       emptyBeatdown.date = date;
       emptyBeatdown.aoName = 'Shield Lock';
       return await this.createBeatdown(emptyBeatdown);
    }

    public async generateBeatdownsBetweenDates(aoData: IAOData | null, startWeek: Date, endWeek: Date) {
        // Generate weekly beatdowns for a location from start week to end week
        // If the endWeek date provided is less than the specified AO's week time, no beatdown will be created...
        if (!aoData || !aoData.weekDay) {
            throw new Error("AO Week Day is required to create scheduled beatdowns");
        }

        if (startWeek > endWeek)
            return;

        const weekDayMap = this.createDayMap();

        const startDayIdx = weekDayMap.get(aoData.weekDay);
        const batch = writeBatch(this.firestore);

        const aoRef = this.aoManagerService.getAoLocationReference('ao_data/' + aoData.id);
        const existingBeatdownDates = (await this.getBeatdownsByAO(aoRef, [])).map((v) => v.date.toDateString());

        const existingBeatdownDatesSet = new Set(existingBeatdownDates);

        startWeek.setHours(0, 0, 0);
        let currentAOBeatdownDate = new Date(startWeek.setDate(startWeek.getDate() - startWeek.getDay() + startDayIdx!));

        const nextWeek = 7;
        const beatdowns = collection(this.firestore, 'beatdowns');
        while (currentAOBeatdownDate <= endWeek) {

            // If we already have a beatdown this week, go to next week
            if (existingBeatdownDatesSet.has(currentAOBeatdownDate.toDateString())) {
                currentAOBeatdownDate = new Date(currentAOBeatdownDate.setDate(currentAOBeatdownDate.getDate() + nextWeek));
                continue;
            }

            const docRef = doc(beatdowns);
            const beatdownEntity: IBeatdownEntity = {
                date: Timestamp.fromDate(currentAOBeatdownDate),
                specialEvent: SpecialEventType.None,
                qUserRef: null,
                aoLocationRef: aoRef,
                coQUserRef: null,
                eventName: null,
                eventAddress: aoData.address,
                canceled: false,
                startTime: aoData.startTimeCST,
                notes: '',
                aoName: aoData.name
            };
            batch.set(docRef, beatdownEntity);

            currentAOBeatdownDate = new Date(currentAOBeatdownDate.setDate(currentAOBeatdownDate.getDate() + nextWeek));
        }
        await batch.commit();
    }

    private createDayMap(): Map<string, number> {
        const weekDayMap = new Map();
        weekDayMap.set('Sun', 0);
        weekDayMap.set('Mon', 1);
        weekDayMap.set('Tues', 2);
        weekDayMap.set('Wed', 3);
        weekDayMap.set('Thurs', 4);
        weekDayMap.set('Fri', 5);
        weekDayMap.set('Sat', 6);
        return weekDayMap;
    }
}