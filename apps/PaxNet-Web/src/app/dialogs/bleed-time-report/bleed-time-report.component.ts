import { Component } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: 'bleed-time-report-dialog',
    templateUrl: 'bleed-time-report.component.html',
  })
export class BleedTimeReportDialog {

    form: FormGroup = new FormGroup({
        bleedTime: new FormControl('', [Validators.required])
    });
    
    constructor(
        public dialogRef: MatDialogRef<BleedTimeReportDialog>,
    ) {       
    }

    onSubmit() {
        this.dialogRef.close(this.form.value);
    }

    onCancel() {
        this.dialogRef.close();
    }
}