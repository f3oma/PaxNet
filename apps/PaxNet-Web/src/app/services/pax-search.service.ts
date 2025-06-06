import { Injectable } from "@angular/core";
import algoliasearch from "algoliasearch";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class PaxSearchService {

  private algoliaSearch = algoliasearch(environment.algoliasearch.APP_ID, environment.algoliasearch.API_KEY);
  private idx = this.algoliaSearch.initIndex('dev_f3OmahaPax');

  constructor() {

  }

  /**
   * @param f3Name Name provided to PAX at join time
   * @returns Whether the F3 name exists in the F3 system
   */
  public async doesF3NameExist(f3Name: string): Promise<boolean> {
    return this.idx.search(f3Name, {
      exactOnSingleWordQuery: "attribute",
      restrictSearchableAttributes: ['f3Name'],
      typoTolerance: false
    }).then(({ hits }) => {
      const results: any[] = hits;
      if (results.length < 2) {
        return results.filter((e) => e.f3Name.toLowerCase() === f3Name.toLowerCase()).length === 1;
      }
      return false;
    });
  }

    /**
   * @param partialF3Name Name provided to PAX at join time
   * @returns All PAX with the specified F3 Name, beware there could be multiple PAX with
   * the same name...
   */
    public async findF3Name(partialF3Name: string): Promise<any[]> {
      return this.idx.search(partialF3Name, {
        exactOnSingleWordQuery: "attribute",
        restrictSearchableAttributes: ['f3Name'],
        typoTolerance: false
      }).then(({ hits }) => {
        return hits;
      });
    }
}
