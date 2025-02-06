import { formatDate } from '@angular/common';
import { AfterViewInit, Component, Input } from '@angular/core';
import { PreActivity } from '@shared/src/types/Workout';
import moment from 'moment';
import { UserReportedWorkout, UserReportedWorkoutUI } from 'src/app/models/beatdown-attendance';
import { Beatdown } from 'src/app/models/beatdown.model';
import { IPaxUser } from 'src/app/models/users.model';
import { BeatdownService } from 'src/app/services/beatdown.service';
import { WorkoutManagerService } from 'src/app/services/workout-manager.service';

export interface DailyWorkoutReported {
  countPerDay: number;
  hadPersonalWorkout: boolean;
}

@Component({
  selector: 'activity-graph',
  templateUrl: './activity-graph.component.html',
  styleUrls: ['./activity-graph.component.scss']
})
export class ActivityGraphComponent implements AfterViewInit {

  @Input('user') user!: IPaxUser;
  workouts: DailyWorkoutReported[] = [];

  public sortedMonths: string[] = [];
  beatdownAttendance: UserReportedWorkout[] = [];
  monthsOut: number = 3;
  repeatedColumnsCount: number = this.monthsOut + 1;
  recentActivity: UserReportedWorkoutUI[] = [];
  loadingRecents = true;
  beatdownAttendanceCache: Map<number, UserReportedWorkout[]> = new Map();

  constructor(
    private workoutService: WorkoutManagerService,
    private beatdownService: BeatdownService) {
  }

  async ngAfterViewInit(): Promise<void> {
    await this.getBeatdownAttendanceLogs();
  }

  async adjustMonthsOut(monthsOut: number) {
    this.monthsOut = monthsOut;
    this.repeatedColumnsCount = monthsOut + 1;
    this.workouts = [];
    await this.getBeatdownAttendanceLogs();
  }

  async getBeatdownAttendanceLogs() {
    let beatdownAttendance: UserReportedWorkout[] = [];
    if (this.beatdownAttendanceCache.has(this.monthsOut)) {
      beatdownAttendance = this.beatdownAttendanceCache.get(this.monthsOut)!;
    } else {
      beatdownAttendance = await this.workoutService.getAllBeatdownAttendanceForUser(this.user.id);
      await this.beatdownService.convertToUpdatedPersonalWorkout(this.user.id, beatdownAttendance);
      this.beatdownAttendanceCache.set(this.monthsOut, beatdownAttendance);
    }

    this.calculateChartFromCurrentDate(beatdownAttendance);
    await this.updateRecents(beatdownAttendance);
    this.loadingRecents = false;
  }

  async updateRecents(beatdownAttendance: UserReportedWorkout[]) {
    const recentActivity = beatdownAttendance.slice(0, 4);
    const recentActivityList = [];
    for (let activity of recentActivity) {

      if (activity.activityType !== 'f3Omaha') {
        recentActivityList.push(activity);
        continue;
      }

      const beatdownData = await this.beatdownService.getBeatdownDetail(activity.beatdown.id);
      if (!beatdownData)
        continue;

      recentActivityList.push({
        beatdown: activity.beatdown,
        date: activity.date,
        beatdownDomain: beatdownData,
        activityType: activity.activityType,
        preActivity: activity.preActivity
      });
    }
    this.recentActivity = recentActivityList;
  }

  generateMonthHeaders(): string[] {
    const today = new Date();
    const monthsAgo = new Date();
    monthsAgo.setMonth(today.getMonth() - this.monthsOut);

    const months: string[] = [];
    while (monthsAgo <= today) {
      months.push(formatDate(monthsAgo, 'MMM', 'en'));
      monthsAgo.setMonth(monthsAgo.getMonth() + 1);
    }

    return months;
  }

  calculateChartFromCurrentDate(beatdownAttendance: UserReportedWorkout[]) {
    const today = new Date();
    today.setHours(23, 59, 59, 0);    
    var months = this.generateMonthHeaders();
    this.sortedMonths = months;
    
    const dayMap = this.mapToRelativeDay(beatdownAttendance, today);
    const values = [];
    for (let entry of dayMap.values())
      values.push({ countPerDay: entry.countPerDay, hadPersonalWorkout: entry.hadPersonalWorkout })

    this.workouts = values;
  }

  daysSince(date: Date, currentDate: Date): number {
    const targetDate = new Date(date);
    const differenceInTime = currentDate.getTime() - targetDate.getTime();
    const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));
    return differenceInDays;
  }

  mapToRelativeDay(dateItems: UserReportedWorkout[], currentDate: Date): Map<number, { countPerDay: number, hadPersonalWorkout: boolean}> {
    const monthsOut = new Date();
    monthsOut.setMonth(currentDate.getMonth() - this.monthsOut);
    monthsOut.setDate(monthsOut.getDate() - monthsOut.getDay());
    monthsOut.setHours(0, 0, 0, 0);

    const momentMonthsOut = moment(monthsOut);
    const momentCurrentDate = moment(currentDate);
    const daysSinceCount = momentCurrentDate.diff(momentMonthsOut, 'days');

    // Relative Day to Workout Value
    const relativeDays: Map<number, { countPerDay: number, hadPersonalWorkout: boolean}> = new Map<number, { countPerDay: number, hadPersonalWorkout: boolean}>();
    // Pre-load
    // +1 to include the current date as well
    for (let i = 0; i < daysSinceCount; i++) {
      relativeDays.set(i, { countPerDay: 0, hadPersonalWorkout: false });
    }

    dateItems = dateItems.filter(a => a.date > monthsOut);

    dateItems.forEach(item => {
      const date = moment(item.date);
      const daysSinceDate = momentCurrentDate.diff(date, 'days');      
      const relativeDay = daysSinceCount - daysSinceDate;

      let itemCountPerDay = 0;
      let itemHadPersonalWorkout = false;
      // First see if we have an existing entry
      const existingEntry = relativeDays.get(relativeDay);
      if (existingEntry) {
        itemCountPerDay = existingEntry.countPerDay;
        itemHadPersonalWorkout = Boolean(existingEntry.hadPersonalWorkout);
        if (item.preActivity != PreActivity.None) {
          itemCountPerDay = 2;
        }
        if (item.activityType === 'personal' && !itemHadPersonalWorkout) {
          itemHadPersonalWorkout = true;
        }
      } else {
        if (item.activityType !== 'personal') {
          itemCountPerDay = item.preActivity != PreActivity.None ? 2 : 1;
        }
      }

      // Special cases for personal workouts
      const hadPersonalWorkout = item.activityType === 'personal';
      if (hadPersonalWorkout) {
        itemHadPersonalWorkout = true;
      }

      relativeDays.set(relativeDay, { countPerDay: itemCountPerDay, hadPersonalWorkout: itemHadPersonalWorkout });
    });

    return relativeDays;
  }
}
