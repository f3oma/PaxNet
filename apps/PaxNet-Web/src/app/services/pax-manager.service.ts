import { Injectable, inject } from "@angular/core";
import { addDoc, doc, Firestore, setDoc, getDoc, CollectionReference, DocumentData, DocumentReference, DocumentSnapshot, getCountFromServer, query, deleteDoc, updateDoc, where, getDocs, or, Timestamp, and, orderBy, collection, QueryCompositeFilterConstraint } from "@angular/fire/firestore";
import { AoLocationRef, UserRef, IPaxUser, PaxUser, NotificationFrequency } from "../models/users.model";
import { PaxModelConverter } from "../utils/pax-model.converter";
import { AOData } from "../models/ao.model";
import { AODataConverter } from "../utils/ao-data.converter";

export interface AnniversaryResponse {
    startDate: Date,
    endDate: Date,
    paxList: AnniversaryResponsePax[]
}

export interface GetNewPaxResponse { 
  id: string, 
  f3Name: string, 
  ehByUserRef: UserRef, 
  ehLocationRef: AoLocationRef,
  profilePhotoUrl: string | undefined,
}

export interface AnniversaryResponsePax { 
  id: string, 
  f3Name: string, 
  fullName: string, 
  anniversaryYear: number, 
  joinDate: Date,
  profilePhotoUrl: string | undefined;
}

@Injectable({
  providedIn: 'root'
})
export class PaxManagerService {
  firestore: Firestore = inject(Firestore);

  constructor(
    private paxModelConverter: PaxModelConverter,
    private locationModelConverter: AODataConverter) { 
  }

  private get paxConverter() {
    return this.paxModelConverter.getConverter();
  }

  public async addNewUser(user: Partial<IPaxUser>): Promise<DocumentReference<DocumentData>> {
    const userCollection: CollectionReference = collection(this.firestore, 'users').withConverter(this.paxConverter);
    const newDoc = await addDoc(userCollection, user);
    await this.refreshNewUsers();
    return newDoc;    
  }

  public async refreshNewUsers(): Promise<void> {
    const today = new Date();
    const dailyNewPaxString = this.toStorableString(today) + "-dailynewpax";
    const dailyNewPaxDocRef = doc(this.firestore, 'dailynewpax_cache/' + dailyNewPaxString);
    const dailyNewPaxDoc = (await getDoc(dailyNewPaxDocRef));
    if (dailyNewPaxDoc.exists())
      return await deleteDoc(dailyNewPaxDocRef);
    else
      await this.getNewPax();
      return;
  }
  
  public async getPaxInfoByRef(ref: UserRef) {
    if (ref === null) {
      return;
    }
    const documentReference = ref.withConverter(this.paxConverter);
    return (await getDoc(documentReference)).data();
  }

  // Stores paxCount in localStorage to reduce number of fetches per client.
  // This is data is used on most profiles, makes it faster than querying db every load
  public async getCachedCurrentNumberOfPax(): Promise<number> {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);

    const exisingPaxCountRefresh = localStorage.getItem('paxCountRefreshDate');
    const exisingPaxCount = localStorage.getItem('paxCount');
    if (exisingPaxCountRefresh && exisingPaxCount && new Date(exisingPaxCountRefresh) > yesterday) {
      return Number(exisingPaxCount);
    } else {
      const count = await this.getPaxCount();
      localStorage.setItem('paxCount', count.toString());
      localStorage.setItem('paxCountRefreshDate', today.toDateString());
      return count;
    }
  }

  public async getPaxCount() {
    const userCollection: CollectionReference = collection(this.firestore, 'users');
    const q = query(userCollection);
    const count = (await getCountFromServer(q)).data().count;
    return count;
  }

  public async updateUser(user: Partial<PaxUser>) {
    const documentReference = doc(this.firestore, 'users', user.id!).withConverter(this.paxConverter);
    return await setDoc(documentReference, user, { merge: true });
  }

  public async updateProfileImage(id: string, profileUrl: string) {
    const documentReference = doc(this.firestore, 'users', id).withConverter(this.paxConverter);
    return await updateDoc(documentReference, {
      profilePhotoUrl: profileUrl 
    });
  }

  public async getDataByAuthId(userId: string): Promise<DocumentSnapshot<PaxUser>> {
    const documentReference = doc(this.firestore, 'users', userId).withConverter(this.paxConverter);
    return await getDoc(documentReference);
  }

  public async deleteUser(user: IPaxUser) {
    const ref = doc(this.firestore, 'users', user.id!);
    return await deleteDoc(ref);
  }

  public getUserReference(databaseLocation: string): UserRef {
    if (databaseLocation) {
      return doc(this.firestore, databaseLocation).withConverter(this.paxConverter);
    }
    return null;
  }

  public async updateSiteQUserLocation(aoRef: DocumentReference<AOData>, userRef: DocumentReference<PaxUser>) {
    return await updateDoc(userRef, {
      siteQLocationRef: aoRef
    })
  }

  public async removeSiteQUserLocation(userId: string) {
    const userRef = this.getUserReference('users/' + userId) as DocumentReference<DocumentData>;
    return await updateDoc(userRef, {
      siteQLocationRef: null
    })
  }

  public async unsubscribeEmailsForUser(id: string) {
    const userRef = this.getUserReference('users/' + id) as DocumentReference<DocumentData>;
    return await updateDoc(userRef, {
      notificationFrequency: NotificationFrequency.None
    });
  }

  // Gets all New Pax for last 2 days
  // It will check if it's already been generated by someone else in the db cache and will return that data if yes
  // If not, it will calculate the pax for everyone and return the data
  public async getNewPax(): Promise<GetNewPaxResponse[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);

    const dailyNewPaxString = this.toStorableString(today) + "-dailynewpax";
    const dailyNewPaxDocRef = doc(this.firestore, 'dailynewpax_cache/' + dailyNewPaxString);
    const dailyNewPaxDoc = (await getDoc(dailyNewPaxDocRef));
    const users: any[] = [];
    let parsed;
    if (dailyNewPaxDoc.exists()) {
      const data = dailyNewPaxDoc.data();
      const jsonString = data['jsonString'];
      parsed = JSON.parse(jsonString);
    } else {
      const dailyNewPax = await this.getNewPaxForDays(2);
      const dailyNewPaxStringed = JSON.stringify(dailyNewPax);
      await setDoc(dailyNewPaxDocRef, { jsonString: dailyNewPaxStringed });
      parsed = dailyNewPax;
    }

    for (let pax of parsed) {
      let ehByUserRef: UserRef = null, ehLocationRef: AoLocationRef = null;
      if (pax.ehByUserRefPath) {
        ehByUserRef = this.getUserReference(pax.ehByUserRefPath);
      }
      if (pax.ehLocationRefPath) {
        ehLocationRef = this.getLocationReference(pax.ehLocationRefPath);
      }
      users.push({
        id: pax.id,
        f3Name: pax.f3Name,
        ehByUserRef: ehByUserRef,
        ehLocationRef: ehLocationRef,
        profilePhotoUrl: pax.profilePhotoUrl,
      });
    }
    return users;
  }

  private toStorableString(date: Date) {
    return `${date.getMonth() + 1}-${date.getDate() + 1}-${date.getFullYear()}`;
  }

  // Only Refs
  public async getAllEHRefsForUserId(userId: string): Promise<DocumentReference<DocumentData>[]> {
    const userCollection: CollectionReference = collection(this.firestore, 'users').withConverter(this.paxConverter);
    const userRef = doc(userCollection, userId);
    const q = (await query(userCollection, where("ehByUserRef", "==", userRef)));
    return (await getDocs(q)).docs.map((d) => d.ref);
  }

  // Actual Data Reads...
  public async getAllEHDataForUserId(userId: string): Promise<PaxUser[]> {
    const userCollection: CollectionReference = collection(this.firestore, 'users').withConverter(this.paxConverter);
    const userRef = doc(userCollection, userId);
    const q = (await query(userCollection, where("ehByUserRef", "==", userRef)));
    return (await getDocs(q)).docs.map((d) => d.data() as PaxUser);
  }  

  // Weekly Anniversaries for the week
  // It will check if it's already been generated by someone else in the db cache and will return that data if yes
  // If not, it will calculate the weekly anniversaries for everyone and return the data
  public async getWeeklyAnniversaryPax(): Promise<AnniversaryResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDay = today.getDate() - today.getDay();
    const weekStartDate = new Date(today.setDate(firstDay));
    const weekEndDate = new Date(today.setDate(weekStartDate.getDate()+6));

    const anniversaryString = this.toStorableString(weekStartDate) + "-anniversaries";
    const weeklyAnniversaryDocRef = doc(this.firestore, 'anniversaries_cache/' + anniversaryString);
    const weeklyAnniversaryDoc = (await getDoc(weeklyAnniversaryDocRef));
    if (weeklyAnniversaryDoc.exists()) {
      const data = weeklyAnniversaryDoc.data();
      const jsonString = data['jsonString'];
      return JSON.parse(jsonString);
    } else {
      console.log("HERE");
      const anniversaries = await this.calculateAnniversaries(weekStartDate, weekEndDate);
      const anniversariesStringed = JSON.stringify(anniversaries);
      await setDoc(weeklyAnniversaryDocRef, { jsonString: anniversariesStringed });
      localStorage.setItem('weeklyAnniversaryPax', anniversariesStringed );
      localStorage.setItem('weeklyAnniversaryRefreshDate', weekEndDate.toDateString());
      return anniversaries;
    }
  }

  private async getNewPaxForDays(days: number) {
    var daysOut = new Date();
    daysOut.setDate(daysOut.getDate() - days);
    const userCollection: CollectionReference = collection(this.firestore, 'users').withConverter(this.paxConverter);
    const q = query(userCollection, where("joinDate", ">", daysOut));
    const paxUsers: { id: string, f3Name: string, ehByUserRef: UserRef, ehLocationRef: AoLocationRef, profilePhotoUrl: string | undefined }[] = (await getDocs(q)).docs
      .map((doc) => doc.data() as PaxUser)
      .map((p) => {
        return {
          id: p.id,
          f3Name: p.f3Name,
          ehByUserRef: p.ehByUserRef,
          ehLocationRef: p.ehLocationRef,
          profilePhotoUrl: p.profilePhotoUrl,
        }
      });
    const cachedPaxUsers = paxUsers.map((p) => {
      return { id: p.id, f3Name: p.f3Name, ehByUserRefPath: p.ehByUserRef?.path, ehLocationRefPath: p.ehLocationRef?.path, profilePhotoUrl: p.profilePhotoUrl };
    })
    return cachedPaxUsers;
  }

  private async calculateAnniversaries(weekStartDate: Date, weekEndDate: Date): Promise<AnniversaryResponse> {
    const dates = this.getAnniversaryDates(weekStartDate);
    const userCollection: CollectionReference = collection(this.firestore, 'users').withConverter(this.paxConverter);
    let queryFilter1: QueryCompositeFilterConstraint[] = [];
    let queryFilter2: QueryCompositeFilterConstraint[] = [];
    for (let date of dates) {
      const statement = and(where("joinDate", ">=", date.startTime), where("joinDate", "<", date.endTime));
      if (queryFilter1.length < 24) {
        queryFilter1.push(statement)
      } else {
        queryFilter2.push(statement);
      }
    }

    // Need to split the queries into two due to number of queryFilters.
    const q1 = query(userCollection, or(...queryFilter1), orderBy("joinDate", "asc"));
    const q2 = query(userCollection, or(...queryFilter2), orderBy("joinDate", "asc"));

    const promise = await Promise.all([await getDocs(q1), await getDocs(q2)]);
    const paxList = [...promise[0].docs, ...promise[1].docs]
      .map((doc) => {
        return doc.data() as PaxUser
      })
      .map((p) => {
        const todayYear = new Date().getFullYear();
        const anniversaryDate = dates.find((d) => d.startTime.getDay() === p.joinDate.getDay() && d.startTime.getFullYear() === p.joinDate.getFullYear());
        const anniversaryYear = todayYear - anniversaryDate!.startTime.getFullYear();
        return {
          id: p.id,
          f3Name: p.f3Name,
          fullName: `${p.firstName} ${p.lastName}`, 
          anniversaryYear,
          joinDate: p.joinDate,
          profilePhotoUrl: p.profilePhotoUrl,
        }
      });
    const response = {
      startDate: weekStartDate,
      endDate: weekEndDate,
      paxList
    };
    return response;
  }

  private getAnniversaryDates(weekStartDate: Date): { startTime: Date, endTime: Date }[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date();
      nextDay.setDate(weekStartDate.getDate() + i);
      dates.push(nextDay);
    } 
    const anniversaryDates: { startTime: Date, endTime: Date}[] = [];
    for (let date of dates) {
      for (let i = 1; i < 7; i++) {
        const todayYear = date.getFullYear();
        const anniYearStart = new Date(date);
        const anniYearEnd = new Date(date);
        anniYearStart.setFullYear(todayYear - i);
        anniYearStart.setHours(0, 0, 0, 0);
        anniYearEnd.setFullYear(todayYear - i);
        anniYearEnd.setHours(11, 59, 59, 0);
        const timestampStart = anniYearStart;
        const timestampEnd = anniYearEnd;
        anniversaryDates.push({ startTime: timestampStart, endTime: timestampEnd });
      }
    }
    return anniversaryDates;
  }

  private getLocationReference(aoDBPath: string) {
    return doc(this.firestore, aoDBPath) as AoLocationRef;
  }
}
