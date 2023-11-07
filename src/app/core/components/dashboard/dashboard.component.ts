import { OnboardingComponent } from './../onboarding/onboarding.component';
import { MatDialog } from '@angular/material/dialog';
import { Component } from '@angular/core';
import { AppService } from 'src/app/services/app.service';
import { AuthService } from 'src/app/services/auth.service';
import { UserTopicService } from 'src/app/services/user-topic.service';
import { PublicTopicService } from 'src/app/services/public-topic.service';
import { PublicGroupService } from 'src/app/services/public-group.service';
import { TranslateService } from '@ngx-translate/core';

import { GroupService } from 'src/app/services/group.service';
import { of, tap, Observable } from 'rxjs';
import { Topic } from 'src/app/interfaces/topic';
import { Group } from 'src/app/interfaces/group';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  groups$: Observable<Group[] | any[]> = of([]);
  topics$: Observable<Topic[] | any[]> = of([]);
  publictopics$: Observable<Topic[] | any[]> = of([]);
  publicgroups$: Observable<Group[] | any[]> = of([]);
  showNoEngagements = false;

  showPublic = true;

  constructor(
    public auth: AuthService,
    public app: AppService,
    public translate: TranslateService,
    private UserTopicService: UserTopicService,
    private PublicTopicService: PublicTopicService,
    private PublicGroupService: PublicGroupService,
    private GroupService: GroupService,
    private dialog: MatDialog
  ) {
    this.groups$ = this.GroupService.loadItems();
    this.topics$ = this.UserTopicService.loadItems().pipe(
      tap((topics) => {
        if (topics.length === 0) {
          this.showPublic = true;
          this.showNoEngagements = true;
        }
      })
    );
    this.publictopics$ = this.PublicTopicService.loadItems();
    this.publicgroups$ = this.PublicGroupService.loadItems();
  }

  trackByTopic(index: number, element: any) {
    return element.id;
  }

  ngAfterViewInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    setTimeout(() => {
      this.dialog.open(OnboardingComponent);
    });
  }
}
