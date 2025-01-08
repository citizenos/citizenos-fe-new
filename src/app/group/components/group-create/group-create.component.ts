import { Component, OnInit, ViewChild, ElementRef, Inject } from '@angular/core';
import { DialogService } from 'src/app/shared/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, forkJoin, map, of, take, takeWhile } from 'rxjs';
import { Group } from 'src/app/interfaces/group';
import { Topic } from 'src/app/interfaces/topic';
import { ConfigService } from '@services/config.service';
import { GroupService } from '@services/group.service';
import { SearchService } from '@services/search.service';
import { TopicService } from '@services/topic.service';
import { GroupMemberTopicService } from '@services/group-member-topic.service';
import { NotificationService } from '@services/notification.service';
import { GroupInviteUserService } from '@services/group-invite-user.service';
import { AppService } from '@services/app.service';
import { countries } from '@services/country.service';
import { languages } from '@services/language.service';
import { InterruptDialogComponent } from 'src/app/shared/components/interrupt-dialog/interrupt-dialog.component';
import { BlockNavigationIfChange } from 'src/app/shared/pending-changes.guard';
import { GroupAddTopicsComponent } from '../group-add-topics/group-add-topics.component';

@Component({
  selector: 'group-create-component',
  templateUrl: './group-create.component.html',
  styleUrls: ['./group-create.component.scss']
})
export class GroupCreateComponent implements OnInit, BlockNavigationIfChange {
  @ViewChild('imageUpload') fileInput?: ElementRef;
  @ViewChild(GroupAddTopicsComponent) groupAddTopics!: GroupAddTopicsComponent;

  hasChanges$ = new BehaviorSubject(<boolean>true);
  topicsToAdd = <Topic[]>[];
  countries = countries.sort((a: any, b: any) => {
    return a.name.localeCompare(b.name);
  });
  languages = languages.sort((a: any, b: any) => {
    return a.name.localeCompare(b.name);
  });
  group: Group = <Group>{
    name: '',
    description: '',
    imageUrl: '',
    members: {
      users: <any[]>[],
      topics: {
        rows: <Topic[]>[]
      }
    },
    visibility: this.GroupService.VISIBILITY.private,
    contact: null,
    rules: <string[]>[],
    language: null,
    country: null,
    categories: <string[]>[]
  };

  rules = [
    { rule: '' },
    { rule: '' },
    { rule: '' }
  ];

  VISIBILITY = this.GroupService.VISIBILITY;
  CATEGORIES = Object.keys(this.TopicService.CATEGORIES);
  errors?: any;
  uploadedImage?: any;
  imageFile?: any;
  tabSelected;
  public tmpImageUrl?: any;
  showHelp = false;
  tabs = ['info', 'settings', 'add_topics', 'invite'];

  searchStringUser = '';
  searchResultUsers$ = of(<any>[]);
  invalid = <any[]>[];
  members = <any[]>[];
  groupLevel = 'read';
  maxUsers = 550;
  descriptionLength = 500;
  private EMAIL_SEPARATOR_REGEXP = /[;,\s]/ig;

  constructor(
    private app: AppService,
    public TopicService: TopicService,
    public translate: TranslateService,
    public GroupService: GroupService,
    private Notification: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: DialogService,
    private Search: SearchService,
    private GroupInviteUser: GroupInviteUserService,
    public GroupMemberTopicService: GroupMemberTopicService,
    private config: ConfigService) {
    this.app.darkNav = true;
    this.tabSelected = this.route.fragment.pipe(
      map((fragment) => {
        if (!fragment) {
          return this.selectTab('info')
        }
        return fragment
      }
      ));
  }

  selectTab(tab: string) {

    if (this.groupAddTopics) {
      this.topicsToAdd = this.groupAddTopics.membersToAdd;
    }
    this.router.navigate([], { fragment: tab });
  }

  previousTab(tab: string | void) {
    if (tab) {
      const tabIndex = this.tabs.indexOf(tab);
      if (tabIndex > 0) {
        this.selectTab(this.tabs[tabIndex - 1]);
      }
    }
  }

  nextTab(tab: string | void) {
    if (tab) {
      const tabIndex = this.tabs.indexOf(tab);
      if (tabIndex > -1 && tabIndex < 3) {
        this.selectTab(this.tabs[tabIndex + 1]);
      }
    }
  }

  chooseCategory(category: string) {
    if (this.group.categories && this.group.categories.indexOf(category) > -1) {
      this.group.categories.splice(this.group.categories.indexOf(category), 1);
    } else {
      this.group.categories?.push(category);
    }
  }

  removeRule(index: number) {
    this.rules?.splice(index, 1);
  }

  addRule() {
    this.rules?.push({ rule: '' });
  }

  ngOnInit(): void {
  }

  fileUpload() {
    const files = this.fileInput?.nativeElement.files;
    this.uploadedImage = files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      await this.resizeImage(reader.result as string).then((res: any) => {
        this.tmpImageUrl = res.imageUrl;
        this.imageFile = res.file;
      });
    };
    reader.readAsDataURL(files[0]);

  }
  resizeImage(imageURL: any): Promise<any> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        if (ctx != null) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, image.width, image.height,
            0, 0, 320, 320);
        }
        var data = canvas.toDataURL('image/jpeg', 1);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'profileimage.jpg', { type: "image/jpeg" });
            canvas.remove();
            resolve({ file: file, imageUrl: data });
          }
        }, 'image/jpeg');
      };
      image.src = imageURL;
    });
  }

  fileDroped(files: any) {
    this.uploadedImage = files[0];
  }
  uploadImage() {
    this.fileInput?.nativeElement.click();
  };

  deleteGroupImage() {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = null;
    }
    this.uploadedImage = null;
    this.imageFile = null;
  }

  imageChange(image: any) {
    this.imageFile = image;
  }

  createGroup() {
    this.errors = null;
    const saveGroup = Object.assign({}, this.group);
    saveGroup['rules'] = this.rules?.map(rule => rule.rule).filter((rule) => !!rule);
    const afterCreate = (group: Group) => {
      this.group = Object.assign(this.group, group);
      if (this.imageFile) {
        this.GroupService
          .uploadGroupImage(this.imageFile, this.group.id).pipe(
            takeWhile((e) => !e.link, true)
          )
          .subscribe((res: any) => {
            if (res.link) {
              this.hasChanges$.next(false);
              this.group.imageUrl = res.link;

              this.dialog.closeAll();
              this.GroupService.reset();
              this.router.navigate(['/groups', group.id]);
            }
          });
      } else {
        this.hasChanges$.next(false);
        this.GroupService.reset();
        this.router.navigate(['/groups', group.id]);
      }

      this.doInviteMembers();
      this.doAddTopics();
      setTimeout(() => {
        this.Notification.addSuccess('VIEWS.GROUP_CREATE.NOTIFICATION_SUCCESS_MESSAGE', 'VIEWS.GROUP_CREATE.NOTIFICATION_SUCCESS_TITLE');
      }, 500);
    }
    if (!this.group.id) {
      this.GroupService.save(saveGroup).pipe(take(1))
        .subscribe({
          next: (group) => {
            this.group = Object.assign(this.group, group);
            afterCreate(group);
          },
          error: (errorResponse) => {
            if (errorResponse && errorResponse.errors) {
              this.errors = errorResponse.errors;
            }
          }
        });
    } else {
      this.GroupService.update(saveGroup).pipe(take(1))
        .subscribe({
          next: (group) => {
            this.group = Object.assign(this.group, group);
            afterCreate(group);
          },
          error: (errorResponse) => {
            if (errorResponse && errorResponse.errors) {
              this.errors = errorResponse.errors;
            }
          }
        });
    }
  }

  doInviteMembers() {
    // Users
    const groupMemberUsersToInvite = <any[]>[];
    this.group.members.users.forEach((member: any) => {
      groupMemberUsersToInvite.push({
        userId: member.userId || member.id,
        level: member.level,
        inviteMessage: this.group.inviteMessage
      })
    });

    if (groupMemberUsersToInvite.length) {
      this.GroupInviteUser.save({ groupId: this.group.id }, groupMemberUsersToInvite)
        .pipe(take(1))
        .subscribe(res => {
        })
    }

  }

  doAddTopics() {
    // Topics
    this.errors = null;
    const topicsToAdd = <any>{};
    this.topicsToAdd.forEach((topic: Topic) => {
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
          error: (errorResponse: any) => {
            if (errorResponse && errorResponse.errors) {
              this.errors = errorResponse.errors;
            }
          }
        })
    }
  };

  cancel() {
    const confirmDialog = this.dialog.open(InterruptDialogComponent);

    confirmDialog.afterClosed().subscribe(result => {
      if (result === true) {
        /*this.TopicService.delete({ id: this.topic.id })
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigate(['dashboard']);
          })*/
        this.router.navigate(['/', this.translate.currentLang, 'my', 'groups']);
      }
    });
    //[routerLink]="['/', translate.currentLang, 'topics', topic.id]"
  }
}

