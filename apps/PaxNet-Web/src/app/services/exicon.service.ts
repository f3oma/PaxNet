import { Injectable, inject } from '@angular/core';
import { CollectionReference, Firestore, collection, query, limit, startAt, DocumentSnapshot, orderBy, getDocs, where, getDoc, doc, updateDoc, setDoc, deleteDoc } from '@angular/fire/firestore';
import { Exercise } from '../models/exercise.model';

@Injectable({
  providedIn: 'root'
})
export class ExiconService {
  firestore: Firestore = inject(Firestore);
  private exerciseCollection: CollectionReference = collection(this.firestore, 'exercises');

  private previousItem: DocumentSnapshot | null = null;
  private lastItem: DocumentSnapshot | null = null;

  constructor() { }

  async getPaginatedExercises(pageLimit: number, lastItem: DocumentSnapshot | null): Promise<Exercise[]> {
    this.previousItem = lastItem;
    let q = null;

    if (lastItem !== null) {
      q = query(this.exerciseCollection, orderBy("name"), where("isApproved", "==", true), limit(pageLimit), startAt(lastItem));
    } else {
      q = query(this.exerciseCollection, orderBy("name"), where("isApproved", "==", true), limit(pageLimit));
    }

    const docs = await getDocs(q);
    this.lastItem = docs.docs[docs.docs.length - 1] ?? null;
    return docs.docs
      .map(d => {
        const ex = d.data() as Exercise;
        ex.category = this.convertToUIString(ex.category);
        return ex;
      });
  }

  private convertToUIString(category: string) {
    switch (category) {
      case "core": return "Core";
      case "arms": return "Arms";
      case "legs": return "Legs";
      case "warm-up": return "Warm-Up";
      case "compound": return "Compound";
      default: return "Unknown";
    }
  }

  async getUnapprovedExercises() {
    const q = query(this.exerciseCollection, orderBy("name", "desc"), where("isApproved", "==", false));
    const docs = await getDocs(q);
    return docs.docs.map(d => d.data() as Exercise);
  }

  async getPreviousPage(pageLimit: number) {
    return await this.getPaginatedExercises(pageLimit, this.previousItem);
  }

  async getNextPage(pageLimit: number) {
    return await this.getPaginatedExercises(pageLimit, this.lastItem);
  }

  async markExerciseApproved(exercise: Exercise) {
    const ref = doc(this.firestore, 'exercises/' + exercise.id);
    const docRes = await getDoc(ref);
    if (docRes.exists()) {
      await updateDoc(ref, {
        isApproved: true
      });
    }
  }

  async addExercise(exercise: Partial<Exercise>) {
    const ref = doc(this.exerciseCollection);
    exercise.id = ref.id;
    return await setDoc(ref, exercise);
  }

  async deleteExercise(exercise: Exercise) {
    const ref = doc(this.exerciseCollection, `${exercise.id}`);
    return await deleteDoc(ref);
  }

  async updateExercise(exercise: Exercise) {
    const ref = doc(this.exerciseCollection, `${exercise.id}`);
    return await updateDoc(ref, {
      name: exercise.name,
      description: exercise.description,
      category: exercise.category
    });
  }
}
