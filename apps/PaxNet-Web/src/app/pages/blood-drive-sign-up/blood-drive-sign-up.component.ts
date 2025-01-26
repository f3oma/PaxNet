import { Component, ElementRef, ViewChild } from "@angular/core";
import { ChallengeManager } from "../../services/challenge-manager.service";
import { UserAuthenticationService } from "../../services/user-authentication.service";
import { AuthenticatedUser } from "../../models/authenticated-user.model";
import { Observable, tap } from "rxjs";
import { PaxManagerService } from "../../services/pax-manager.service";
import { PaxUser } from "../../models/users.model";
import { MatSort } from "@angular/material/sort";
import { BloodDriveService } from "../../services/blood-drive.service";
import { ActivatedRoute } from "@angular/router";
import { BloodDriveEntry } from "../../models/blood-drive.model";
import { Location } from "@angular/common";
import { FormControl, Validators } from "@angular/forms";
import moment from "moment";
import { fadeIn, fadeOut } from 'src/app/utils/animations';
import { trigger, transition, useAnimation } from "@angular/animations";
import * as XLSX from 'xlsx';

@Component({
    selector: 'blood-drive-sign-up',
    templateUrl: './blood-drive-sign-up.component.html',
    styleUrls: ['./blood-drive-sign-up.component.scss'],
    animations: [
        trigger("fadeInOut", [
            transition("void => *", [useAnimation(fadeIn)]),
            transition("* => void", [useAnimation(fadeOut)]),
        ])
    ]
})
export class BloodDriveSignUpComponent {
    public authUserData$: Observable<AuthenticatedUser | undefined>;
    private paxUser: PaxUser | undefined = undefined;
    public loading = true;
    public tableData: ({
        user: PaxUser;
        timeslot: string;
    } | {
        user: null;
        timeslot: string;
    })[] = []; // Should be blood drive sign up data
    @ViewChild(MatSort) sort!: MatSort;
    public userEntry: BloodDriveEntry;
    public showEventNotFound: boolean = false;
    displayedColumns: string[] = ['timeslot', 'firstName', 'lastName', 'f3Name', 'phoneNumber'];
    allEntries: BloodDriveEntry[];
    eventInformation: any;

    timeslotControl = new FormControl<string | null>(null, Validators.required);
    availableTimeslots: string[] = [];

    @ViewChild('TABLE', {static: false, read: ElementRef }) table: ElementRef;

    constructor(
        private challengeManager: ChallengeManager,
        private userAuthService: UserAuthenticationService,
        private paxManagerService: PaxManagerService,
        private bloodDriveService: BloodDriveService,
        private route: ActivatedRoute,
        private location: Location
    ) {
        this.authUserData$ = this.userAuthService.authUserData$.pipe(
            tap(async (data: any) => {
                const paxDataId = data?.paxDataId;
                if (paxDataId && paxDataId !== undefined) {
                    await this.getPaxUserData(paxDataId);
                }
            })
        );
    }

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        await this.getEventInformation(id);
    }

    canJoinEvent(): boolean {
        if (this.eventInformation) {
            if (new Date() < new Date(this.eventInformation.lastDateToRegister)) {
                return true;
            }
        }
        return false;
    }

    async getPaxUserData(id: string) {
        this.paxUser = await (await this.paxManagerService.getDataByAuthId(id)).data();
        if (this.paxUser) {
            this.userEntry = await this.bloodDriveService.getEntryByUser(this.paxUser!.id);
        }
    }

    private get timeSlotMaxSlotsMap() {
        const limit: Record<string, number> = {
            '6:30': 2,
            '6:45': 2,
            '7:00': 2,
            '7:15': 2,
            '7:30': 2,
            '7:45': 2,
            '8:00': 2,
            '8:15': 2,
            '8:30': 2,
            '8:45': 2,
            '9:00': 2,
            '9:15': 2,
            '9:30': 1,
            '9:45': 2,
            '10:00': 1,
            '10:15': 2,
            '10:30': 1,
            '10:45': 1,
            '11:00': 1,
            '11:15': 1,
            '11:30': 2,
            '11:45': 1,
            '12:00': 2,
            '12:15': 1,
            '12:30': 1,
        };
        return limit;
    }

    async getEventInformation(id: string | null) {
        this.loading = true;
        if (!id) {
            this.loading = false;
            this.showEventNotFound = true;
            return;
        }

        this.eventInformation = await this.bloodDriveService.getEventData(id);
        this.allEntries = await this.bloodDriveService.getAllEntriesForEvent(id);
        var tableData: ({
            user: PaxUser;
            timeslot: string;
        } | {
            user: null;
            timeslot: string;
        })[] = Object.entries(this.timeSlotMaxSlotsMap).flatMap(([time, maxSlots]) => {
            // Get users signed up for this time
            const takenSlots = this.allEntries
                .filter(entry => entry.timeslot === time)
                .map(entry => entry.paxUser);

            // Calculate empty slots based on the max slots for this time
            const emptySlots = Array.from({ length: maxSlots - takenSlots.length }, () => ({
                user: null
            }));


            // Combine taken and empty slots
            return [...takenSlots.map(user => ({ user, timeslot: time })), ...emptySlots.map(() => ({ user: null, timeslot: time }))];
        });
        this.tableData = tableData;
        this.filterAndSortAvailableTimes(tableData);
        this.loading = false;
    }

    filterAndSortAvailableTimes(fullTimeslotData: ({
        user: PaxUser;
        timeslot: string;
    } | {
        user: null;
        timeslot: string;
    })[]) {
        // Filter only empty slots
        const emptySlots = fullTimeslotData.filter(slot => !slot.user);
        // Remove duplicate times
        const uniqueTimes = [...new Set(emptySlots.map(slot => slot.timeslot))];
        // Sort times in chronological order
        this.availableTimeslots = uniqueTimes.sort((a, b) => moment(a, 'h:mm A').diff(moment(b, 'h:mm A')));
    }

    async signUp() {
        const timeslot = this.timeslotControl.value;
        if (!this.paxUser)
            return;

        if (!timeslot) {
            alert("No time selected");
            return;
        }

        const bloodDriveEntry: BloodDriveEntry = {
            id: '',
            paxUser: this.paxUser,
            timeslot,
            bloodDriveId: this.eventInformation.id,
        }

        const entry = await this.bloodDriveService.addEntry(bloodDriveEntry);
        this.userEntry = entry;

        const emptySlotIndex = this.tableData.findIndex(entry => entry.timeslot === timeslot && !entry.user);
        if (emptySlotIndex > -1) {
            this.tableData[emptySlotIndex].user = bloodDriveEntry.paxUser;
            this.tableData = [...this.tableData];
        }
    }

    async withdraw() {
        if (!this.userEntry) {
            alert("Unable to find entry");
            return;
        }
        await this.bloodDriveService.removeEntry(this.userEntry);
        await this.getEventInformation(this.eventInformation.id);
    }

    async exportToExcel() {
        const ws: XLSX.WorkSheet=XLSX.utils.json_to_sheet(this.tableData.map((item) => {
            return {
                timeslot: item.timeslot,
                firstName: item.user?.firstName || '',
                lastName: item.user?.lastName || '',
                f3Name: item.user?.f3Name || '',
                phoneNumber: item.user?.phoneNumber?.toDashedForm() || ''
            }
        }), {header: ['timeslot', 'firstName', 'lastName', 'f3Name', 'phoneNumber']});
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, `${this.eventInformation.name}.xlsx`);
    }

    recordBloodDrawTime() {

    }

    updateBloodDrawTime() {

    }

    goBack() {
        this.location.back();
    }
}