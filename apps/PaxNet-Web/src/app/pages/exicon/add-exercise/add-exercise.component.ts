import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Exercise } from 'src/app/models/exercise.model';
import { ExiconService } from 'src/app/services/exicon.service';

@Component({
  selector: 'app-add-exercise',
  templateUrl: './add-exercise.component.html',
  styleUrls: ['./add-exercise.component.scss']
})
export class AddExerciseComponent {

  @Input('f3Name') f3Name: string = 'Unknown';
  @Output('cancel') canceledEmitter = new EventEmitter<boolean>();
  @Output('added') addedEmitter = new EventEmitter<boolean>();

  form: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.required]),
    category: new FormControl('', [Validators.required]),
  });

  constructor(private exiconService: ExiconService) {}

  async addExercise() {
    if (this.form.valid) {
      const exercise: Partial<Exercise> = {
        name: this.form.controls['name'].value,
        description: this.form.controls['description'].value,
        category: this.form.controls['category'].value,
        submittedByF3Name: this.f3Name,
        isApproved: false
      }
      await this.exiconService.addExercise(exercise);
      this.addedEmitter.emit(true);
    }
  }

  cancel() {
    this.canceledEmitter.emit(false);
  }
}
