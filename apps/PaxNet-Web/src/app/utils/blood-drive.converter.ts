import { Injectable, inject } from "@angular/core";
import { DocumentData, Firestore, FirestoreDataConverter, getDoc, QueryDocumentSnapshot } from "@angular/fire/firestore";
import { PaxManagerService } from "../services/pax-manager.service";
import { PaxModelConverter } from "./pax-model.converter";
import { BloodDriveEntry, BloodDriveEntryEntity } from "../models/blood-drive.model";
import { PaxUser } from "../models/users.model";

@Injectable({
    providedIn: 'root'
})
export class BloodDriveConverter {
    
    firestore: Firestore = inject(Firestore);
    constructor(
        private paxManagerService: PaxManagerService,
        private paxModelConverter: PaxModelConverter) {}

    public getConverter(): FirestoreDataConverter<any> {
        const toDomain = this.toDomain;
        const toEntity = this.toEntity;
        const paxModelConverter = this.paxModelConverter;
        const paxManagementService = this.paxManagerService;
        return {
          toFirestore: (data: BloodDriveEntry): DocumentData => {
            return toEntity(data, paxManagementService);
          },
          fromFirestore(snap: QueryDocumentSnapshot) {
            return toDomain(snap.data() as BloodDriveEntryEntity, snap.id, paxModelConverter);
          }
        }
    }

    private toEntity(data: BloodDriveEntry, paxManagerService: PaxManagerService): DocumentData {
        const userRef = paxManagerService.getUserReference('users/' + data.paxUser.id);
        let entity: BloodDriveEntryEntity = {
            paxUserRef: userRef,
            timeslot: data.timeslot,
            bloodDriveId: data.bloodDriveId,
        };

        return entity;
    }

    private async toDomain(data: BloodDriveEntryEntity, id: string, paxModelConverter: PaxModelConverter) {
        const paxUser = (await getDoc(data.paxUserRef!.withConverter(paxModelConverter.getConverter()))).data() as PaxUser;
        return {
            id,
            paxUser,
            timeslot: data.timeslot,
            bloodDriveId: data.bloodDriveId,
        };
    }
}