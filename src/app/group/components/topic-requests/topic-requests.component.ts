import { TopicService } from '@services/topic.service';
import { GroupService } from '@services/group.service';
import { Observable, map, take } from 'rxjs';
import { Component, Inject } from '@angular/core';
import { Group } from 'src/app/interfaces/group';
import { DIALOG_DATA } from 'src/app/shared/dialog';
import { GroupRequestTopicService } from '@services/group-request-topic.service';
import { NotificationService } from '@services/notification.service';
import { GroupMemberTopicService } from '@services/group-member-topic.service';

@Component({
  selector: 'app-topic-requests',
  templateUrl: './topic-requests.component.html',
  styleUrls: ['./topic-requests.component.scss']
})
export class TopicRequestsComponent {
  group: Group;
  request$: Observable<any[]>;
  constructor(@Inject(DIALOG_DATA) data: any,
  public GroupRequestTopicService: GroupRequestTopicService,
  private GroupService: GroupService,
  private Notification: NotificationService,
  public TopicService: TopicService,
  private GroupMemberTopicService: GroupMemberTopicService) {
    this.group = data.group;
    this.request$ = GroupRequestTopicService.getItems({groupId: data.group.id}).pipe(map((res) => res.rows));

  }

  accept(request: any) {
    const reqData = Object.assign({requestId: request.id}, request);
    this.GroupRequestTopicService.accept(reqData).pipe(take(1)).subscribe(() => {
      this.Notification.removeAll();
      this.Notification.addSuccess('COMPONENTS.TOPIC_REQUESTS.MSG_ACCEPT_SUCCESS');
      this.GroupRequestTopicService.reload();
      this.GroupMemberTopicService.reset();
      this.GroupMemberTopicService.setParam('groupId', this.group.id);
      this.GroupService.reload();
    });
  }
  reject(request: any) {
    const reqData = Object.assign({requestId: request.id}, request);
    this.GroupRequestTopicService.reject(reqData).pipe(take(1)).subscribe(() => {
      this.Notification.removeAll();
      this.Notification.addSuccess('COMPONENTS.TOPIC_REQUESTS.MSG_REJECT_SUCCESS');
      this.GroupRequestTopicService.reload();
      this.GroupService.reload()
    });
  }
}
