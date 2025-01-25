import { transition, trigger, useAnimation } from '@angular/animations';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { AOData } from 'src/app/models/ao.model';
import { AuthenticatedUser, UserRole } from 'src/app/models/authenticated-user.model';
import { MyTotalAttendance } from 'src/app/models/beatdown-attendance';
import { UserProfileData } from 'src/app/models/user-profile-data.model';
import { IPaxUser, PaxUser } from 'src/app/models/users.model';
import { AOManagerService } from 'src/app/services/ao-manager.service';
import { PaxManagerService } from 'src/app/services/pax-manager.service';
import { UserAuthenticationService } from 'src/app/services/user-authentication.service';
import { UserProfileService } from 'src/app/services/user-profile.service';
import { WorkoutManagerService } from 'src/app/services/workout-manager.service';
import { fadeIn, fadeOut } from 'src/app/utils/animations';
import { getChallengeImageByName } from 'src/app/utils/challenges';

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
  animations: [
    trigger("profileAnimation", [
      transition("void => *", [useAnimation(fadeIn)]),
      transition("* => void", [useAnimation(fadeOut)]),
    ])
  ],
})
export class UserDetailComponent {
  userDataSubject = new Subject<IPaxUser | undefined>();
  userData$: Observable<IPaxUser | undefined> = this.userDataSubject.asObservable();
  existingRoles: UserRole[] = [];

  public loading = true;
  public isAdmin = false; // Only admins can promote to admin
  public editMode: boolean = false;
  adminErrorMessage: string = "";

  public totalPaxCount: number = 2100 // non-zero in case it fails to load
  public ehUser: PaxUser | undefined = undefined;
  public userSiteQLocation: AOData | undefined = undefined;
  public userEhLocation: AOData | undefined = undefined;
  public userProfileData: UserProfileData | null = null;
  public isPersonalProfile: boolean = false;
  beatdownAttendance: MyTotalAttendance | null = null;

  constructor(
    private readonly paxManagerService: PaxManagerService,
    private activatedRoute: ActivatedRoute,
    private userAuthService: UserAuthenticationService,
    private readonly aoManagerService: AOManagerService,
    private readonly workoutService: WorkoutManagerService,
    private router: Router,
    private userProfileService: UserProfileService,
    private location: Location
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false; // Always reload if url param changes
    // Look at the logged in user for admin / siteq permissions
    this.userAuthService.authUserData$.subscribe((res) => {
      if (res) {
        if (res.roles.includes(UserRole.Admin)) {
          this.isAdmin = true;
        }
      }
    });
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id !== null) {
      this.initializeComponent(id);
    }
  }

  async initializeComponent(id: string) {
      await this.getUserData(id);
      await this.getCurrentUserRoles(id);
      await this.getUserProfileData(id);
      this.determineIfIsUsersProfile(id);
      this.totalPaxCount = await this.paxManagerService.getCachedCurrentNumberOfPax();
  }

  public async shareProfile(id: string, f3Name: string) {
    const shareData = {
      url: 'https://f3omaha.web.app/users/' + id,
      text: `View ${f3Name}'s profile`,
      title: `${f3Name} on PaxNet`
    }
    if (navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else {
      await window.navigator.clipboard.writeText(`https://f3omaha.web.app/users/${id}`);
      alert("Profile link copied to clipboard");
    }
  }

  public toggleEditMode() {
    this.editMode = !this.editMode
  }

  public async viewInAdminCenter(user: IPaxUser) {
    await this.router.navigate(['/admin/user-data-edit/', user.id]);
  }

  public goBack() {
    this.location.back();
  }

  public async getCurrentUserRoles(userId: string) {
    const authUser: AuthenticatedUser | null = await this.userAuthService.getLinkedAuthData(userId);
    if (authUser) {
      this.existingRoles = authUser.roles;
    }
  }

  public getAchievementImage(challengeInfoId: string) {
    return getChallengeImageByName(challengeInfoId);
  }

  private determineIfIsUsersProfile(userId: string) {
    this.isPersonalProfile = this.userAuthService.cachedCurrentAuthData?.paxDataId === userId;
  }

  private async getUserData(id: string) {
    const paxData = await (await this.paxManagerService.getDataByAuthId(id)).data();
    if (paxData) {
      this.beatdownAttendance = await this.workoutService.getTotalAttendanceDataForPax(id);
    }
    this.ehUser = paxData?.ehByUserRef ? await this.paxManagerService.getPaxInfoByRef(paxData.ehByUserRef) : undefined;
    this.userSiteQLocation = paxData?.siteQLocationRef ? await this.aoManagerService.getDataByRef(paxData.siteQLocationRef) : undefined;
    this.userEhLocation = paxData?.ehLocationRef ? await this.aoManagerService.getDataByRef(paxData.ehLocationRef) : undefined;
    this.userDataSubject.next(paxData?.toProperties());
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  private async getUserProfileData(userId: string) {
    var profileData = await this.userProfileService.getOrCreateUserProfileById(userId);
    if (profileData && profileData.achievements) {
      for (let achievement of profileData.achievements) {
        await this.userProfileService.updateAchievementFormat(achievement, userId);
      }
    }
    this.userProfileData = profileData;
  }
}
