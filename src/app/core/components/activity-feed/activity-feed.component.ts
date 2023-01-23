import { Component, OnInit } from '@angular/core';
import { map, of } from 'rxjs';
import { ActivityService } from 'src/app/services/activity.service'
@Component({
  selector: 'activity-feed',
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.scss']
})
export class ActivityFeedComponent implements OnInit {
  unreadActivitiesCount = 0;
  allActivities$: any[] = [];
  activities$ = of(<any[]>[]);

  constructor(public ActivityService: ActivityService) {
    this.activities$ = this.ActivityService.loadItems().pipe(map(
      (newActivities: any) => {
        console.log('newActivities', newActivities)
        this.allActivities$ = this.allActivities$.concat(newActivities);
        return this.allActivities$;
      }
    ));
  }

  filterActivities(filter: string) {
    this.allActivities$ = [];
    this.ActivityService.setParam('include', filter)
  }
  ngOnInit(): void {
  }

  loadMore(event: any) {
    if ((event.target.scrollTop + event.target.offsetHeight) >= event.target.scrollHeight) {
      this.ActivityService.loadMore()
    }
  }
  doShowActivityModal() {

  }
}
