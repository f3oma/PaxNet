import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentReference } from 'firebase/firestore';
import { AOData } from 'src/app/models/ao.model';
import { UserRole } from 'src/app/models/authenticated-user.model';
import { AOManagerService } from 'src/app/services/ao-manager.service';
import { BeatdownService } from 'src/app/services/beatdown.service';
import { PaxManagerService } from 'src/app/services/pax-manager.service';
import { UserAuthenticationService } from 'src/app/services/user-authentication.service';
import { UserProfileService } from 'src/app/services/user-profile.service';

@Component({
  selector: 'app-site-management',
  templateUrl: './site-management.component.html',
  styleUrls: ['./site-management.component.scss']
})
export class SiteManagementComponent implements OnInit {

  isAdmin = false;
  siteQAO: AOData | undefined;
  isIframe = false;

  public dateSort: string[] = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
  public displayedColumns: string[] = ['weekDay', 'location', 'name', 'startTimeCST', 'category', 'siteQ'];
  public tableData: AOData[] = [];
  public dataSource: any;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private aoManagerService: AOManagerService, 
    private userAuthService: UserAuthenticationService,
    private paxManagementService: PaxManagerService,
    private beatdownService: BeatdownService,
    private userProfileService: UserProfileService,
    private router: Router,
    private route: ActivatedRoute) {

    this.dataSource = null;

    // Look at the logged in user for admin / siteq permissions
    this.userAuthService.authUserData$.subscribe((res) => {
      if (res) {
        if (res.roles.includes(UserRole.Admin)) {
          this.isAdmin = true;
        }
      }
    });
    
    // Check if we're in an iframe
    this.isIframe = this.checkIfInIframe();
  }

  async ngOnInit() {
    await this.getAOData();
    
    // Check for iframe parameter in query params
    this.route.queryParams.subscribe(params => {
      console.log(params);
      if (params['iframe'] === 'true') {
        console.log("HERE");
        this.isIframe = true;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  public async viewSiteDetail(row: AOData) {
    // Only navigate to site details if not in iframe mode
    if (!this.isIframe) {
      await this.router.navigate(['sites', row.id]);
    }
  }
  
  // Helper method to detect if running inside an iframe
  private checkIfInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  async getSiteQAO(siteQLocationRef: DocumentReference<AOData>) {
    this.siteQAO = await this.aoManagerService.getDataByRef(siteQLocationRef);
  }

  openGoogleMapsForAddress(address: string) {
    const googleMapsBaseUrl = "https://www.google.com/maps/search/?api=1";
    const addressUrl = googleMapsBaseUrl + '&query=' + encodeURIComponent(address);
    window.open(addressUrl, "_blank");
  }

  async getAOData() {
    const tableData = await this.aoManagerService.getAllBeatdownEligibleAOData();
  
    const dayMap = this.getDayMap();
    const sorted = tableData
      .filter((a) => a.weekDay !== null)
      .sort((a, b) => dayMap.get(a.weekDay) > dayMap.get(b.weekDay) ? 1 : -1);

    this.tableData = sorted;
    this.dataSource = new MatTableDataSource(this.tableData);
    this.dataSource.sort = this.sort;
  }

  private getDayMap() {
    const dayMap = new Map();
    dayMap.set('Mon', 0);
    dayMap.set('Tues', 1);
    dayMap.set('Wed', 2);
    dayMap.set('Thurs', 3);
    dayMap.set('Fri', 4);
    dayMap.set('Sat', 5);
    dayMap.set('Sun', 6);
    return dayMap;
  }
}
