import { Component } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: 'bleed-time-report-dialog',
    templateUrl: 'bleed-time-report.component.html',
  })
export class BleedTimeReportDialog {

    form: FormGroup = new FormGroup({
        bleedTime: new FormControl('', [
            Validators.required,
            Validators.pattern(/^([0-5][0-9]):([0-5][0-9])$/),
            this.validateTimeFormat
        ])
    });
    
    constructor(
        public dialogRef: MatDialogRef<BleedTimeReportDialog>,
    ) {       
    }

    // Custom validator to ensure valid time format
    validateTimeFormat(control: FormControl) {
        if (!control.value) {
            return null;
        }

        // Check if input matches MM:SS format with valid ranges
        const match = control.value.match(/^([0-5][0-9]):([0-5][0-9])$/);
        if (!match) {
            return { invalidTimeFormat: true };
        }

        return null;
    }

    onSubmit() {
        if (this.form.valid) {
            this.dialogRef.close(this.form.value);
        } else {
            // Mark form fields as touched to trigger validation messages
            this.form.markAllAsTouched();
        }
    }

    onCancel() {
        this.dialogRef.close();
    }
}