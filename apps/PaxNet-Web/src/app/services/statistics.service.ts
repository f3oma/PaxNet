import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { TopLeaderboardResponse, TopSiteAttendanceResponse, UserStatisticsResponse } from "../models/statistics.model";


@Injectable({
    providedIn: 'root'
})
export class StatisticsService {

    private baseUrl: string = "https://statisticsservice-781841010728.us-central1.run.app";

    constructor(private http: HttpClient) {}

    async getUserStatistics(id: string): Promise<UserStatisticsResponse | undefined> {
        const statsUrl = `/users/stats/${id}`;
        const finalUrl = this.baseUrl + statsUrl;
        const stats = await this.http.get<UserStatisticsResponse>(finalUrl).toPromise();
        return stats;
    }

    async getTop10Leaderboard(): Promise<TopLeaderboardResponse[] | undefined> {
        const leaderboardUrl = '/users/top-10-leaderboard';
        const finalUrl = this.baseUrl + leaderboardUrl;
        const leaders = await this.http.get<TopLeaderboardResponse[]>(finalUrl).toPromise();
        return leaders;
    }

    async getTopSiteAttendance(): Promise<TopSiteAttendanceResponse[] | undefined> {
        const topSiteAttendanceUrl = '/aos/top-site-attendance-total';
        const finalUrl = this.baseUrl + topSiteAttendanceUrl;
        const topSites = await this.http.get<TopSiteAttendanceResponse[]>(finalUrl).toPromise();
        return topSites;
    }

    async getTopFngsByMonth() {
        const fngMonths = '/aos/top-fngs-total';
        const finalUrl = this.baseUrl + fngMonths;
        const topMonths = await this.http.get(finalUrl).toPromise();
        return topMonths;
    }

    async getTop10LeaderboardByTimeframe(timeframe: 'week' | 'month' | 'year'): Promise<TopLeaderboardResponse[] | undefined> {
        const leaderboardUrl = `/users/top-10-leaderboard/${timeframe}`;
        const finalUrl = this.baseUrl + leaderboardUrl;
        const leaders = await this.http.get<TopLeaderboardResponse[]>(finalUrl).toPromise();
        return leaders.splice(0, 10); // Limit to 10
    }
}