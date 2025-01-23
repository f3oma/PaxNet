import { Injectable, inject } from '@angular/core';
import { CollectionReference, Firestore, collection, getDocs} from '@angular/fire/firestore';
import { Announcement } from '@shared/src/types/Announcements';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementsService {
  firestore: Firestore = inject(Firestore);
  private announcementsCollection: CollectionReference = collection(this.firestore, 'announcements');

  constructor() {}

  async getAnnouncements() {
    const announcements = await getDocs(this.announcementsCollection);
    return announcements.docs.map(d => d.data() as Announcement);
  }
}