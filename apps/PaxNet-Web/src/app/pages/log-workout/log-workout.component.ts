import { AfterViewInit, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PersonalWorkoutReportComponent, UserReportedWorkoutProps } from 'src/app/dialogs/personal-workout-report/personal-workout-report.component';
import { Exercise } from 'src/app/models/exercise.model';
import { PaxUser } from 'src/app/models/users.model';
import { TopLeaderboardResponse, TopQLeaderboardResponse } from 'src/app/models/statistics.model';
import { ExiconService } from 'src/app/services/exicon.service';
import { StatisticsService } from 'src/app/services/statistics.service';
import { UserAuthenticationService } from 'src/app/services/user-authentication.service';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser } from 'src/app/models/authenticated-user.model';
import { ChallengeManager } from 'src/app/services/challenge-manager.service';
import { BaseChallenge } from 'src/app/models/user-challenge.model';

@Component({
  selector: 'app-log-workout',
  templateUrl: './log-workout.component.html',
  styleUrls: ['./log-workout.component.scss']
})
export class LogWorkoutComponent implements OnInit, AfterViewInit {
  public authUserData$: Observable<AuthenticatedUser | undefined>;
  private user: PaxUser | undefined = undefined;
  public leaderboard: TopLeaderboardResponse[] = [];
  public qLeaderboard: TopQLeaderboardResponse[] = [];
  public randomExercises: Exercise[] = [];
  public loadingLeaderboard: boolean = false;
  public loadingQLeaderboard: boolean = false;
  public selectedTimeframe: 'week' | 'month' | 'year' = 'week';

  private readonly CACHE_KEY = 'weekly_exercises';
  private readonly CACHE_EXPIRY_KEY = 'weekly_exercises_expiry';
  private readonly WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
  private leaderboardCache: { [key: string]: TopLeaderboardResponse[] } = {};
  private activeChallenges: BaseChallenge[] = [];

  constructor(
    private matDialog: MatDialog,
    private userAuthService: UserAuthenticationService,
    private statisticsService: StatisticsService,
    private exiconService: ExiconService,
    private challengeManager: ChallengeManager,
  ) {
  }

  async ngOnInit() {
    await this.loadLeaderboards();
    await this.loadRandomExercises();
  }

  async ngAfterViewInit() {
    this.user = await this.userAuthService.getPaxUser();
    this.activeChallenges = await this.challengeManager.getActiveChallengesForUser(this.user.id);
  }

  async loadLeaderboards() {
    this.loadingQLeaderboard = true;
    this.loadingLeaderboard = true;

    await this.loadAttendanceLeaderboard();
    await this.loadQLeaderboard();
  }

  async loadQLeaderboard() {
    try {
      this.qLeaderboard = await this.statisticsService.getTop10QLeaderboard() || [];
    } catch (error) {
      console.error('Error loading Q leaderboard:', error);
      this.qLeaderboard = [];
    } finally {
      this.loadingQLeaderboard = false;
    }
  }

  async loadAttendanceLeaderboard() {
    const cached = this.leaderboardCache[this.selectedTimeframe];
    if (cached) {
      this.leaderboard = cached;
      return;
    }

    try {
      this.loadingLeaderboard = true;
      this.leaderboard = await this.statisticsService.getTop10LeaderboardByTimeframe(this.selectedTimeframe) || [];
      this.leaderboardCache[this.selectedTimeframe] = this.leaderboard;
      this.loadingLeaderboard = false;
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      this.loadingLeaderboard = false;
    }
  }

  async loadRandomExercises() {
    const cached = this.getFromCache();
    if (cached) {
      this.randomExercises = cached;
      return;
    }

    try {
      // Get first 20 exercises and randomly select 5
      const exercises = await this.exiconService.getPaginatedExercises(20, null);
      this.randomExercises = this.getRandomElements(exercises, 5);
      this.saveToCache(this.randomExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  }

  public convertToId(category: string) {
    return category.replace(/\s+/g, '-').toLowerCase();
  }

  private getRandomElements<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private saveToCache(exercises: Exercise[]) {
    const expiry = Date.now() + this.WEEK_IN_MS;
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(exercises));
    localStorage.setItem(this.CACHE_EXPIRY_KEY, expiry.toString());
  }

  private getFromCache(): Exercise[] | null {
    const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY);
    if (!expiry || Date.now() > parseInt(expiry)) {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_EXPIRY_KEY);
      return null;
    }

    const cached = localStorage.getItem(this.CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  }

  async changeTimeframe(timeframe: 'week' | 'month' | 'year') {
    this.selectedTimeframe = timeframe;
    await this.loadAttendanceLeaderboard();
  }

  logWorkout() {
    this.matDialog.open(PersonalWorkoutReportComponent, {
      data: <UserReportedWorkoutProps> {
        user: this.user,
        activeChallenges: this.activeChallenges,
      },
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%'
    }).afterClosed().subscribe((res) => {
      if (!res) {
        return;
      }
    });
  }
}
