import { Component, Inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, of, map, tap, Observable, take, catchError, combineLatest } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer } from '@angular/platform-browser';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CookieService } from 'ngx-cookie-service';

/** Interfaces*/
import { Topic } from '@interfaces/topic';
import { Attachment } from '@interfaces/attachment';
import { Vote } from '@interfaces/vote';
import { Group } from '@interfaces/group';
import { Ideation } from '@interfaces/ideation';


/** Services*/
import { TopicEventService } from '@services/topic-event.service';
import { NotificationService } from '@services/notification.service';
import { TopicMemberGroupService } from '@services/topic-member-group.service';
import { TopicAttachmentService } from '@services/topic-attachment.service';
import { AuthService } from '@services/auth.service';
import { LocationService } from '@services/location.service';
import { UploadService } from '@services/upload.service';
import { TopicService } from '@services/topic.service';
import { TopicArgumentService } from '@services/topic-argument.service';
import { TopicVoteService } from '@services/topic-vote.service';
import { AppService } from '@services/app.service';
import { TopicMemberUserService } from '@services/topic-member-user.service';
import { TopicJoinService } from '@services/topic-join.service';
import { TourService } from '@services/tour.service';
import { TopicIdeationService } from '@services/topic-ideation.service';

/** Shared */
import { DialogService } from '@shared/dialog';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

/** Components */
import { TopicInviteDialogComponent } from './components/topic-invite/topic-invite.component';
import { TopicParticipantsComponent } from './components/topic-participants/topic-participants.component';
import { DuplicateTopicDialogComponent } from './components/duplicate-topic-dialog/duplicate-topic-dialog.component';
import { TopicVoteCreateDialogComponent } from './components/topic-vote-create/topic-vote-create.component';
import { TopicFollowUpCreateDialogComponent } from './components/topic-follow-up-create-dialog/topic-follow-up-create-dialog.component';
import { TopicAddGroupsDialogComponent } from './components/topic-add-groups/topic-add-groups.component';
import { TopicJoinComponent } from './components/topic-join/topic-join.component';
import { TopicReportReasonComponent } from './components/topic-report-reason/topic-report-reason.component';
import { InviteEditorsComponent } from './components/invite-editors/invite-editors.component';
import { TopicOnboardingComponent } from './components/topic-onboarding/topic-onboarding.component';
import { TopicDiscussionCreateDialogComponent } from './components/topic-discussion-create-dialog/topic-discussion-create-dialog.component';
import { MissingDiscussionComponent } from './components/missing-discussion/missing-discussion.component';

@Component({
  selector: 'topic',
  templateUrl: './topic.component.html',
  styleUrls: ['./topic.component.scss'],
  animations: [
    trigger('readMore', [
      state('open', style({
        maxHeight: '100%',
        transition: '0.1s max-height'
      })),
      state('closed', style({
        maxHeight: '384px',
        transition: '0.1s max-height'
      }))
    ]),
    trigger('openClose', [
      state('open', style({
        minHeight: '100%',
        maxHeight: '100%',
        transition: '0.3s ease-in-out max-height'
      })),
      state('closed', style({
        overflowY: 'hidden',
        transition: '0.3s ease-in-out max-height'
      }))
    ]),
    trigger('showTutorial', [
      state('open', style({
        bottom: 0,
        maxHeight: 'max-content'
      })),
      state('closed', style({
        bottom: '-200px',
        maxHeight: '250px'
      })),
      transition('* => closed', [
        animate('1s')
      ]),
      transition('* => open', [
        animate('1s')
      ]),
    ])
  ]
})

export class TopicComponent {
  //new
  readMoreButton = false;
  skipTour = false;
  voteEl?: ElementRef;

  @ViewChild('readMoreButton') readMoreEl?: ElementRef;
  @ViewChild('topicVote') set setVoteEl(content: ElementRef) {
    if (content) { // initially setter gets called with undefined
      this.voteEl = content;
      this.cd.detectChanges();
    }
  }
  followUpEl?: ElementRef;
  @ViewChild('topicFollowUp') set setFollowUpEl(content: ElementRef) {
    if (content) { // initially setter gets called with undefined
      this.followUpEl = content;
      this.cd.detectChanges();
    }
  }

  topicText?: ElementRef;
  @ViewChild('topicText') set content(content: ElementRef) {
    if (content) { // initially setter gets called with undefined
      this.topicText = content;
      if (content.nativeElement.offsetHeight >= 320) {
        this.readMoreButton = true;
      }
      this.cd.detectChanges();
    }
  }
  showCategories = false;
  showAttachments = false;
  showGroups = false;
  showTags = false;
  readMore = false;
  mobileActions = false;
  tabTablet = '';
  showArgumentsTablet = (window.innerWidth <= 1024);
  showVoteTablet = (window.innerWidth <= 1024);
  showFollowUpTablet = (window.innerWidth <= 1024);
  tabSelected$: Observable<string>;
  selectedTab = 'discussion';
  showTutorial = false;
  topicTitle: string = '';
  //new end
  topic$: Observable<Topic>; // decorate the property with @Input()
  groups$: Observable<Group[]>;
  vote$?: Observable<Vote>;
  ideation$?: Observable<any>;
  topicId$: Observable<string> = of('');
  events$?: Observable<any> = of([]);
  eventCount = 0;
  members$: Observable<any[]>;

  topicSocialMentions = [];
  activeCommentSection = 'arguments';
  wWidth: number = window.innerWidth;
  topicSettings = false;
  topicAttachments$ = of(<Attachment[] | any[]>[]);
  STATUSES = this.TopicService.STATUSES;
  hideTopicContent = false;
  topicStatus = this.TopicService.STATUSES.inProgress;
  constructor(
    @Inject(TranslateService) public translate: TranslateService,
    @Inject(DialogService) private readonly  DialogService: DialogService,
    public auth: AuthService,
    public TopicService: TopicService,
    @Inject(Router) private readonly router: Router,
    @Inject(ActivatedRoute) private readonly  route: ActivatedRoute,
    private readonly Upload: UploadService,
    private readonly Location: LocationService,
    private readonly NotificationService: NotificationService,
    private readonly TopicMemberUserService: TopicMemberUserService,
    private readonly TopicMemberGroupService: TopicMemberGroupService,
    public TopicAttachmentService: TopicAttachmentService,
    private readonly TopicJoinService: TopicJoinService,
    public TopicArgumentService: TopicArgumentService,
    private readonly TopicVoteService: TopicVoteService,
    private readonly TopicIdeationService: TopicIdeationService,
    public TopicEventService: TopicEventService,
    private readonly TourService: TourService,
    private readonly cd: ChangeDetectorRef,
    @Inject(DomSanitizer) private readonly sanitizer: DomSanitizer,
    public app: AppService,
    private readonly CookieService: CookieService
  ) {
    this.app.darkNav = true;
    this.tabSelected$ = combineLatest([this.route.fragment, this.route.queryParams]).pipe(
      map(([value, params]) => {
        if (this.router.url.indexOf('/ideation/') > -1) return 'ideation';
        if (params['folderId']) return 'ideation';
        if (params['argumentId']) return 'discussion';

        this.app.setPageTitle(this.topicTitle || 'META_DEFAULT_TITLE');
        setTimeout(() => {
          if (value === 'voting') {
            this.scroll(this.voteEl?.nativeElement);
          }
          if (value === 'followUp') {
            this.scroll(this.followUpEl?.nativeElement);
          }
        }, 200);
        if (this.topicStatus === this.STATUSES.ideation && !value) return 'ideation';
        if (this.topicStatus === this.STATUSES.inProgress && !value) return 'discussion';
        if (this.topicStatus === this.STATUSES.voting && !value) return 'voting';
        if (this.topicStatus === this.STATUSES.followUp && !value) return 'followUp';
        if (this.selectedTab !== value)
          this.selectTab(value ?? '');
        return value ?? 'discussion';
      })
    );

    this.topicId$ = this.route.params.pipe(
      switchMap((params) => {
        return of(params['topicId']);
      })
    );
    this.topic$ = combineLatest([this.route.params, this.route.queryParams]).pipe(
      switchMap(([params]) => {
        return this.TopicService.loadTopic(params['topicId']);
      }),
      tap((topic: Topic) => {
        this.app.setPageTitle(topic.title ?? 'META_DEFAULT_TITLE');
        topic.description = topic.description.replace(/href="/gi, 'target="_blank" href="');
        this.app.topic = topic;
        this.topicTitle = topic.title ?? '';
        this.topicStatus = topic.status;
        if (topic.report?.moderatedReasonType) {
          // NOTE: Well.. all views that are under the topics/view/votes/view would trigger doble overlays which we don't want
          // Not nice, but I guess the problem starts with the 2 views using same controller. Ideally they should have a parent controller and extend that with their specific functionality
          this.DialogService.closeAll();
          this.hideTopicContent = true;
        }
        if (topic.voteId) {
          this.vote$ = this.TopicVoteService.loadVote({ topicId: topic.id, voteId: topic.voteId });
          this.cd.detectChanges();
        }
        if (topic.ideationId) {
          this.ideation$ = this.TopicIdeationService.loadIdeation({ topicId: topic.id, ideationId: topic.ideationId });
          this.cd.detectChanges();
        }
        if (topic.status === this.TopicService.STATUSES.followUp || topic.status === this.TopicService.STATUSES.closed) {
          this.events$ = TopicEventService.loadEvents({ topicId: topic.id }).pipe(map(events => {
            console.log('LOAD', events);
            this.eventCount = events.count;
            return events.rows;
          }));
        }
        if (topic.status === this.TopicService.STATUSES.inProgress && !topic.discussionId && this.canUpdate(topic)) {
          const missingdiscussion = this.DialogService.open(MissingDiscussionComponent, {
            data: {topic}
          });

          missingdiscussion.afterClosed().subscribe((isAdded) => {
            if (isAdded)
              this.TopicService.reloadTopic();
          })
        }

        const padURL = new URL(topic.padUrl);
        if (padURL.searchParams.get('lang') !== this.translate.currentLang) {
          padURL.searchParams.set('lang', this.translate.currentLang);
        }
        padURL.searchParams.set('theme', 'default');
        topic.padUrl = padURL.href; // Change of PAD URL here has to be before $sce.trustAsResourceUrl($scope.topic.padUrl);
        if (!this.CookieService.get('show-topic-tour')) {
          setTimeout(() => {
            if (window.innerWidth < 560) {
              this.showTutorial = false;
            } else {
              this.showTutorial = true;
            }
          }, 500);

          this.CookieService.set('show-topic-tour', 'true', 36500);
        } else {
          this.showTutorial = false;
        }
        this.TopicArgumentService.setParam('topicId', topic.id);
        this.TopicArgumentService.setParam('discussionId', topic.discussionId);
        this.TopicArgumentService.loadItems().pipe(
          tap((args) => {
            if (!args.length && [this.TopicService.STATUSES.inProgress, this.TopicService.STATUSES.ideation].indexOf(topic.status) === -1) {
              if (!this.route.snapshot.fragment || this.route.snapshot.fragment === 'discussion') {
                this.router.navigate([], { fragment: 'voting', queryParams: this.route.snapshot.queryParams });
              }
            }
            if (topic.status === this.TopicService.STATUSES.draft) {
              this.router.navigate(['topics', 'edit', topic.id]);
            }

            if (Object.keys(this.route.snapshot.queryParams).indexOf('notificationSettings') > -1) {
              this.app.doShowTopicNotificationSettings(topic.id);
            }
          })
        );
        return topic;
      }),
      catchError((err) => {
        this.DialogService.closeAll();
        if (!auth.loggedIn$.value) {
          router.navigate(['404'], { queryParams: { redirectSuccess: window.location.href } })
          app.doShowLogin(window.location.href)
        }
        return of(err);
      })
    );
    //needs API implementation
    this.groups$ = this.route.params.pipe(
      switchMap((params) => {
        this.TopicMemberGroupService.setParam('topicId', params['topicId']);
        return this.TopicMemberGroupService.loadItems();
      })
    );

    this.members$ = combineLatest([this.route.params, this.TopicMemberUserService.reload$]).pipe(
      switchMap(([params]) => {
        this.TopicMemberUserService.setParam('topicId', params['topicId']);
        return this.TopicMemberUserService.loadItems();
      })
    );
    this.topicAttachments$ = this.topicId$.pipe(
      switchMap((topicId: string) => {
        this.TopicAttachmentService.setParam('topicId', topicId);
        return this.TopicAttachmentService.loadItems();
      })
    );
  }

  ngAfterViewInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    if (window.innerWidth <= 1024 && !this.CookieService.get('show-topic-tour')) {
      this.skipTour = true;
      setTimeout(() => {
        this.DialogService.closeAll();
        const onBoarding = this.DialogService.open(TopicOnboardingComponent);
        this.app.mobileTutorial = true;
        onBoarding.afterClosed().subscribe((skip) => {
          if (skip) {
            this.showTutorial = false;
            this.skipTour = false;
          }
          this.app.mobileTutorial = false
          this.CookieService.set('show-topic-tour', 'true', 36500)
        });
      });
    } else {
      setTimeout(() => {
        this.showTutorial = false;
      }, 5000);
    }
  }

  reportReasonDialog(topic: Topic) {
    this.DialogService.open(TopicReportReasonComponent, {
      data: {
        report: {
          moderatedReasonText: topic.report?.moderatedReasonText ?? topic.report?.text,
          moderatedReasonType: topic.report?.moderatedReasonType ?? topic.report?.type,
        }
      }
    })
  }

  dialogsOpen() {
    return this.DialogService.openDialogs.length;
  }

  deleteTopic(topic: Topic) {
    this.TopicService.doDeleteTopic(topic, ['my', 'topics']);
  }

  closeTopic(topic: Topic) {
    this.TopicService.changeState(topic, "closed");
  }

  joinTopic(topic: Topic) {
    const joinDialog = this.DialogService.open(TopicJoinComponent, {
      data: {
        topic
      }
    })/*.openConfirm({
        template: '/views/modals/group_join_confirm.html',
        closeByEscape: false
    })*/
    joinDialog.afterClosed().subscribe((res) => {
      if (res === true) {
        this.TopicJoinService
          .joinPublic(topic.id).pipe(take(1)).subscribe(
            {
              next: (res) => {
                topic.permission.level = res.userLevel;
                this.TopicService.reloadTopic();
              },
              error: (err) => {
                console.error('Failed to join Topic', err)
              }
            }
          )
      }

    });
  }

  leaveTopic(topic: Topic) {
    const leaveDialog = this.DialogService.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_HEADING',
        description: 'MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_TXT_ARE_YOU_SURE',
        points: ['MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_TXT_LEAVING_TOPIC_DESC'],
        confirmBtn: 'MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_BTN_YES',
        closeBtn: 'MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_BTN_NO'
      }
    });
    leaveDialog.afterClosed().subscribe(result => {
      if (result === true) {
        this.TopicMemberUserService
          .delete({ id: this.auth.user.value.id, topicId: topic.id })
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigate([this.translate.currentLang, 'my', 'topics']);
          });
      }
    });
  };

  getArgumentPercentage(count: number) {
    return count / (this.TopicArgumentService.count.value.pro + this.TopicArgumentService.count.value.con) * 100 || 0;
  }

  sanitizeURL(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  currentUrl() {
    return this.Location.currentUrl();
  }

  toggleFavourite(topic: Topic) {
    this.TopicService.toggleFavourite(topic);
  }

  takeTour() {
    this.showTutorial = false;
    window.scrollTo(0, 0);
    let tourName = 'topic';
    if (window.innerWidth < 560) {
      tourName = 'topic_mobile';
    } else if (window.innerWidth <= 1024) {
      tourName = 'topic_tablet';
    }
    this.TourService.show(tourName, 1);
  }

  scroll(el: HTMLElement) {
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }

  downloadAttachment(topicId: string, attachment: Attachment) {
    if (attachment.source === this.TopicAttachmentService.SOURCES.upload) {
      return this.Upload.download(topicId, attachment.id, this.auth.user.value.id ?? '');
    }
    return window.open(attachment.link, '_blank');
  };

  ideationDeadlineBar(ideation: Ideation) {
    const start = new Date(ideation.createdAt);
    const end = new Date(ideation.deadline ?? new Date());
    const diff = end.getTime() - start.getTime();
    const now = new Date().getTime() - start.getTime();

    return Math.round((now / diff) * 100);
  }

  hasIdeationEndedExpired(topic: Topic, ideation: Ideation) {
    return this.TopicIdeationService.hasIdeationEndedExpired(topic, ideation);
  };

  getDaysUntil(date: Date) {
    return Math.round((new Date(date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  }

  hasVoteEndedExpired(topic: Topic, vote: Vote) {
    return this.TopicVoteService.hasVoteEndedExpired(topic, vote);
  };

  hasVoteEnded(topic: Topic, vote: Vote) {
    if ([this.STATUSES.followUp, this.STATUSES.closed].indexOf(topic.status) > -1) {
      return true;
    }

    return vote?.endsAt && new Date() > new Date(vote.endsAt);
  };

  addGroupsDialog(topic: Topic) {
    this.DialogService.open(TopicAddGroupsDialogComponent, {
      data: {
        topic: topic
      }
    });
  }

  inviteEditors(topic: Topic) {
    const inviteDialog = this.DialogService.open(InviteEditorsComponent, { data: { topic: topic } });
    inviteDialog.afterClosed().subscribe({
      next: (inviteUsers) => {
        //   this.loadInvite$.next();
      },
      error: (error) => {
        this.NotificationService.addError(error);
      }
    })
  }

  inviteMembers(topic: Topic) {
    const inviteDialog = this.DialogService.open(TopicInviteDialogComponent, { data: { topic } });
    inviteDialog.afterClosed().subscribe({
      next: (res) => {
        //   this.NotificationService.addSuccess('');
      },
      error: (error) => {
        this.NotificationService.addError(error);
      }
    })
  }

  manageParticipants(topic: Topic) {
    const participantsDialog = this.DialogService.open(TopicParticipantsComponent, { data: { topic } });
    participantsDialog.afterClosed().subscribe({
      next: (res) => {
        //   this.NotificationService.addSuccess('');
      },
      error: (error) => {
        this.NotificationService.addError(error);
      }
    })
  }

  canUpdate(topic: Topic) {
    return this.TopicService.canUpdate(topic);
  }

  duplicateTopic(topic: Topic) {
    const duplicateDialog = this.DialogService.open(DuplicateTopicDialogComponent, {
      data: {
        topic: topic
      }
    });

    duplicateDialog.afterClosed().subscribe(result => {
      if (result === true) {
        this.TopicService
          .duplicate(topic)
          .pipe(take(1))
          .subscribe((duplicate) => {
            const path = ['/', 'topics']
            if (topic.status === 'voting') {
              path.push('vote')
            } else if (topic.status === 'ideation') {
              path.push('ideation');
            }
            path.push('edit', duplicate.id);
            this.router.navigate(path, { replaceUrl: true, onSameUrlNavigation: 'reload' });
          });
      }
    })
  };

  startDiscussion(topic: Topic) {
    this.DialogService.open(TopicDiscussionCreateDialogComponent, {
      data: {
        topic: topic
      }
    });
  }

  startVote(topic: Topic) {
    this.DialogService.open(TopicVoteCreateDialogComponent, {
      data: {
        topic: topic
      }
    })
  }

  canSendToFollowUp(topic: Topic) {
    return this.TopicService.canSendToFollowUp(topic);
  }

  sendToFollowUp(topic: Topic, stateSuccess?: string) {
    this.DialogService.open(TopicFollowUpCreateDialogComponent, {
      data: {
        topic: topic
      }
    })
  };

  toggleReadMore() {
    this.readMore = !this.readMore;
    if (!this.readMore) {
      setTimeout(() => {
        this.readMoreEl?.nativeElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }, 200);
    }
  }

  selectTab(tab: string) {
    this.tabTablet = '';
    if (window.innerWidth <= 1024) {
      this.tabTablet = tab;
    }
    if (tab === 'vote') tab = 'voting';
    if (tab === 'arguments') tab = 'discussion';

    this.selectedTab = tab;
    this.router.navigate([], { fragment: tab, queryParams: this.route.snapshot.queryParams})
  }
}
