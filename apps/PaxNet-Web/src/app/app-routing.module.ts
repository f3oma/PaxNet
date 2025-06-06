import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddPaxComponent } from './pages/add-pax/add-pax.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { SearchComponent } from './pages/search/search.component';
import { UserDetailComponent } from './pages/user-detail/user-detail.component';
import { ClaimPaxInfoComponent } from './pages/claim-pax-info/claim-pax-info.component';
import { BasicAuthenticatedAuthGuard } from './route-guard/basic-authenticated.guard';
import { SiteManagementComponent } from './pages/site-management/site-management.component';
import { SiteDetailComponent } from './pages/site-management/site-detail/site-detail.component';
import { AdminRoleAuthGuard } from './route-guard/admin-role.guard';
import { SiteQMinimumRoleAuthGuard } from './route-guard/siteq-minimum-role.guard';
import { AdminHomeComponent } from './pages/admin-home/admin-home.component';
import { AdminPaxListComponent } from './pages/admin-home/admin-pax-list/admin-pax-list.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AdminUserDetailComponent } from './pages/admin-home/admin-user-detail/admin-user-detail.component';
import { UnsubscribeComponent } from './pages/user-detail/unsubscribe/unsubscribe.component';
import { AddNewSiteComponent } from './pages/site-management/add-new-site/add-new-site.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { QSchedulerComponent } from './pages/q-scheduler/q-scheduler.component';
import { ExiconComponent } from './pages/exicon/exicon.component';
import { ExiconApprovalComponent } from './pages/admin-home/exicon-approval/exicon-approval.component';
import { WeeklyQScheduleComponent } from './pages/weekly-q-schedule/weekly-q-schedule.component';
import { ChallengesComponent } from './pages/challenges/challenges.component';
import { ChallengeViewComponent } from './pages/challenges/challenge-view/challenge-view.component';
import { UserStatsViewComponent } from './pages/user-stats-view/user-stats-view.component';
import { ThirdFComponent } from './pages/third-f/third-f.component';
import { BloodDriveSignUpComponent } from './pages/blood-drive-sign-up/blood-drive-sign-up.component';
import { LogWorkoutComponent } from './pages/log-workout/log-workout.component';
import { CreateTicketComponent } from './components/support/create-ticket/create-ticket.component';
import { MyTicketsComponent } from './components/support/my-tickets/my-tickets.component';
import { AdminTicketsComponent } from './components/support/admin/admin-tickets.component';
import { BloodDriveCreatorComponent } from './pages/admin-home/blood-drive-creator/blood-drive-creator.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'search',
    component: SearchComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'add-pax',
    component: AddPaxComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'claim-info',
    component: ClaimPaxInfoComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'weekly-schedule',
    component: WeeklyQScheduleComponent,
  },
  {
    path: 'exicon',
    component: ExiconComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'users/:id',
    component: UserDetailComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'users/:id/unsubscribe',
    component: UnsubscribeComponent
  },
  {
    path: 'users/:id/stats',
    component: UserStatsViewComponent,
    canActivate: [BasicAuthenticatedAuthGuard],
  },
  {
    path: 'challenges',
    component: ChallengesComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'challenges/:id',
    component: ChallengeViewComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'sites',
    children: [
      {
        path: '',
        component: SiteManagementComponent,
      },
      {
        path: ':id',
        component: SiteDetailComponent,
      },
    ]
  },
  {
    path: 'blood-drive/:id',
    component: BloodDriveSignUpComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'workout',
    component: LogWorkoutComponent,
    canActivate: [BasicAuthenticatedAuthGuard]
  },
  {
    path: 'fs',
    canActivate: [BasicAuthenticatedAuthGuard],
    children: [
      {
        path: 'third-f',
        component: ThirdFComponent,
        canActivate: [BasicAuthenticatedAuthGuard]
      }
    ]
  },
  {
    path: 'scheduler',
    component: QSchedulerComponent,
    canActivate: [SiteQMinimumRoleAuthGuard]
  },
  {
    path: 'admin',
    canActivate: [SiteQMinimumRoleAuthGuard],
    children: [
      {
        path: '',
        component: AdminHomeComponent,
      },
      {
        path: 'exicon-approval',
        component: ExiconApprovalComponent,
        canActivate: [AdminRoleAuthGuard]
      },
      {
        path: 'add-location',
        component: AddNewSiteComponent,
        canActivate: [AdminRoleAuthGuard]
      },
      {
        path: 'pax-list',
        component: AdminPaxListComponent,
        canActivate: [AdminRoleAuthGuard]
      },
      {
        path: 'user-data-edit',
        component: AdminUserDetailComponent,
        canActivate: [AdminRoleAuthGuard]
      },
      {
        path: 'user-data-edit/:id',
        component: AdminUserDetailComponent,
        canActivate: [AdminRoleAuthGuard]
      },
      {
        path: 'blood-drive-creator',
        component: BloodDriveCreatorComponent,
        canActivate: [AdminRoleAuthGuard]
      }
    ]
  },
  {
    path: 'support',
    children: [
      { path: '', redirectTo: 'my-tickets', pathMatch: 'full' },
      { path: 'create', component: CreateTicketComponent },
      { path: 'my-tickets', component: MyTicketsComponent },
      { 
        path: 'admin',
        component: AdminTicketsComponent,
        canActivate: [AdminRoleAuthGuard]
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
