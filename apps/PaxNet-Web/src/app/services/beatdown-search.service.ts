import { Injectable } from "@angular/core";
import { Timestamp } from "@angular/fire/firestore";
import algoliasearch from "algoliasearch";
import { environment } from "src/environments/environment";

@Injectable({
    providedIn: 'root'
})
export class BeatdownSearchService {
    private algoliaSearch = algoliasearch(environment.algoliasearch.APP_ID, environment.algoliasearch.API_KEY);
    private idx = this.algoliaSearch.initIndex('dev_f3OmahaBeatdowns');

    constructor() {
    }

    /**
    * @param partialBeatdownName Name provided to either beatdown or AO name
    * @returns All locations with a matching name
    */
    public async findByName(partialBeatdownName: string): Promise<any[]> {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const todayTimestamp = Math.floor(Timestamp.fromDate(today).toMillis());
        const sixDaysAway = new Date();
        sixDaysAway.setDate(today.getDate() - 7);
        sixDaysAway.setHours(0, 0, 0, 0);
        const yesterdayTimestamp = Math.ceil(Timestamp.fromDate(sixDaysAway).toMillis());

        return this.idx.search(partialBeatdownName, {
            exactOnSingleWordQuery: "attribute",
            restrictSearchableAttributes: ['name', 'aoName', 'eventName'],
            typoTolerance: "min",
            removeWordsIfNoResults: "allOptional",
            filters: `(date > ${yesterdayTimestamp} AND date < ${todayTimestamp})`
        }).then(({ hits }: any) => {
            if (!hits) {
                return [];
            }
            return hits.filter((b: any) => !b.eventName || (b.eventName && !b.eventName?.includes('Shield Lock') && !b.eventName.includes("DR - ")));
        });
    }
}