import { PaxUser, UserRef } from "./users.model"

// This could be made generic for sign-up type purposes, but building specific for now.

export type BloodDriveEntry = {
    id: string;
    paxUser: PaxUser;
    timeslot: string;
    bloodDriveId: string;
    bleedTime?: string; // Undefined until set by user
}

export type BloodDriveEntryEntity = {
    paxUserRef: UserRef;
    timeslot: string;
    bloodDriveId: string;
    bleedTime?: string; // Undefined until set by user
}

export type BloodDriveEventInformation = {
    id?: string;
    lastDateToRegister: string;
    name: string;
    description: string;
    eventHost: string;
    address: string;
    eventDate: string;
}