export interface TopLeaderboardResponse {
    f3Name: string;
    posts: number;
}

export interface TopQLeaderboardResponse {
    f3Name: string;
    qCount: number;
}

export interface UserStatisticsResponse {
    totalPosts: {
        f3Name: string;
        posts: number;
    },
    mostPostedWith: Array<MostPostedWithResponse>;
    topSites: Array<UserTopSitesResponse>;
    favoriteDay: Array<FavoriteDayResponse>;
}

export interface MostPostedWithResponse {
    userDocRef: string;
    f3Name: string;
    posts: number;
}

export interface UserTopSitesResponse {
    aoName: string;
    posts: number;
}

export interface FavoriteDayResponse {
    dayOfWeek: string;
    posts: number;
}

export interface TopSiteAttendanceResponse {
    aoName: string;
    posts: number;
}

export interface TopFngsByMonthResponse {
    month: number;
    FNGCount: string;
}