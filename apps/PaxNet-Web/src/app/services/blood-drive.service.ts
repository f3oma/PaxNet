import { inject, Injectable } from "@angular/core";
import { collection, CollectionReference, deleteDoc, doc, Firestore, getDoc, getDocs, query, setDoc, where } from "@angular/fire/firestore";
import { BloodDriveEntry, BloodDriveEventInformation } from "../models/blood-drive.model";
import { BloodDriveConverter } from "../utils/blood-drive.converter";
import { PaxManagerService } from "./pax-manager.service";

@Injectable({
    providedIn: 'root'
})
export class BloodDriveService {
    firestore: Firestore = inject(Firestore);
    bloodDriveCollection: CollectionReference;
    bloodDriveEventInformationCollection: CollectionReference;

    constructor(private bloodDriveConverter: BloodDriveConverter, private paxManagerService: PaxManagerService) {
        this.bloodDriveCollection = collection(this.firestore, 'blood_drive_entries').withConverter(this.bloodDriveConverter.getConverter());
        this.bloodDriveEventInformationCollection = collection(this.firestore, 'blood_drive_event_information');
    }

    async addEntry(bloodDriveEntry: BloodDriveEntry): Promise<BloodDriveEntry> {
        const docRef = doc(this.bloodDriveCollection);
        bloodDriveEntry.id = docRef.id;
        await setDoc(docRef, bloodDriveEntry);
        return bloodDriveEntry;
    }

    async removeEntry(bloodDriveEntry: BloodDriveEntry) {
        const id = bloodDriveEntry.id;
        const ref = doc(this.bloodDriveCollection, id);
        await deleteDoc(ref);
    }

    async getEntryByUser(id: string): Promise<BloodDriveEntry> {
        const userRef = this.paxManagerService.getUserReference('/users/' + id);
        const q = query(this.bloodDriveCollection, where("paxUserRef", "==", userRef))
        const docs = await getDocs(q);
        const entry = docs.docs.map((d) => {
            if (d.exists()) {
                return d.data();
            }
            return null;
        });
        return entry[0] as BloodDriveEntry;
    }

    async getAllEntriesForEvent(id: string): Promise<BloodDriveEntry[]> {
        const q = query(this.bloodDriveCollection, where("bloodDriveId", "==", id))
        const docs = await getDocs(q);
        return Promise.all(docs.docs.map(d => d.data() as BloodDriveEntry));
    }

    async getEventData(id: string): Promise<BloodDriveEventInformation> {
        const ref = doc(this.bloodDriveEventInformationCollection, id);
        const fetch = await getDoc(ref);
        if (fetch.exists())
            return fetch.data() as BloodDriveEventInformation; // Avoiding converter overhead...

        return undefined;
    }
}