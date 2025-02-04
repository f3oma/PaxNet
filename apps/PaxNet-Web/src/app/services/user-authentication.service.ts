import { Injectable, inject } from "@angular/core";
import { Auth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, AuthProvider, TwitterAuthProvider, sendPasswordResetEmail, confirmPasswordReset } from "@angular/fire/auth";
import { collection, CollectionReference, doc, DocumentData, DocumentReference, Firestore, getDoc, getDocs, query, QueryDocumentSnapshot, setDoc, where } from "@angular/fire/firestore";
import { BehaviorSubject, Subject } from "rxjs";
import { AuthenticatedUser, UserRole } from "../models/authenticated-user.model";
import { AuthenticationConverter } from "../utils/auth-user-model.converter";
import { IClaimUserInfo, IPaxUser, PaxUser } from "../models/users.model";
import { PaxModelConverter } from "../utils/pax-model.converter";
import { arrayRemove, arrayUnion, updateDoc, writeBatch } from "firebase/firestore";
import { PaxManagerService } from "./pax-manager.service";
import { AOData } from "../models/ao.model";
import { Storage, getBlob, getBytes, ref } from '@angular/fire/storage';
import { result } from "lodash";

@Injectable({
  providedIn: 'root'
})
export class UserAuthenticationService {
  firestore: Firestore = inject(Firestore);
  auth: Auth = inject(Auth)
  storage: Storage = inject(Storage);
  private authUserData: Subject<AuthenticatedUser | undefined> = new BehaviorSubject<AuthenticatedUser | undefined>(undefined);
  public authUserData$ = this.authUserData.asObservable();

  private authUserCollectionRef: CollectionReference<AuthenticatedUser>; // Authenticated User data
  private usersCollectionRef: CollectionReference<PaxUser>; // Users from migration
  private paxConverter = this.paxModelConverter.getConverter();

  constructor(
    private authenticationUserConverter: AuthenticationConverter, 
    private paxModelConverter: PaxModelConverter,
    private paxManagerService: PaxManagerService) {
    this.authUserCollectionRef = collection(this.firestore, 'authenticated_users').withConverter(this.authenticationUserConverter.getAuthenticationConverter());
    this.usersCollectionRef = collection(this.firestore, 'users').withConverter(this.paxConverter);
    this.watchAuthState();
  }

  public getPaxUser = async () => {
    await this.auth.authStateReady()
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return null;
    }
    const docRef = doc(this.authUserCollectionRef, currentUser.uid).withConverter(this.authenticationUserConverter.getAuthenticationConverter());
    const resultData = (await getDoc(docRef)).data();
    const ref = doc(this.usersCollectionRef, resultData.paxDataId);
    return await this.paxManagerService.getPaxInfoByRef(ref);
  }

  async watchAuthState() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user && user !== undefined) {
        localStorage.setItem('userData', JSON.stringify(user));
        const docRef = doc(this.authUserCollectionRef, user.uid).withConverter(this.authenticationUserConverter.getAuthenticationConverter());
        const resultData = (await getDoc(docRef)).data();
        this.authUserData.next(resultData);
        this.cachedCurrentAuthData = resultData;
      } else {
        this.authUserData.next(undefined);
        this.cachedCurrentAuthData = undefined;
        localStorage.removeItem('userData');
      }
    });
  }

  public set cachedCurrentAuthData(data: AuthenticatedUser | undefined) {
    localStorage.setItem('nonPaxData', JSON.stringify(data));
  }

  public get cachedCurrentAuthData(): AuthenticatedUser | undefined {
    const authData = localStorage.getItem('nonPaxData');
    if (authData !== null && authData !== 'undefined') {
      const props = JSON.parse(authData);
      return new AuthenticatedUser(props._id, props._email, props._paxDataId, props._paxData, props._roles);
    }
    return undefined;
  }

  async registerEmailPassword(email: string, password: string): Promise<void> {
    // User needs to enter data in order to retrieve an account from the DB and update it.
    createUserWithEmailAndPassword(this.auth, email, password).then(async (userCredential) => {
      const user = userCredential.user;
      localStorage.setItem('userData', JSON.stringify(user));
      const docRef = doc(this.authUserCollectionRef, user.uid).withConverter(this.authenticationUserConverter.getAuthenticationConverter());
      let result = await getDoc(docRef);
      if (!result.exists()) {
        // create new document if one doesn't exist for some reason (they should have one)
        await this.createNewAuthenticatedUserDoc(user.uid, user.email!, docRef);
        result = await getDoc(docRef);
      }
      const resultData = result.data();
      this.authUserData.next(resultData);
      this.cachedCurrentAuthData = resultData;
    }).catch((error) => {
      if (error?.message.includes('auth/email-already-in-use')) {
        throw new Error("Email is already in use. You may need to log in.");
      } else if (error?.message.includes('auth/weak-password')) {
        throw new Error("Password should be atleast 6 characters");
      }
      throw new Error(error.message);
    })
  }

  loginUserEmailPassword(email: string, password: string): Promise<AuthenticatedUser> {
    return signInWithEmailAndPassword(this.auth, email, password).then(async (userCredential) => {
      const user = userCredential.user;
      localStorage.setItem('userData', JSON.stringify(user));
      const docRef = doc(this.authUserCollectionRef, user.uid).withConverter(this.authenticationUserConverter.getAuthenticationConverter());
      let result = await getDoc(docRef);
      if (!result.exists()) {
        // create new document if one doesn't exist for some reason (they should have one)
        await this.createNewAuthenticatedUserDoc(user.uid, user.email!, docRef);
        const resultData = (await getDoc(docRef)).data();
        this.authUserData.next(resultData);
        this.cachedCurrentAuthData = resultData;
        return resultData;
      } else {
        let data = result.data() as AuthenticatedUser;
        if (data.paxDataId) {
          const userDocRef = await this.paxManagerService.getUserReference('users/' + data.paxDataId);
          if (userDocRef) {
            const userData = await this.paxManagerService.getPaxInfoByRef(userDocRef);

            // Temp fix for nulled AuthDataId...
            if (userData?.authDataId === null || userData?.authDataId === undefined) {
              await updateDoc(userDocRef, {
                authDataId: result.id
              });
            }
            
            data.paxData = userData;
          }
        }
        this.authUserData.next(data);
        this.cachedCurrentAuthData = data;
        return data;
      }
    }).catch((error) => {
      throw error;
    });
  }

  async loginWithGoogle() {
    return await this.authLogin(new GoogleAuthProvider());
  }

  async loginWithX() {
    return await this.authLogin(new TwitterAuthProvider());
  }

  authLogin(provider: AuthProvider): Promise<AuthenticatedUser> {
    return signInWithPopup(this.auth, provider).then(async (res) => {
        const user = res.user;
        localStorage.setItem('userData', JSON.stringify(user));
        const docRef = doc(this.authUserCollectionRef, user.uid).withConverter(this.authenticationUserConverter.getAuthenticationConverter());
        let result = (await getDoc(docRef));
        if (!result.exists()) {
          // create new document if one doesn't exist for some reason (they should have one)
          await this.createNewAuthenticatedUserDoc(user.uid, user.email!, docRef);
          const newDocData = (await getDoc(docRef)).data();
          this.authUserData.next(newDocData);
          this.cachedCurrentAuthData = newDocData;
          return newDocData;
        } else {
          let data = result.data();
          if (data.paxDataId) {
            const userDocRef = doc(this.usersCollectionRef, data.paxDataId);
            const userData = (await getDoc(userDocRef)).data();

            // Temp fix for nulled AuthDataId...
            if (userData?.authDataId === null || userData?.authDataId === undefined) {
              await updateDoc(userDocRef, {
                authDataId: result.id
              });
            }
            data.paxData = userData;
          }
          this.authUserData.next(data);
          this.cachedCurrentAuthData = data;
          return data;
        }
      })
      .catch((error) => {
        console.error(error);
        throw new Error(error.message);
      });
  }

  async signOutUser(): Promise<void> {
    localStorage.removeItem('userData');
    this.authUserData.next(undefined);
    this.cachedCurrentAuthData = undefined;
    return await signOut(this.auth);
  }

  get isLoggedIn(): boolean {
    const localData = localStorage.getItem('userData');
    if(!localData) {
      return false;
    }
    const user = JSON.parse(localData);
    return user ? true : false;
  }

  private async createNewAuthenticatedUserDoc(firebaseUid: string, email: string, docRef: DocumentReference): Promise<void> {
    const data = {
      id: firebaseUid,
      email,
      roles: []
    }
    return await setDoc(docRef, data);
  }

  async tryClaimF3Info(user: AuthenticatedUser, claimUserInfo: Partial<IClaimUserInfo>): Promise<Array<PaxUser>> {
    if (user && claimUserInfo) {
      let emailQuery, emailQuerySnapshot, phoneQuery, phoneQuerySnapshot, f3NameQuery, f3NameQuerySnapshot;
      const collectionRef = collection(this.firestore, 'users').withConverter(this.paxConverter);
      const docs = [];
      if (claimUserInfo.email) {
        emailQuery = query(collectionRef, where("email", "==", claimUserInfo.email));
        emailQuerySnapshot = await getDocs(emailQuery);
        docs.push(...emailQuerySnapshot.docs);
      }
      if (claimUserInfo.phoneNumber) {
        phoneQuery = query(collectionRef, where("phoneNumber", "==", claimUserInfo.phoneNumber?.toDashedForm()));
        phoneQuerySnapshot = await getDocs(phoneQuery);
        docs.push(...phoneQuerySnapshot.docs);
      }
      if (claimUserInfo.f3Name) {
        f3NameQuery = query(collectionRef, where("f3NameLowercase", "==", claimUserInfo.f3Name.toLowerCase()));
        f3NameQuerySnapshot = await getDocs(f3NameQuery);
        docs.push(...f3NameQuerySnapshot.docs);
      }
      if (docs.length === 0) {
        return [];
      }
      const docMap: Record<string, QueryDocumentSnapshot> = {};
      const finalDocData = [];
      for (let doc of docs) {
        docMap[doc.id] = doc;
      }
      for (let prop in docMap) {
        finalDocData.push(docMap[prop].data() as PaxUser);
      }
      return finalDocData;
    }
    throw new Error("No claim details defined");
  }

  async completeF3InfoClaim(user: AuthenticatedUser, paxUser: IPaxUser): Promise<void> {
    const authDocRef = doc(this.authUserCollectionRef, user.id).withConverter(this.authenticationUserConverter.getAuthenticationConverter());
    const userDocRef = doc(this.usersCollectionRef, paxUser.id);
    const batch = writeBatch(this.firestore);
    batch.update(authDocRef, {
      paxDataId: userDocRef.id
    });
    batch.update(userDocRef, {
      authDataId: authDocRef.id
    })
    await batch.commit();
    const result = (await getDoc(authDocRef)).data();
    this.authUserData.next(result);
    this.cachedCurrentAuthData = result;
    return;
  }

  async forgotPasswordEmail(passwordResetEmail: string) {
    return await sendPasswordResetEmail(this.auth, passwordResetEmail);
  }

  async confirmPasswordChange(code: string, password: string) {
    return await confirmPasswordReset(this.auth, code, password);
  }

  public async validatePromoteRole(paxUserData: IPaxUser): Promise<boolean> {
    // We need to make sure the user has an auth account
    // Search the user auth collection for paxdataid that matches
    // if none exists, user doesn't have an auth account
    const authQuery = query(this.authUserCollectionRef, where("paxDataId", "==", paxUserData.id));
    const authQueryResult = await getDocs(authQuery);

    if (authQueryResult.empty) {
      throw new Error("User has not linked their authentication account and data.");
    }
    return true;
  }

  public async promoteRole(userRole: UserRole, userId: string): Promise<void> {
    // We need to make sure the user has an auth account
    // Search the user auth collection for paxdataid that matches
    // if none exists, user doesn't have an auth account
    const authQuery = query(this.authUserCollectionRef, where("paxDataId", "==", userId));
    const authQueryResult = await getDocs(authQuery);

    if (authQueryResult.empty) {
      // No linked auth account...
      return Promise.resolve();
    } else {
      const userDoc = authQueryResult.docs[0];
      const userDocRef = userDoc.ref;
      return await updateDoc(userDocRef, {
        roles: arrayUnion(userRole)
      })
    }
  }

  public async removeRole(userRole: UserRole, userId: string) {
    // We need to make sure the user has an auth account
    // Search the user auth collection for paxdataid that matches
    // if none exists, user doesn't have an auth account
    const authQuery = query(this.authUserCollectionRef, where("paxDataId", "==", userId));
    const authQueryResult = await getDocs(authQuery);

    if (authQueryResult.empty) {
      // This should not happen if the user has a current role assigned
      // throw new Error("User does not have a linked authentication account");
      return Promise.resolve();
    } else {
      const userDoc = authQueryResult.docs[0];
      const userDocRef = userDoc.ref;
      return await updateDoc(userDocRef, {
        roles: arrayRemove(userRole)
      })
    }
  }

  public async getLinkedAuthData(userId: string) {
    const authQuery = query(this.authUserCollectionRef, where("paxDataId", "==", userId));
    const authQueryResult = await getDocs(authQuery);
    if (authQueryResult.empty) {
      // user doesn't have an auth account, do nothing
      return null;
    } else {
      const userDoc = authQueryResult.docs[0];
      return userDoc.data() as AuthenticatedUser;
    }
  }

  public getAuthenticationDocumentReference(authId: string) {
      return doc(this.authUserCollectionRef, authId);
  }

  public async getLinkedAuthDataRef(userId: string): Promise<DocumentReference<AuthenticatedUser> | null> {
    const authQuery = query(this.authUserCollectionRef, where("paxDataId", "==", userId));
    const authQueryResult = await getDocs(authQuery);
    if (authQueryResult.empty) {
      // user doesn't have an auth account, do nothing
      return null;
    } else {
      return authQueryResult.docs[0].ref;
    }
  }

  public async updateSiteQUserLocation(aoRef: DocumentReference<AOData>, authUserRef: DocumentReference<AuthenticatedUser>) {
    return await updateDoc(authUserRef, {
      siteQLocationRef: aoRef
    })
  }

  public async getUserExportCsv() {
    const storage = new Storage(this.storage);
    const storageRef = ref(storage, 'gs://f3_omaha_daily_user_file/user-export.csv');
    const blob = await getBlob(storageRef);
    var url= window.URL.createObjectURL(blob);
    window.open(url);
  }
}
