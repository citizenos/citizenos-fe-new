import { GroupService } from 'src/app/services/group.service';
import { Observable, map, take } from 'rxjs';
import { Component, Inject } from '@angular/core';
import { Group } from 'src/app/interfaces/group';
import { DIALOG_DATA } from 'src/app/shared/dialog';
import { GroupRequestTopicService } from 'src/app/services/group-request-topic.service';

@Component({
  selector: 'app-topic-requests',
  templateUrl: './topic-requests.component.html',
  styleUrls: ['./topic-requests.component.scss']
})
export class TopicRequestsComponent {
  group: Group;
  request$: Observable<any[]>;
  constructor(@Inject(DIALOG_DATA) data: any, public GroupRequestTopicService: GroupRequestTopicService, private GroupService: GroupService) {
    this.group = data.group;
    this.request$ = GroupRequestTopicService.getItems({groupId: data.group.id}).pipe(map((res) => res.rows));

  }

  accept(request: any) {
    const reqData = Object.assign({requestId: request.id}, request);
    this.GroupRequestTopicService.accept(reqData).pipe(take(1)).subscribe(() => {
      this.GroupRequestTopicService.reloadItems();
      this.GroupService.reloadGroup()
    });
  }
  reject(request: any) {
    const reqData = Object.assign({requestId: request.id}, request);
    this.GroupRequestTopicService.reject(reqData).pipe(take(1)).subscribe(() => {
      this.GroupRequestTopicService.reloadItems();
      this.GroupService.reloadGroup()
    });
  }
}
