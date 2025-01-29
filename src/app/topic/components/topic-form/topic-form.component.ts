import { trigger, state, style } from '@angular/animations';
import { Component, Inject, ViewChild, ElementRef, Input, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, tap, of, take, BehaviorSubject, Observable, takeWhile, switchMap, Subject } from 'rxjs';
import { Topic } from 'src/app/interfaces/topic';
import { TopicService } from '@services/topic.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { DialogService } from 'src/app/shared/dialog';
import { GroupService } from '@services/group.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Group, TopicMemberGroup } from 'src/app/interfaces/group';
import { TranslateService } from '@ngx-translate/core';
import { TopicMemberGroupService } from '@services/topic-member-group.service';
import { TopicMemberUserService } from '@services/topic-member-user.service';
import { TopicInviteUserService } from '@services/topic-invite-user.service';
import { TopicParticipantsDialogComponent } from '../topic-participants/topic-participants.component';
import { InviteEditorsComponent } from '../invite-editors/invite-editors.component';
import { NotificationService } from '@services/notification.service';
import { TopicInviteDialogComponent } from '../topic-invite/topic-invite.component';
import { countries } from '@services/country.service';
import { languages } from '@services/language.service';
import { UploadService } from '@services/upload.service';
import { TopicSettingsDisabledDialogComponent } from '../topic-settings-disabled-dialog/topic-settings-disabled-dialog.component';
import { Attachment } from 'src/app/interfaces/attachment';
import { TopicAttachmentService } from '@services/topic-attachment.service';
import { GroupMemberTopicService } from '@services/group-member-topic.service';
import { TopicDiscussionService } from '@services/topic-discussion.service';
import { TopicEditDisabledDialogComponent } from '../topic-edit-disabled-dialog/topic-edit-disabled-dialog.component';
import { TopicSettingsLockedComponent } from '../topic-settings-locked/topic-settings-locked.component';

@Component({
  selector: 'topic-form',
  templateUrl: './topic-form.component.html',
  styleUrls: ['./topic-form.component.scss'],
  animations: [
    trigger('readMore', [
      state('open', style({
        maxHeight: '100%',
        transition: '0.1s max-height'
      })),
      state('closed', style({
        maxHeight: '320px',
        transition: '0.1s max-height'
      }))
    ]),
    trigger('openClose', [
      // ...
      state('open', style({
        minHeight: 'min-content',
        maxHeight: 'min-content',
        transition: '0.2s ease-in-out max-height'
      })),
      state('closed', style({
        transition: '0.2s ease-in-out max-height'
      }))
    ]),
    trigger('openSlide', [
      // ...
      state('open', style({
        minHeight: 'auto',
        'maxHeight': '400px',
        transition: '0.2s ease-in-out max-height'
      })),
      state('closed', style({
        minHeight: '80px',
        'maxHeight': '80px',
        transition: '0.2s ease-in-out max-height'
      }))
    ])]
})
export class TopicFormComponent {
  topicText?: ElementRef
  readMoreButton = new BehaviorSubject(false);
  isCreatedFromGroup = false;
  @ViewChild('topicTitle') titleInput!: ElementRef;
  @ViewChild('topicIntro') introInput!: ElementRef;
  @ViewChild('topicText') set content(content: ElementRef) {
    if (content) { // initially setter gets called with undefined
      this.topicText = content;
      if (content.nativeElement.offsetHeight >= 320) {
        this.readMoreButton.next(true);
      } else {
        const contentChilds = content.nativeElement.children[2]?.children;
        let h = 0;
        for (const child of contentChilds) {
          h += child.offsetHeight;
          if (h >= 320) {
            this.readMoreButton.next(true);
            break;
          }
        }
      }
      this.cd.detectChanges();
    }
  }
  @ViewChild('imageUpload') fileInput?: ElementRef;
  @Input() topic!: Topic;
  @Input() groupId?: string;
  @Input() isnew?: boolean = true;
  @Input() hasUnsavedChanges!: Subject<boolean>;
  hasChanges$ = new BehaviorSubject(<boolean>true);
  topicUrl = <SafeResourceUrl>'';
  tabSelected;
  tabs = ['info', 'settings', 'discussion', 'preview'];

  tags = <string[]>[];
  showManageEditors = false;
  block = {
    attachments: false,
    headerImage: false,
    title: false,
    intro: false,
    description: false
  }

  titleLimit = 100;
  introLimit = 500;

  tmpImageUrl?: string;
  imageFile?: any;

  VISIBILITY = this.TopicService.VISIBILITY;
  CATEGORIES = Object.keys(this.TopicService.CATEGORIES);
  groups$: Observable<TopicMemberGroup[] | any[]> = of([]);
  groupsList = <TopicMemberGroup[]>[];
  loadMembers$ = new BehaviorSubject<void>(undefined);
  members$: Observable<any[]> = of([]);
  loadInvite$ = new BehaviorSubject<void>(undefined);
  invites$: Observable<any[]> = of([]);
  topicGroups = <TopicMemberGroup[]>[];

  readMore = false;

  showHelp = false;
  languages = languages.sort((a: any, b: any) => {
    return a.name.localeCompare(b.name);
  });
  countries = countries.sort((a: any, b: any) => {
    return a.name.localeCompare(b.name);
  });
  downloadUrl = '';
  error: any;

  showCategories = false;
  showAttachments = false;
  showGroups = false;
  topicAttachments$ = of(<Attachment[] | any[]>[]);
  topicGroups$ = of(<TopicMemberGroup[] | any[]>[])
  memberGroups = <Group[]>[];
  groupsToRemove = <Group[]>[];
  errors?: any;

  public discussion = {
    id: '',
    creatorId: '',
    question: '',
    deadline: null,
    createdAt: '',
    updatedAt: ''
  };
  deadline = <any>null;
  numberOfDaysLeft = 0;
  endsAt = <any>{
    date: null,
    min: 0,
    h: 0,
    timeFormat: '24'
  };
  HCount = 23;
  datePickerMin = new Date();
  deadlineSelect = false;

  constructor(
    public dialog: DialogService,
    public route: ActivatedRoute,
    public router: Router,
    public UploadService: UploadService,
    public Notification: NotificationService,
    public TopicService: TopicService,
    public GroupService: GroupService,
    public GroupMemberTopicService: GroupMemberTopicService,
    public TopicMemberGroupService: TopicMemberGroupService,
    public TopicMemberUserService: TopicMemberUserService,
    public TopicInviteUserService: TopicInviteUserService,
    public TopicAttachmentService: TopicAttachmentService,
    public TopicDiscussionService: TopicDiscussionService,
    public translate: TranslateService,
    public cd: ChangeDetectorRef,
    @Inject(DomSanitizer) public sanitizer: DomSanitizer
  ) {
    route.queryParams.pipe(take(1), map((params) => this.groupId = params['groupId'])).subscribe();
    this.GroupService.reset();
    this.groups$ = this.GroupService.loadItems().pipe(
      tap((res: any) => {
        if (res.length) {
          this.GroupService.hasMore$.next(true);
        } else {
          this.GroupService.hasMore$.next(false);
        }
      }),
      map(
        (newGroups) => {
          newGroups = newGroups.filter((group: any) => group.visibility === this.GroupService.VISIBILITY.private || group.permission.level === GroupMemberTopicService.LEVELS.admin);
          newGroups.forEach((group: any) => {
            if (this.groupId && this.groupId === group.id) {
              const exists = this.topicGroups.find((mgroup) => mgroup.id === group.id);
              if (!exists) this.addGroup(group);
            }
          });
          this.groupsList = this.groupsList.concat(newGroups);
          if (this.GroupService.hasMore$.value === true) {
            this.GroupService.loadMore();
          }
          return this.groupsList;
        }
      ));

    this.tabSelected = this.route.fragment.pipe(
      map((fragment) => {
        if (!fragment) {
          return this.selectTab('info')
        }
        return fragment
      }
      ), tap((fragment) => {
        if (fragment === 'discussion' && !this.TopicService.canEditDescription(this.topic)) {
          const infoDialog = dialog.open(TopicSettingsLockedComponent);
          infoDialog.afterClosed().subscribe(() => {
            if (this.TopicService.canDelete(this.topic)) {
              this.selectTab('settings')
            } else {
              this.selectTab('preview')
            }
          });
        }
        else if (fragment === 'info' && !this.TopicService.canEditDescription(this.topic)) {
          const infoDialog = dialog.open(TopicEditDisabledDialogComponent);
          infoDialog.afterClosed().subscribe(() => {
            if (this.TopicService.canDelete(this.topic)) {
              this.selectTab('settings')
            } else {
              this.selectTab('preview')
            }
          });
        } else if (fragment === 'settings' && !this.TopicService.canDelete(this.topic)) {
          const infoDialog = this.dialog.open(TopicSettingsDisabledDialogComponent);
          infoDialog.afterClosed().subscribe(() => {
            this.selectTab('info')
          });
        }
      }));
  }

  ngOnInit() {
    this.hasUnsavedChanges.next(true);
    this.topicUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.topic.padUrl);
    this.downloadUrl = this.TopicService.download(this.topic.id);
    Object.keys(this.block).forEach((blockname) => {
      if (blockname === 'headerImage' && this.topic.imageUrl) {
        this.block[blockname] = true;
      }
      const temp = this.topic[blockname as keyof Topic];

      if (blockname === 'description') {
        const el = document.createElement('span');
        el.innerHTML = temp;
        if (el.innerText)
          this.block['description'] = true;
      } else if (temp)
        this.block[blockname as keyof typeof this.block] = true;
    });
    if (this.topic.id) {
      this.TopicInviteUserService.setParam('topicId', this.topic.id);
      this.invites$ = this.loadInvite$.pipe(
        switchMap(() => this.TopicInviteUserService.loadItems())
      );
      this.TopicMemberUserService.setParam('topicId', this.topic.id);
      this.members$ = this.loadMembers$.pipe(
        switchMap(() => this.TopicMemberUserService.loadItems()),
        tap((members) => {
          this.topic.members.users = members;
          return members;
        })
      );
      this.TopicAttachmentService.setParam('topicId', this.topic.id);
      this.topicAttachments$ = this.TopicAttachmentService.loadItems();
      this.TopicMemberGroupService.setParam('topicId', this.topic.id);
      this.topicGroups$ = this.TopicMemberGroupService.loadItems().pipe(
        tap((groups) => {
          groups.forEach((group: any) => {
            const exists = this.topicGroups.find((mgroup) => mgroup.id === group.id);
            if (!exists) this.topicGroups.push(group);
          });

          this.memberGroups = groups;
        })
      );
      if (this.topic.discussionId) {
        this.TopicDiscussionService.get({ topicId: this.topic.id, discussionId: this.topic.discussionId }).pipe(take(1)).subscribe({
          next: (discussion) => {
            this.discussion = discussion;
            this.discussion.question = this.discussion.question.trim();
            if (this.discussion.deadline) {
              this.deadline = new Date(this.discussion.deadline);
              this.endsAt.date = this.discussion.deadline;
              this.endsAt.min = this.deadline.getMinutes();
              this.endsAt.h = this.deadline.getHours();
              this.setEndsAtTime();
              this.deadlineSelect = true;
            }
            this.cd.detectChanges();
          }
        });
      }
    }
  }

  sanitizeURL(): SafeResourceUrl {
    return this.topicUrl;
  }

  selectTab(tab: string) {
    this.router.navigate([], { queryParams: this.route.snapshot.queryParams, fragment: tab });
  }


  isNextDisabled(tabSelected: string | void) {
    if ((tabSelected === 'preview' && !this.TopicService.canDelete(this.topic)) || !this.topic.title || !this.topic.description || (tabSelected === 'discussion' && !this.discussion.question)) {
      return true;
    }

    return false;
  }

  nextTab(tab: string | void) {
    if (!tab) return;

    const tabIndex = this.tabs.indexOf(tab);
    if (tabIndex === -1 || tabIndex >= 3) return;

    // Validate info tab
    if (tab === 'info' && !this.validateInfoTab()) return;

    // Validate discussion tab
    if (tabIndex === 2 && !this.validateDiscussionTab()) return;

    // Handle preview tab
    if (tabIndex + 1 === 3) {
      this.loadPreviewTab();
    }

    window.scrollTo(0, 0);
    setTimeout(() => {
      this.selectTab(this.tabs[tabIndex + 1]);
    });
  }

  private validateInfoTab(): boolean {
    if (!this.topic.title) {
      this.block.title = true;
      setTimeout(() => {
        this.titleInput?.nativeElement?.parentNode.parentNode.classList.add('error');
      });
      return false;
    }
    return true;
  }

  private validateDiscussionTab(): boolean {
    if (!this.discussion.question) {
      this.Notification.removeAll();
      this.Notification.addError(this.translate.instant('VIEWS.TOPIC_CREATE.ERROR_MISSING_QUESTION'));
      return false;
    }
    return true;
  }

  private loadPreviewTab(): void {
    setTimeout(() => {
      this.TopicService.readDescription(this.topic.id).pipe(take(1)).subscribe({
        next: (topic) => {
          this.topic.description = topic.description;
        },
        error: (err) => {
          console.error(err)
        }
      });
    }, 200);
  }

  previousTab(tab: string | void) {
    window.scrollTo(0, 0);
    if (tab) {
      const tabIndex = this.tabs.indexOf(tab);
      if (tabIndex > 0) {
        this.selectTab(this.tabs[tabIndex - 1]);
      }
    }
  }

  saveImage() {
    if (this.imageFile) {
      return this.UploadService
        .uploadTopicImage({ topicId: this.topic.id }, this.imageFile).pipe(
          takeWhile((res: any) => {
            return (!res.link)
          }, true)
        );
    }
    return of(false);
  }

  fileUpload() {
    const allowedTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml'];
    const files = this.fileInput?.nativeElement.files;
    if (allowedTypes.indexOf(files[0].type) < 0) {
      this.error = { image: this.translate.instant('MSG_ERROR_FILE_TYPE_NOT_ALLOWED', { allowedFileTypes: allowedTypes.toString() }) };
      this.Notification.addError(this.translate.instant('MSG_ERROR_FILE_TYPE_NOT_ALLOWED', { allowedFileTypes: allowedTypes.toString() }));
      setTimeout(() => {
        delete this.error.image;
      }, 5000)
    } else if (files[0].size > 5000000) {
      // this.Notification.addError(this.translate.instant('MSG_ERROR_FILE_TOO_LARGE', { allowedFileSize: '5MB' }));
      this.error = { image: this.translate.instant('MSG_ERROR_FILE_TOO_LARGE', { allowedFileSize: '5MB' }) };

      setTimeout(() => {
        delete this.error.image;
      }, 5000)
    } else {
      this.imageFile = files[0];
      const reader = new FileReader();
      reader.onload = (() => {
        return (e: any) => {
          this.tmpImageUrl = e.target.result;
        };
      })();
      reader.readAsDataURL(files[0]);
    }
  }

  fileDroped(files: any) {
    this.imageFile = files[0];
    const reader = new FileReader();
    reader.onload = (() => {
      return (e: any) => {
        this.tmpImageUrl = e.target.result;
      };
    })();
    reader.readAsDataURL(files[0]);
  }

  uploadImage() {
    this.fileInput?.nativeElement.click();
  };

  deleteTopicImage() {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = null;
    }
    if (this.topic.imageUrl || this.tmpImageUrl) {
      this.topic.imageUrl = null;
      this.tmpImageUrl = undefined;
    }
  };

  showBlockTitle() {
    this.block.title = true;
    setTimeout(() => {
      this.titleInput.nativeElement.focus();
    }, 200);
  }

  showBlockIntro() {
    this.block.intro = true;
    setTimeout(() => {
      this.introInput.nativeElement.focus();
    }, 200);
  }

  deleteTopic(topicId: string) {
    /*this.TopicService.doDeleteTopic(topic, [this.Translate.currentLang, 'my', 'topics']);*/
    const deleteDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.TOPIC_DELETE_CONFIRM_HEADING',
        title: 'MODALS.TOPIC_DELETE_CONFIRM_TXT_ARE_YOU_SURE',
        description: 'MODALS.TOPIC_DELETE_CONFIRM_TXT_NO_UNDO',
        points: ['MODALS.TOPIC_DELETE_CONFIRM_TXT_TOPIC_DELETED', 'MODALS.TOPIC_DELETE_CONFIRM_TXT_DISCUSSION_DELETED', 'MODALS.TOPIC_DELETE_CONFIRM_TXT_TOPIC_REMOVED_FROM_GROUPS'],
        confirmBtn: 'MODALS.TOPIC_DELETE_CONFIRM_YES',
        closeBtn: 'MODALS.TOPIC_DELETE_CONFIRM_NO'
      }
    });
    deleteDialog.afterClosed().subscribe(result => {
      if (result === true) {
        this.hasUnsavedChanges.next(false);
        this.TopicService.delete({ id: topicId })
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigate(['my', 'topics']);
          })
      }
    });
  };

  saveAsDraft() {
    if (this.topic.status === this.TopicService.STATUSES.draft) {
      const updateTopic = { ...this.topic };
      if (!updateTopic.intro?.length) {
        updateTopic.intro = null;
      }

      this.TopicService.patch(updateTopic).pipe(take(1)).subscribe(() => {
        if (!this.discussion.id) {
          this.createDiscussion();
        } else if ([this.TopicService.STATUSES.draft, this.TopicService.STATUSES.inProgress].indexOf(this.topic.status) > -1) {
          this.updateDiscussion();
        }
        this.topicGroups.forEach((group) => {
          this.saveMemberGroup(group);
        });
        this.groupsToRemove.forEach((group: any) => {
          if (group) {
            this.TopicMemberGroupService.delete({ topicId: this.topic.id, groupId: group.id }).pipe(take(1)).subscribe();
          }
        });
        this.saveImage()
          .subscribe({
            next: (res: any) => {
              if (res && !res.link) return;
              if (res.link) {
                this.topic.imageUrl = res.link;
              }
              this.hasUnsavedChanges.next(false);
              this.router.navigate(['my', 'topics']);
              if (this.isnew) {
                this.Notification.addSuccess('VIEWS.TOPIC_CREATE.NOTIFICATION_DRAFT_SUCCESS_MESSAGE', 'VIEWS.TOPIC_CREATE.NOTIFICATION_DRAFT_SUCCESS_TITLE');
              } else {
                this.Notification.addSuccess('VIEWS.TOPIC_EDIT.NOTIFICATION_SUCCESS_MESSAGE', 'VIEWS.TOPIC_EDIT.NOTIFICATION_SUCCESS_TITLE');
              }
            },
            error: (err: any) => {
              console.log('ERROR', err);
            }
          });

      });
    }
  }

  saveMemberGroup(group: any) {
    this.GroupMemberTopicService.save({
      groupId: group.id,
      topicId: this.topic.id,
      level: group.level || this.GroupMemberTopicService.LEVELS.read
    }).pipe(take(1)).subscribe();
  }

  publish() {
    this.titleInput?.nativeElement?.parentNode.parentNode.classList.remove('error');
    if (this.TopicService.STATUSES.draft === this.topic.status) {
      this.topic.status = this.TopicService.STATUSES.inProgress;
    }
    const updateTopic = { ...this.topic };
    if (!updateTopic.intro?.length) {
      updateTopic.intro = null;
    }

    this.TopicService.patch(updateTopic).pipe(take(1)).subscribe({
      next: () => {
        this.TopicService.reloadTopic();
        this.saveImage()
          .subscribe({
            next: (res: any) => {
              if (res && !res.link) return;

              if (this.canEditDiscussion()) {
                this.topicGroups.forEach((group) => {
                  this.saveMemberGroup(group)
                });
                this.groupsToRemove.forEach((group: any) => {
                  if (group) {
                    this.TopicMemberGroupService.delete({ topicId: this.topic.id, groupId: group.id }).pipe(take(1)).subscribe();
                  }
                });
              }
              if (!this.discussion.id && this.canEditDiscussion()) {
                this.createDiscussion(true);
              } else if (this.canEditDiscussion()) {
                this.updateDiscussion(true);
              } else {
                this.hasChanges$.next(false);
                this.TopicService.reloadTopic();
              }
              this.hasUnsavedChanges.next(false);
              this.router.navigate(['/', this.translate.currentLang, 'topics', this.topic.id]);

            },
            error: (err) => {
              console.log('publish error', err)
            }
          });
      },
      error: (err: any) => {
        console.log('ERROR', err);
      }
    });
  }

  saveDiscussionSettings(discussion?: any) {
    if (discussion) {
      this.discussion = discussion;
    }
  }

  createDiscussion(updateTopicStatus?: boolean) {
    const createDiscussion: any = { topicId: this.topic.id, discussionId: this.discussion.id, ...this.discussion };
    this.TopicDiscussionService.save(createDiscussion)
      .pipe(take(1))
      .subscribe({
        next: (discussion) => {
          //   this.TopicService.reloadTopic();
          this.discussion = discussion;
          if (updateTopicStatus) {
            const isDraft = (this.topic.status === this.TopicService.STATUSES.draft);
            const updateTopic = { ...this.topic };
            updateTopic.status = this.TopicService.STATUSES.inProgress;
            this.TopicService.patch(updateTopic).pipe(take(1)).subscribe({
              next: (res) => {
                this.hasChanges$.next(false);
                this.router.navigate(['/', this.translate.currentLang, 'topics', this.topic.id]);
                this.TopicService.reloadTopic();
                if (this.isnew || isDraft) {
                  this.Notification.addSuccess('VIEWS.TOPIC_CREATE.NOTIFICATION_SUCCESS_MESSAGE', 'VIEWS.TOPIC_CREATE.NOTIFICATION_SUCCESS_TITLE');
                  this.inviteMembers();
                } else {
                  this.Notification.addSuccess('VIEWS.TOPIC_EDIT.NOTIFICATION_SUCCESS_MESSAGE', 'VIEWS.TOPIC_EDIT.NOTIFICATION_SUCCESS_TITLE');
                }
              },
              error: (err) => {
                console.log('Update status error', err);
              }
            });
          }
        },
        error: (res) => {
          this.nextTab('discussion');
          console.debug('createDiscussion() ERR', res, res.errors);
          this.errors = res.errors;
          Object.values(this.errors).forEach((message) => {
            if (typeof message === 'string')
              this.Notification.addError(message);
          });
        }
      });
  }


  updateDiscussion(updateTopicStatus?: boolean) {
    const updateDiscussion = { topicId: this.topic.id, discussionId: this.discussion.id , ...this.discussion};
    return this.TopicDiscussionService.update(updateDiscussion).pipe(take(1)).subscribe({
      next: () => {
        if (updateTopicStatus) {
          const isDraft = (this.topic.status === this.TopicService.STATUSES.draft);
          const updateTopic = { id: this.topic.id, status: this.TopicService.STATUSES.inProgress };
          this.TopicService.patch(updateTopic).pipe(take(1)).subscribe({
            next: (res) => {
              this.hasChanges$.next(false);
              this.router.navigate(['/', this.translate.currentLang, 'topics', this.topic.id]);
              this.TopicService.reloadTopic();
              if (this.isnew || isDraft) {
                this.Notification.addSuccess('VIEWS.TOPIC_CREATE.NOTIFICATION_SUCCESS_MESSAGE', 'VIEWS.TOPIC_CREATE.NOTIFICATION_SUCCESS_TITLE');
                this.inviteMembers();
              } else {
                this.Notification.addSuccess('VIEWS.TOPIC_EDIT.NOTIFICATION_SUCCESS_MESSAGE', 'VIEWS.TOPIC_EDIT.NOTIFICATION_SUCCESS_TITLE');
              }
            },
            error: (err) => {
              console.log('Update status error', err);
            }
          });
        }
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  chooseCategory(category: string) {
    if (this.topic.categories && this.topic.categories.indexOf(category) > -1) {
      this.topic.categories.splice(this.topic.categories.indexOf(category), 1);
    } else if (this.topic.categories.length < 3) {
      this.topic.categories?.push(category);
    }
  }

  addGroup(group: TopicMemberGroup) {
    const exists = this.topicGroups.find((mgroup) => mgroup.id === group.id);
    if (!exists) {
      group.level = this.GroupMemberTopicService.LEVELS.read;
      this.topicGroups.push(group);
    }
    const removeListMember = this.groupsToRemove.findIndex((g) => g.id === group.id);
    if (removeListMember > -1) {
      this.groupsToRemove.splice(removeListMember, 1);
    }
  }

  removeGroup(group: TopicMemberGroup) {
    const index = this.topicGroups.findIndex((tg) => tg.id === group.id);
    this.topicGroups.splice(index, 1);
    const member = this.memberGroups.find((g) => g.id === group.id);
    if (member) {
      this.groupsToRemove.push(member);
    }
  }

  manageMembers() {
    const manageDialog = this.dialog.open(TopicParticipantsDialogComponent, { data: { topic: this.topic } });
    manageDialog.afterClosed().subscribe({
      next: (res) => {
      },
      error: (error) => {
        console.error('ERROR MANAGE MEMBERS', error);
      }
    })
  }

  inviteEditors() {
    const inviteDialog = this.dialog.open(InviteEditorsComponent, { data: { topic: this.topic } });
    inviteDialog.afterClosed().subscribe({
      next: (inviteUsers) => {
        this.loadInvite$.next();
      },
      error: (error) => {
        // this.NotificationService.addError(error);
      }
    })
  }

  inviteMembers() {
    const inviteDialog = this.dialog.open(TopicInviteDialogComponent, { data: { topic: this.topic } });
    inviteDialog.afterClosed().subscribe({
      next: (inviteUsers) => {
        this.loadInvite$.next();
        this.Notification.removeAll();
      },
      error: (error) => {
      }
    })
  }

  setCountry(country: string) {
    this.topic.country = country;
  }
  setLanguage(language: string) {
    this.topic.language = language;
  }

  addTag(e: Event) {
    const tag = (e.target as HTMLInputElement).value;
    if (tag)
      this.tags.push(tag);
    (e.target as HTMLInputElement).value = '';
  }

  removeTag(tag: string) {
    this.tags.splice(this.tags.indexOf(tag), 1);
  }

  cancel() {
    if (this.isnew || this.topic.status === this.TopicService.STATUSES.draft) {
      this.router.navigate(['dashboard']);
    } else {
      this.router.navigate(['topics', this.topic.id]);
    }
  }

  setGroupLevel(group: TopicMemberGroup, level: string) {
    if (!group.level) group.level = level;
    group.level = level;
  }

  isGroupAdded(group: TopicMemberGroup) {
    return this.topicGroups.find((tg: TopicMemberGroup) => tg.id === group.id);
  }

  canEditDiscussion() {
    return this.TopicService.canDelete(this.topic) && (this.topic.status === this.TopicService.STATUSES.draft || this.topic.status === this.TopicService.STATUSES.inProgress);
  }

  toggleDeadline() {
    this.deadlineSelect = !this.deadlineSelect;
  }

  minHours() {
    if (new Date(this.endsAt.date).getDate() === (new Date()).getDate()) {
      const h = new Date().getHours();
      return h;
    }
    return 1;
  };

  minMinutes() {
    if (new Date(this.endsAt.date).getDate() === (new Date()).getDate()) {
      return Math.ceil(new Date().getMinutes() / 5) * 5;
    }

    return 0
  };

  setEndsAtTime() {
    this.endsAt.date = this.endsAt.date || new Date();
    this.deadline = new Date(this.endsAt.date);
    if (this.endsAt.h === 0 && this.endsAt.min === 0) {
      this.deadline = new Date(this.deadline.setDate(this.deadline.getDate() + 1));
    }

    let hour = this.endsAt.h;
    if (this.endsAt.timeFormat === 'PM') { hour += 12; }
    this.deadline.setHours(hour);
    this.deadline.setMinutes(this.endsAt.min);
    this.discussion.deadline = this.deadline;
    this.daysToVoteEnd();

    // this.setReminderOptions();
  };


  daysToVoteEnd() {
    if (this.deadline) {
      this.numberOfDaysLeft = Math.ceil((new Date(this.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    }
    return this.numberOfDaysLeft;
  };
  //To display hours in the dropdown like 01
  formatTime(val: number | string) {
    if (parseInt(val.toString()) < 10) {
      val = '0' + val;
    }

    return val;
  };

  timeFormatDisabled() {
    const now = new Date();
    const deadline = new Date(this.deadline);
    if (new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
      if (deadline.getHours() > 12) {
        return true;
      }
    }

    return false;
  }

  setTimeFormat() {
    this.HCount = 23;
    if (this.endsAt.timeFormat !== 24) {
      this.HCount = 12;
      if (this.endsAt.h > 12) {
        this.endsAt.h -= 12;
      }
    }
    this.setEndsAtTime();
  };
}
