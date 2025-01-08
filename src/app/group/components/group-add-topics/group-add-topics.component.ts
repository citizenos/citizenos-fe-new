import { Topic } from 'src/app/interfaces/topic';
import { Component, OnInit, Inject, Input, ViewChild } from '@angular/core';
import { Group } from 'src/app/interfaces/group';
import { GroupService } from '@services/group.service';
import { AppService } from '@services/app.service';
import { SearchService } from '@services/search.service';
import { GroupMemberTopicService } from '@services/group-member-topic.service';
import { of, tap, switchMap, take, forkJoin } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { TopicService } from '@services/topic.service';
import { DIALOG_DATA, DialogRef } from 'src/app/shared/dialog';
@Component({
  selector: 'group-add-topics',
  templateUrl: './group-add-topics.component.html',
  styleUrls: ['./group-add-topics.component.scss']
})
export class GroupAddTopicsComponent implements OnInit {
  @Input() group!: Group;
  @Input() dialog = false;
  @Input() topicsToAdd? = <Topic[]>[];
  VISIBILITY = this.GroupService.VISIBILITY;
  LEVELS = Object.keys(this.GroupMemberTopicService.LEVELS);
  searchStringTopic?: string;
  searchResults$ = of(<Topic[] | any[]>[]);
  memberTopics$ = of(<Topic[] | any[]>[]);
  resultCount: number = 0;
  searchOrderBy?: string;
  errors?: any;
  membersPage = 1;
  itemsPerPage = 5;

  public membersToAdd = <Topic[]>[];

  constructor(
    private Search: SearchService,
    public GroupService: GroupService,
    private app: AppService,
    public translate: TranslateService,
    public TopicService: TopicService,
    public GroupMemberTopicService: GroupMemberTopicService) {

  }

  ngOnInit(): void {
    if (this.group && this.group.id) {
      this.GroupMemberTopicService.setParam('groupId', this.group.id);
      if (!this.group.members.topics?.rows) {
        if (!this.group.members.topics) this.group.members.topics = {};
        this.group.members.topics.rows = <Topic[]>[];
      }
      this.memberTopics$ = this.GroupMemberTopicService.loadItems().pipe(
        take(1),
        tap((topics) => {
          this.group.members.topics.rows = topics;
        })
      );
    }
    if (this.topicsToAdd) {
      this.membersToAdd = this.membersToAdd.concat(this.topicsToAdd);
    }
  }

  canUpdate() {
    return this.GroupService.canUpdate(this.group)
  }

  doOrderTopics(property: string) {

  }

  search(str: any): void {
    if (str && str.length >= 2) {
      this.searchStringTopic = str;
      this.searchResults$ = this.Search
        .search(str, {
          include: 'my.topic',
          'my.topic.level': 'admin'
        })
        .pipe(
          switchMap((response) => {
            this.resultCount = response.results.my.topics.count;
            return of(response.results.my.topics.rows);
          }));
    } else {
      this.searchResults$ = of([]);
    }
  }

  addGroupMemberTopic(topic: Topic) {
    this.searchStringTopic = '';
    this.searchResults$ = of([]);
    if (!topic || !topic.id || !topic.title) {
      return false;
    }
    let member = this.group.members.topics?.rows.find((o: Topic) => {
      return o.id === topic.id;
    });

    if (!member) {
      member = this.membersToAdd.find((o: Topic) => {
        return o.id === topic.id;
      });
    }
    if(!member) {
      topic.permission.level = this.GroupMemberTopicService.LEVELS.read;
      //  if (!this.group.members.topics?.rows) this.group.members.topics.rows = <Topic[]>[];
      this.membersToAdd.push(topic);
    }
    return
  };

  removeGroupMemberTopic(topic: Topic) {
    this.membersToAdd.splice(this.membersToAdd.indexOf(topic), 1);
  };

  updateGroupMemberTopicLevel(topic: Topic, level: string) {
    topic.permission.level = level;
  };

  doSaveGroup() {
    // Topics
    this.errors = null;
    const topicsToAdd = <any>{};
    this.membersToAdd.forEach((topic: Topic) => {
      const member = {
        groupId: this.group.id,
        topicId: topic.id,
        level: topic.permission.level
      };

      topicsToAdd[member.topicId] = this.GroupMemberTopicService.save(member);
    });

    if (Object.keys(topicsToAdd).length) {
      forkJoin(topicsToAdd)
        .pipe(take(1))
        .subscribe({
          next: (res: any) => {
            this.GroupService.reload();
            this.GroupMemberTopicService.setParam('groupId', this.group.id);
          },
          error: (errorResponse) => {
            if (errorResponse && errorResponse.errors) {
              this.errors = errorResponse.errors;
              console.error(errorResponse.errors);
            }
          }
        })
    }
  };

  isOnPage(index: any, page: number) {
    const endIndex = page * this.itemsPerPage;
    return (parseInt(index) >= (endIndex - this.itemsPerPage) && parseInt(index) < endIndex);
  };

  loadPage(pageNr: number) {
    this.membersPage = pageNr;
  };

  totalPages(items: any) {
    return Math.ceil(items.length / this.itemsPerPage);
  };

  removeAllTopics() {
    this.membersToAdd = []
  };

  updateAllLevels(level: string) {
    this.membersToAdd.forEach((topic: any) => {
      topic.permission.level = level;
    });
  };

  isMember(topic: Topic) {
    const prevmember =  this.group.members.topics?.rows.find((o: Topic) => {
      return o.id === topic.id;
    });
    if (!prevmember) {
      return this.membersToAdd.find((o: Topic) => {
        return o.id === topic.id;
      });
    }
    return prevmember;
  }
}


@Component({
  templateUrl: './group-add-topics-dialog.component.html',
  styleUrls: ['./group-add-topics-dialog.component.scss']
})
export class GroupAddTopicsDialogComponent {
  group!: Group;
  @ViewChild(GroupAddTopicsComponent) groupAddTopics!: GroupAddTopicsComponent;
  noTopicsSelected = false;
  constructor(
    @Inject(DIALOG_DATA) public data: any,
    private dialog: DialogRef<GroupAddTopicsDialogComponent>,
    private GroupService: GroupService,
    private GroupMemberTopic: GroupMemberTopicService
  ) {
    this.group = this.data.group;
  }

  topicsLength$() {
    if (this.groupAddTopics?.membersToAdd) {
      return of(this.groupAddTopics.membersToAdd.length).pipe(tap((length) => {
        if (length) { this.noTopicsSelected = false; }
      }));
    } else {
      return of(0);
    }
  }

  doInviteMembers() {
    if (this.groupAddTopics.membersToAdd.length) {

      this.groupAddTopics.doSaveGroup();
      this.dialog.close();
    } else {
      this.noTopicsSelected = true;
    }
    // Users
    /* const topicsToAdd = <any>{};
     this.group.members.topics.rows.forEach((topic: Topic) => {
       const member = {
         groupId: this.group.id,
         topicId: topic.id,
         level: topic.permission.level
       };

       topicsToAdd[member.topicId] = this.GroupMemberTopic.save(member);
     });

     if (Object.keys(topicsToAdd).length) {
       forkJoin(topicsToAdd)
         .pipe(take(1))
         .subscribe({
           next: (res: any) => {
             this.GroupService.reloadGroup();
             this.GroupMemberTopic.setParam('groupId', this.group.id);

             this.dialog.close()
           },
           error: (errorResponse) => {
             if (errorResponse && errorResponse.errors) {
               console.error(errorResponse.errors);
             }

             this.dialog.close();
           }
         })
     } else {
       this.noTopicsSelected = true;
     }*/

  }
}
