import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AddPaxComponent } from './pages/add-pax/add-pax.component';
import { SearchComponent } from './pages/search/search.component';
import { HomeComponent } from './pages/home/home.component';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PhoneInputComponent } from './components/phone-input/phone-input.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth,getAuth } from '@angular/fire/auth';
import { provideFirestore,getFirestore } from '@angular/fire/firestore';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {MatSelectModule} from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { UserDetailComponent } from './pages/user-detail/user-detail.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ClaimDataConfirmationDialog, ClaimPaxInfoComponent } from './pages/claim-pax-info/claim-pax-info.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SiteManagementComponent } from './pages/site-management/site-management.component';
import { SiteDetailComponent } from './pages/site-management/site-detail/site-detail.component';
import { UserDataViewComponent } from './components/user-data-view/user-data-view.component';
import { UserDataEditComponent } from './components/user-data-edit/user-data-edit.component';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { LinkSiteQAODialog } from './dialogs/link-site-q-ao/link-site-q-ao-dialog.component';
import { AdminHomeComponent } from './pages/admin-home/admin-home.component';
import { AdminPaxListComponent } from './pages/admin-home/admin-pax-list/admin-pax-list.component';
import { AccountCreatedSuccessfullyDialog } from './dialogs/account-created-successfully/account-created-successfully.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatNativeDateModule } from '@angular/material/core';
import { ActivityGraphComponent } from './components/activity-graph/activity-graph.component';
import { MatExpansionModule} from '@angular/material/expansion';
import { SettingsComponent } from './pages/settings/settings.component';
import { AdminUserDetailComponent } from './pages/admin-home/admin-user-detail/admin-user-detail.component';
import { SiteDataEditComponent } from './components/site-data-edit/site-data-edit.component';
import { MatChipsModule } from '@angular/material/chips';
import { UnsubscribeComponent } from './pages/user-detail/unsubscribe/unsubscribe.component';
import { AddNewSiteComponent } from './pages/site-management/add-new-site/add-new-site.component';
import { LogWorkoutComponent } from './pages/log-workout/log-workout.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { QSchedulerComponent } from './pages/q-scheduler/q-scheduler.component';
import { CreateBeatdownComponent } from './pages/q-scheduler/create-beatdown-modal/create-beatdown.component';
import { EditBeatdownComponent } from './pages/q-scheduler/edit-beatdown-modal/edit-beatdown.component';
import { MatTabsModule } from '@angular/material/tabs';
import { BeatdownDataEditorComponent } from './components/beatdown-data-editor/beatdown-data-editor.component';
import { AddExerciseComponent } from './pages/exicon/add-exercise/add-exercise.component';
import { ExiconComponent } from './pages/exicon/exicon.component';
import { ExiconApprovalComponent } from './pages/admin-home/exicon-approval/exicon-approval.component';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { ExiconEditDialog } from './dialogs/exicon-edit/exicon-edit-dialog.component';
import { WeeklyQScheduleComponent } from './pages/weekly-q-schedule/weekly-q-schedule.component';
import { PersonalWorkoutReportComponent } from './dialogs/personal-workout-report/personal-workout-report.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommunityWorkoutReportComponent } from './dialogs/community-workout-report/community-workout-report.component';
import { ChallengeDetail } from './dialogs/challenge-detail/challenge-detail.component';
import { ChallengesComponent } from './pages/challenges/challenges.component';
import { ChallengeViewComponent } from './pages/challenges/challenge-view/challenge-view.component';
import { TruncatePipe } from './utils/truncate.pipe';
import { BeatdownCategoryChipsComponent } from './components/beatdown-category-chips/beatdown-category-chips.component';
import { HttpClientModule } from '@angular/common/http';
import { UserStatsViewComponent } from './pages/user-stats-view/user-stats-view.component';
import { environment } from 'src/environments/environment.prod';
import { ThirdFComponent } from './pages/third-f/third-f.component';
import { SetPersonalGoalDialog } from './dialogs/set-personal-goal/set-personal-goal.dialog.component';
import { BloodDriveSignUpComponent } from './pages/blood-drive-sign-up/blood-drive-sign-up.component';
import { BleedTimeReportDialog } from './dialogs/bleed-time-report/bleed-time-report.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AdminTicketsComponent } from './components/support/admin/admin-tickets.component';
import { CreateTicketComponent } from './components/support/create-ticket/create-ticket.component';
import { MyTicketsComponent } from './components/support/my-tickets/my-tickets.component';

@NgModule({
  declarations: [
    AppComponent,
    AddPaxComponent,
    SearchComponent,
    HomeComponent,
    PhoneInputComponent,
    UserDetailComponent,
    LoginComponent,
    RegisterComponent,
    ClaimPaxInfoComponent,
    ProfileComponent,
    SiteManagementComponent,
    SiteDetailComponent,
    UserDataViewComponent,
    UserDataEditComponent,
    ClaimDataConfirmationDialog,
    LinkSiteQAODialog,
    AdminHomeComponent,
    AdminPaxListComponent,
    AccountCreatedSuccessfullyDialog,
    ActivityGraphComponent,
    AdminUserDetailComponent,
    SettingsComponent,
    SiteDataEditComponent,
    UnsubscribeComponent,
    AddNewSiteComponent,
    LogWorkoutComponent,
    ForgotPasswordComponent,
    QSchedulerComponent,
    CreateBeatdownComponent,
    EditBeatdownComponent,
    BeatdownDataEditorComponent,
    ExiconComponent,
    AddExerciseComponent,
    ExiconApprovalComponent,
    ExiconEditDialog,
    WeeklyQScheduleComponent,
    PersonalWorkoutReportComponent,
    CommunityWorkoutReportComponent,
    ChallengeDetail,
    ChallengesComponent,
    ChallengeViewComponent,
    TruncatePipe,
    BeatdownCategoryChipsComponent,
    UserStatsViewComponent,
    ThirdFComponent,
    SetPersonalGoalDialog,
    BloodDriveSignUpComponent,
    BleedTimeReportDialog,
    AdminTicketsComponent,
    CreateTicketComponent,
    MyTicketsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    NgbModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatTableModule,
    MatSortModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    HttpClientModule,
    MatButtonToggleModule,
    MatListModule,
    MatCardModule,
    NgxChartsModule
  ],
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideAnalytics(() => getAnalytics()),
    provideStorage(() => getStorage()),
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
