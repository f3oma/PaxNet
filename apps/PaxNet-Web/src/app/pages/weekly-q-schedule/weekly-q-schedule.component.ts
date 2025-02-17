import { formatDate } from '@angular/common';
import { Component, Inject, LOCALE_ID } from '@angular/core';
import { IconSize } from 'src/app/components/beatdown-category-chips/beatdown-category-chips.component';
import { Beatdown } from 'src/app/models/beatdown.model';
import { BeatdownService } from 'src/app/services/beatdown.service';
import { formatDegreeString, WeatherService } from 'src/app/services/weather-api.service';

@Component({
  selector: 'app-weekly-q-schedule',
  templateUrl: './weekly-q-schedule.component.html',
  styleUrls: ['./weekly-q-schedule.component.scss']
})
export class WeeklyQScheduleComponent {

  weekRange: string = '';
  currentBeatdownList: Record<string, Beatdown[]> = {};
  dayMap: Map<number, string> = new Map();
  weekList: { dayName: string | undefined; date: Date; dateString: string }[] = [];
  loadingBeatdownData: boolean = true;

  beatdownCache: Map<string, Beatdown[]> = new Map<string, Beatdown[]>();

  initialWeekRange: string = '';
  currentWeekDate: Date = new Date();
  shouldShowScrollToday = true;

  currentWeekWeather: number[] | null = [];

  chipIconSize: IconSize = IconSize.Small;

  constructor(
    private beatdownService: BeatdownService,
    private weatherService: WeatherService,
    @Inject(LOCALE_ID) private locale: string) {

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDay = today.getDate() - today.getDay();
    const weekStartDate = new Date(today.setDate(firstDay));
    const weekEndDate = new Date(today.setDate(weekStartDate.getDate()+6));
    weekEndDate.setHours(23, 59, 59, 0);
    this.currentWeekDate = weekStartDate;

    this.createDayMap();
    this.updateWeek(weekStartDate, weekEndDate);
  }

  updateWeek(weekStartDate: Date, weekEndDate: Date) {
    this.loadingBeatdownData = true;
    this.initializeWeekList(weekStartDate);
    this.initializeBeatdowns(weekStartDate, weekEndDate);
    this.setWeekRangeString(weekStartDate, weekEndDate);
    setTimeout(() => {
      this.loadingBeatdownData = false;
    }, 2000);
  }

  initializeWeekList(weekStartDate: Date) {
    const weekList = [];
    let date = new Date(weekStartDate);
    for(let i = 0; i < 7; i++) {
      const currentDate = new Date(date);
      weekList.push({
        dayName: this.dayToNameConverter(date.getDay()),
        date: currentDate,
        dateString: currentDate.toDateString()
      });
      date = this.addDays(date, 1);
    }
    this.weekList = weekList;
  }

  viewPreviousWeek(currentWeekDate: Date) {
    currentWeekDate.setDate(this.currentWeekDate.getDate() - 7);
    currentWeekDate.setHours(0, 0, 0, 0);

    const firstDay = currentWeekDate.getDate() - currentWeekDate.getDay();
    const weekStartDate = new Date(currentWeekDate.setDate(firstDay));
    const weekEndDate = new Date(currentWeekDate.setDate(weekStartDate.getDate()+6));
    weekEndDate.setHours(23, 59, 59, 0);

    this.updateWeek(weekStartDate, weekEndDate);
    this.currentWeekDate = weekStartDate;
  }

  viewNextWeek(currentWeekDate: Date) {
    currentWeekDate.setDate(this.currentWeekDate.getDate() + 7);
    currentWeekDate.setHours(0, 0, 0, 0);

    const firstDay = currentWeekDate.getDate() - currentWeekDate.getDay();
    const weekStartDate = new Date(currentWeekDate.setDate(firstDay));
    const weekEndDate = new Date(currentWeekDate.setDate(weekStartDate.getDate()+6));
    weekEndDate.setHours(23, 59, 59, 0);

    this.updateWeek(weekStartDate, weekEndDate);
    this.currentWeekDate = weekStartDate;
  }

  addDays(date: Date, days: number): Date {
    date.setDate(date.getDate() + days);
    return date;
  }

  dayToNameConverter(dayIdx: number) {
    return this.dayMap.get(dayIdx);
  }

  trackByFn(index: number, item: Beatdown): any {
    return item.id;
  }

  scrollToToday() {
    const date = new Date();
    const dayName = this.dayToNameConverter(date.getDay());
    const element = document.getElementById(dayName!);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }

  public formatWeatherString(number: number) {
    return formatDegreeString(number);
  }

  async initializeBeatdowns(weekStartDate: Date, weekEndDate: Date) {

    try {
      this.currentWeekWeather = await this.weatherService.getWeatherForWeek(weekStartDate, weekEndDate);
    }
    catch(e) {
      this.currentWeekWeather = null;
    }

    if (this.beatdownCache.has(weekStartDate.toDateString())) {
      this.generateDailyBeatdowns(this.beatdownCache.get(weekStartDate.toDateString())!);
      this.loadingBeatdownData = false;
      return;
    }

    const beatdowns = await this.beatdownService.getBeatdownsBetweenDates(weekStartDate, weekEndDate, []);
    const filtered = beatdowns.filter((b) => !b.eventName || (b.eventName && !b.eventName.includes("Shield Lock") && !b.eventName.includes("DR - ")));
    const sorted = filtered.sort((a, b) => {
      const eventAName = a.aoLocation ? a.aoLocation.name : a.eventName;
      const eventBName = b.aoLocation ? b.aoLocation.name : b.eventName;
      if (!eventAName) {
        return -1;
      }
      if (!eventBName) {
        return -1;
      }
      return eventAName > eventBName ? 1 : -1;
    });
    this.beatdownCache.set(weekStartDate.toDateString(), sorted);
    this.generateDailyBeatdowns(sorted);
  }

  private setWeekRangeString(weekStartDate: Date, weekEndDate: Date) {
    const weekStartDateString = formatDate(weekStartDate, 'MM/dd', this.locale);
    const weekEndDateString = formatDate(weekEndDate, 'MM/dd', this.locale);
    this.weekRange = `${weekStartDateString} - ${weekEndDateString}`;
    if (this.initialWeekRange === '') {
      this.initialWeekRange = this.weekRange;
    }
    this.shouldShowScrollToday = this.weekRange === this.initialWeekRange;
  }

  private generateDailyBeatdowns(beatdowns: Beatdown[]) {
    const currentBeatdowns: Record<string, Beatdown[]> = {};
    for(let beatdown of beatdowns) {
      const dateString = beatdown.date.toDateString();
      if (!currentBeatdowns[dateString]) {
        currentBeatdowns[dateString] = [beatdown]
      } else {
        currentBeatdowns[dateString].push(beatdown);
      }
    }
    this.currentBeatdownList = currentBeatdowns;
  }

  private createDayMap() {
    const dayMap = new Map();
    dayMap.set(0, 'Sunday');
    dayMap.set(1, 'Monday');
    dayMap.set(2, 'Tuesday');
    dayMap.set(3, 'Wednesday');
    dayMap.set(4,'Thursday');
    dayMap.set(5, 'Friday');
    dayMap.set(6, 'Saturday');
    this.dayMap = dayMap; 
  }
}
