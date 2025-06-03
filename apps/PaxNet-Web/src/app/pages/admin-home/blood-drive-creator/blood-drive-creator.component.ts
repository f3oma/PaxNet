import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import moment from "moment";
import { BloodDriveEventInformation } from "src/app/models/blood-drive.model";
import { BloodDriveService } from "src/app/services/blood-drive.service";

@Component({
    selector: 'app-blood-drive-creator',
    templateUrl: './blood-drive-creator.component.html',
    styleUrls: ['./blood-drive-creator.component.scss']
})
export class BloodDriveCreatorComponent {
    bloodDriveForm: FormGroup;

    constructor(private fb: FormBuilder, private bloodDriveService: BloodDriveService) {
        this.bloodDriveForm = this.fb.group({
            eventName: ['', Validators.required],
            address: ['', Validators.required],
            description: ['', Validators.required],
            eventDate: ['', Validators.required],
            eventHost: ['', Validators.required],
            lastDateToRegister: ['', Validators.required]
        });
    }

    prefillDescription() {
        const defaultText = "Consider donating blood at Nebraska Community Blood Bank for the benefit of your community. Record your bleed time here once completed and the fastest time wins a profile achievement";
        this.bloodDriveForm.get('description').setValue(defaultText);
    }

    async onSubmit() {
        if (this.bloodDriveForm.valid) {
            var eventDateFormatted = moment(this.bloodDriveForm.value.eventDate).format("MM/DD/YYYY");
            var lastDateToRegisterFormatted = moment(this.bloodDriveForm.value.lastDateToRegister).format("MM/DD/YYYY");
            var bloodDriveEventInformation: BloodDriveEventInformation = {
                name: this.bloodDriveForm.value.eventName,
                address: this.bloodDriveForm.value.address,
                description: this.bloodDriveForm.value.description,
                eventDate: eventDateFormatted,
                eventHost: this.bloodDriveForm.value.eventHost,
                lastDateToRegister: lastDateToRegisterFormatted
            };
            await this.bloodDriveService.addBloodDriveEventInformation(bloodDriveEventInformation);
            alert("Blood drive event created successfully!");
            this.bloodDriveForm.reset();
        } else {
            alert("Some fields are invalid. Please check your input.");
        }
    }
}