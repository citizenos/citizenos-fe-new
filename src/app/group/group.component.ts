import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, tap, of, take, catchError, map, Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { DialogService } from 'src/app/shared/dialog';

import { GroupMemberUserService } from '@services/group-member-user.service';
import { GroupInviteUserService } from '@services/group-invite-user.service';
import { GroupService } from '@services/group.service';
import { GroupJoinService } from '@services/group-join.service';
import { Group } from 'src/app/interfaces/group';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '@services/auth.service';
import { TopicService } from '@services/topic.service';
import { GroupInviteDialogComponent } from './components/group-invite/group-invite.component';
import { AppService } from '@services/app.service';
import { GroupMemberTopicService } from '@services/group-member-topic.service';
import { GroupAddTopicsDialogComponent } from './components/group-add-topics/group-add-topics.component';
import { TranslateService } from '@ngx-translate/core';
import { trigger, state, style } from '@angular/animations';
import { Topic } from 'src/app/interfaces/topic';
import { User } from 'src/app/interfaces/user';
import { GroupJoinComponent } from './components/group-join/group-join.component';
import { countries } from '@services/country.service';
import { languages } from '@services/language.service';
import { GroupSettingsComponent } from './components/group-settings/group-settings.component';
import { Country } from 'src/app/interfaces/country';
import { Language } from 'src/app/interfaces/language';
import { GroupRequestTopicsComponent } from './components/group-request-topics/group-request-topics.component';
import { TopicRequestsComponent } from './components/topic-requests/topic-requests.component';

@Component({
  selector: 'group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  animations: [
    trigger('openClose', [
      // ...
      state('open', style({
        minHeight: 'min-content',
        maxHeight: 'min-content',
        transition: 'max-height 0.2s ease-in 0.2'
      })),
      state('closed', style({
        overflowY: 'hidden',
        transition: 'max-height 0.2s ease-in 0.2'
      }))
    ]),
    trigger('openSlide', [
      // ...
      state('open', style({
        minHeight: 'auto',
        'maxHeight': '400px',
        transition: 'max-height 0.2s ease-in 0.2'
      })),
      state('closed', style({
        transition: 'max-height 0.2s ease-in 0.2'
      }))
    ])]
})
export class GroupComponent implements OnInit {

  @HostListener('document:click', ['$event'])
  handleClickEvent(event:Event) {
    const target = <HTMLElement>event.target;
    if (target.parentElement?.classList.contains('option')) return;
    if (this.removeTopics && (!target.id || ['topics_area', 'group_description_wrap', 'page_header'].indexOf(target.id) > -1)) {
      this.removeTopics = false;
    }
  }

  group$;
  groupId: string = '';
  groupTitle: string = '';
  tabSelected;
  wWidth: number = window.innerWidth;
  moreInfo = false;
  topics$: Observable<Topic[] | any[]> = of([]);
  allTopics$: Topic[] = [];
  users$: Observable<User[] | any[]> = of([]);
  allMembers$ = <any[]>[];
  moreFilters = false;
  topicStatuses = Object.keys(this.TopicService.STATUSES);

  countrySearch = '';
  countrySearch$ = new BehaviorSubject('');
  countries = countries.sort((a: any, b: any) => {
    return a.name.localeCompare(b.name);
  });
  countries$ = of(<Country[]>[]);
  countryFocus = false;

  languageSearch = '';
  languageSearch$ = new BehaviorSubject('');
  languages = languages.sort((a: any, b: any) => {
    return a.name.localeCompare(b.name);
  });
  languages$ = of(<Language[]>[]);
  public FILTERS_ALL = 'all';

  topicFilters = {
    visibility: '',
    category: '',
    status: '',
    country: '',
    orderBy: '',
    engagements: '',
    language: ''
  };

  removeTopics = false;
  topicTypeFilter$ = new BehaviorSubject('');
  engagmentsFilter$ = new BehaviorSubject('');
  statusFilter$ = new BehaviorSubject('');
  orderFilter$ = new BehaviorSubject('');
  categoryFilter$ = new BehaviorSubject('');
  countryFilter$ = new BehaviorSubject('');
  languageFilter$ = new BehaviorSubject('');
  groupActions = false;
  mobileTopicFiltersList = false;
  /*
    mobileTopicFilters: any = {
      category: this.FILTERS_ALL,
      status: this.FILTERS_ALL,
      engagements: this.FILTERS_ALL,
      country: this.FILTERS_ALL,
      language: this.FILTERS_ALL
    }*/
  mobileTopicFilters: any = {
    category: false,
    status: false,
    engagements: false,
    country: false,
    language: false,
  }
  searchTopicsInput = '';
  searchTopicString$ = new BehaviorSubject('');

  searchUsersInput = '';
  searchUserString$ = new BehaviorSubject('');

  showCreate = false;
  showCreateInContent = false;
  filtersSet = false;
  addTopicsDialogOpen = false;
  constructor(public dialog: DialogService,
    public GroupService: GroupService,
    private GroupJoinService: GroupJoinService,
    private route: ActivatedRoute,
    private router: Router,
    public translate: TranslateService,
    public TopicService: TopicService,
    public GroupMemberUserService: GroupMemberUserService,
    public GroupInviteUserService: GroupInviteUserService,
    public auth: AuthService,
    public app: AppService,
    public GroupMemberTopicService: GroupMemberTopicService) {
    this.app.darkNav = true;
    this.users$ = combineLatest([this.searchUserString$, this.GroupMemberUserService.reload$]).pipe(
      switchMap(([search]) => {
        GroupMemberUserService.reset();
        GroupMemberUserService.setParam('groupId', this.groupId);
        this.allMembers$ = [];
        if (search) {
          GroupMemberUserService.setParam('search', search);
        }

        if (this.auth.loggedIn$.value && this.app.group.value?.userLevel === 'admin') {
          GroupMemberUserService.setParam('include', 'invite');
        }
        return this.GroupMemberUserService.loadItems();
      })
      , map(
        (members: any) => {
          this.allMembers$ = [];
          if (members) {
            this.allMembers$ = this.allMembers$.concat(members)
          }
          return this.allMembers$;
        }
      )
    );

    this.group$ = this.route.params.pipe<Group>(
      switchMap((params) => {
        this.groupId = <string>params['groupId'];

        GroupMemberTopicService.reset()
        GroupMemberTopicService.setParam('groupId', this.groupId);
        GroupMemberUserService.reset();
        GroupMemberUserService.setParam('groupId', this.groupId);
        return this.GroupService.loadGroup(params['groupId']).pipe(
          tap((group) => {
            this.groupTitle = group.name;
            this.app.setPageTitle(group.name);
            this.app.group.next(group);
          }),
          catchError((err: any) => {
            console.error(err);
            if (['401', '403', '404'].indexOf(err.status))
              this.router.navigate(['error/' + err.status])
            return of(err);
          })
        )
      })
    );

    this.topics$ = combineLatest([this.topicTypeFilter$, this.engagmentsFilter$, this.statusFilter$, this.orderFilter$, this.categoryFilter$, this.countryFilter$, this.languageFilter$, this.searchTopicString$])
      .pipe(
        switchMap(([topicTypeFilter, engagmentsFilter, statusFilter, orderFilter, categoryFilter, countryFilter, languageFilter, search]) => {
          if (this.addTopicsDialogOpen) {
            const topics = (<Topic[]>[]).concat(this.allTopics$);
            this.allTopics$ = [];
            return topics;
          }
          GroupMemberTopicService.reset();
          GroupMemberTopicService.setParam('groupId', this.groupId);
          GroupMemberTopicService.setParam('include', ['event']);
          this.allTopics$ = [];
          if (topicTypeFilter) {
            if (TopicService.VISIBILITY[topicTypeFilter]) {
              GroupMemberTopicService.setParam('visibility', topicTypeFilter);
            } else if (['favourite', 'showModerated'].indexOf(topicTypeFilter) > -1) {
              GroupMemberTopicService.setParam(topicTypeFilter, topicTypeFilter);
            }
          }

          if (engagmentsFilter) {
            if (engagmentsFilter === 'hasVoted') {
              GroupMemberTopicService.setParam(engagmentsFilter, true);
            } else if (engagmentsFilter === 'hasNotVoted') {
              GroupMemberTopicService.setParam('hasVoted', false);
            } else if (engagmentsFilter === 'iCreated') {
              GroupMemberTopicService.setParam('creatorId', this.auth.user.value.id);
            }
          }

          if (statusFilter) {
            GroupMemberTopicService.setParam('statuses', [statusFilter]);
          }

          if (orderFilter) {
            GroupMemberTopicService.setParam('orderBy', orderFilter);
            GroupMemberTopicService.setParam('order', 'desc');
          }

          if (categoryFilter) {
            GroupMemberTopicService.setParam('categories', [categoryFilter]);
          }

          if (countryFilter) {
            GroupMemberTopicService.setParam('country', countryFilter);
          }
          if (languageFilter) {
            GroupMemberTopicService.setParam('language', languageFilter);
          }

          if (search) {
            GroupMemberTopicService.setParam('search', search);
          }

          if (topicTypeFilter || engagmentsFilter || statusFilter || orderFilter || categoryFilter || countryFilter || languageFilter || search) {
            this.filtersSet = true;
          } else {
            this.filtersSet = false;
          }
          return GroupMemberTopicService.loadItems();
        }), map(
          (newtopics: any) => {
            this.allTopics$ = [];
            this.allTopics$ = this.allTopics$.concat(newtopics);
            if (this.allTopics$.length === 0) {
              this.removeTopics = false;
            }
            return this.allTopics$;
          }
        ));

    /*this.topics$ = combineLatest([this.route.queryParams, this.searchTopicString$]).pipe(
      switchMap(([queryParams, search]) => {
        if (!this.groupId) return [];
        GroupMemberTopicService.reset();
        GroupMemberTopicService.setParam('groupId', this.groupId);
        this.allTopics$ = [];
        if (search) {
          GroupMemberTopicService.setParam('title', search);
        }
        Object.entries(queryParams).forEach((param) => {
          GroupMemberTopicService.setParam(param[0], param[1]);
        })
        return GroupMemberTopicService.loadItems();
      }), map(
        (newtopics: any) => {
          this.allTopics$ = this.allTopics$.concat(newtopics);
          return this.allTopics$;
        }
      ));*/

    this.tabSelected = this.route.fragment.pipe(
      map((fragment) => {
        this.app.setPageTitle(this.groupTitle);
        if (!fragment) {
          return 'topics';
        }
        return fragment
      }
      ));


    this.countries$ = this.countrySearch$.pipe(switchMap((string) => {
      const countries = this.countries.filter((country) => country.name.toLowerCase().indexOf(string.toLowerCase()) > -1);

      return [countries];
    }));
    this.languages$ = this.languageSearch$.pipe(switchMap((string) => {
      const languages = this.languages.filter((language) => language.name.toLowerCase().indexOf(string.toLowerCase()) > -1);

      return [languages];
    }));
  }

  showCreateMenu() {
    this.showCreate = true;
  }

  addNewTopic() {
    this.app.createNewTopic(this.groupId);
  }

  addNewVotingTopic() {
    this.app.createNewTopic(this.groupId, 'voting');
  }

  addNewIdeationTopic() {
    this.app.createNewTopic(this.groupId, 'ideation');
  }

  closeMobileFilter() {
    const filtersShow = Object.entries(this.mobileTopicFilters).find(([key, value]) => {
      return !!value;
    })
    if (filtersShow)
      this.mobileTopicFilters[filtersShow[0]] = false;
  }

  showMobileOverlay() {
    const filtersShow = Object.entries(this.mobileTopicFilters).find(([key, value]) => {
      return !!value;
    });

    if (filtersShow) return true;

    return false;
  }

  setMemberLimit(limit: number) {
    this.GroupMemberUserService.setParam('limit', limit);
    this.GroupInviteUserService.setParam('limit', limit);
  }

  setVisibility(visibility: string) {
    if (visibility === 'all' || typeof visibility !== 'string') visibility = '';
    this.topicTypeFilter$.next(visibility);
    this.topicFilters.visibility = visibility;
  }

  orderBy(orderBy: string) {
    if (orderBy === 'all' || typeof orderBy !== 'string') orderBy = '';
    this.orderFilter$.next(orderBy);
    this.topicFilters.orderBy = orderBy;
  }

  setStatus(status: string) {
    if (status === 'all' || typeof status !== 'string') status = '';
    this.statusFilter$.next(status);
    this.topicFilters.status = status;
  }

  setCountry(country: string) {
    if (country === 'all' || typeof country !== 'string') country = '';
    this.countryFilter$.next(country);
    this.topicFilters.country = country;

    this.countrySearch$.next(country);
    this.countrySearch = country;
  }

  setLanguage(language: string) {
    if (language === 'all' || typeof language !== 'string') language = '';
    this.languageFilter$.next(language);
    this.topicFilters.language = language;

    this.languageSearch$.next(language);
    this.languageSearch = language;
  }

  searchCountry(event: any) {
    this.countrySearch$.next(event);
  }

  searchLanguage(event: any) {
    this.languageSearch$.next(event);
  }

  searchTopics(search: string) {
    this.searchTopicString$.next(search);
  }

  searchUsers(search: string) {
    this.searchUserString$.next(search);
  }

  selectTab(tab: string) {
    this.router.navigate([], { fragment: tab })
  }

  ngOnInit(): void {
  }

  doClearFilters() {
    this.setStatus('');
    this.setCountry('');
    this.orderBy('');
    this.setVisibility('');
    this.setLanguage('');
    this.filtersSet = false;
    this.topicFilters.country = this.FILTERS_ALL;
    this.topicFilters.language = this.FILTERS_ALL;

  }

  shareGroupDialog(group: Group) {
    if (this.app.group) {
      const inviteDialog = this.dialog.open(GroupInviteDialogComponent, { data: { group: group } });
      inviteDialog.afterClosed().subscribe(result => {
        this.GroupInviteUserService.reload();
      });
    }
  }

  leaveGroup() {
    const leaveDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        heading: 'MODALS.GROUP_MEMBER_USER_LEAVE_CONFIRM_TXT_ARE_YOU_SURE_CONTINUE',
        points: ['MODALS.GROUP_MEMBER_USER_LEAVE_CONFIRM_TXT_ARE_YOU_SURE'],
        confirmBtn: 'MODALS.GROUP_MEMBER_USER_LEAVE_CONFIRM_BTN_YES',
        closeBtn: 'MODALS.GROUP_MEMBER_USER_LEAVE_CONFIRM_BTN_NO'
      }
    });

    leaveDialog.afterClosed().subscribe(result => {
      if (result === true) {
        this.GroupMemberUserService
          .delete({ groupId: this.groupId, userId: this.auth.user.value.id })
          .subscribe({
            next: (result) => {
              const url = this.router.url;
              this.router.navigateByUrl('/', { skipLocationChange: true }).then(() =>
                this.router.navigateByUrl(url));
            },
            error: (err) => {
              console.error(err);
            }
          });
      }
    });
  }

  requestAddTopics(group: Group) {
    const requestAddTopicsDialog = this.dialog.open(GroupRequestTopicsComponent, {
      data: {
        group
      }
    });

    requestAddTopicsDialog.afterClosed().subscribe(result => {
      this.GroupMemberTopicService.loadItems();
      this.topicTypeFilter$.next('private');
      this.topicTypeFilter$.next('');
    });
  }
  showSettings(group: Group) {
    console.log(group);
    const settingsDialog = this.dialog.open(GroupSettingsComponent, {
      data: {
        group
      }
    });

    settingsDialog.afterClosed().subscribe(result => {
      if (result === true) {
        this.GroupService.reload();
      }
    });
  }

  deleteGroup(group: Group) {
    const deleteDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.GROUP_DELETE_CONFIRM_HEADING',
        title: 'MODALS.GROUP_DELETE_CONFIRM_TXT_ARE_YOU_SURE',
        description: 'MODALS.GROUP_DELETE_CONFIRM_TXT_NO_UNDO',
        points: ['MODALS.GROUP_DELETE_CONFIRM_TXT_GROUP_DELETED', 'MODALS.GROUP_DELETE_CONFIRM_TXT_LOSE_ACCESS'],
        confirmBtn: 'MODALS.GROUP_DELETE_CONFIRM_BTN_YES',
        closeBtn: 'MODALS.GROUP_DELETE_CONFIRM_BTN_NO'
      }
    });

    deleteDialog.afterClosed().subscribe(result => {
      if (result === true) {
        this.GroupService.delete(group)
          .pipe(take(1))
          .subscribe((res) => {
            this.router.navigate([this.translate.currentLang, 'my', 'groups']);
          })
      }
    });
  }

  addTopicDialog(group: Group) {
    this.addTopicsDialogOpen = true;
    const addTopicsDialog = this.dialog.open(GroupAddTopicsDialogComponent, {
      data: {
        group: group
      }
    });

    addTopicsDialog.afterClosed().subscribe(() => {
      this.addTopicsDialogOpen = false;
      this.doClearFilters();
    })
  }

  topicRequests(group: Group) {
    const topicRequestsDialog = this.dialog.open(TopicRequestsComponent, {
      data: {
        group: group
      }
    });
    topicRequestsDialog.afterClosed().subscribe(() => {
      this.doClearFilters();
    })
  }

  joinGroup(group: Group) {
    const joinDialog = this.dialog.open(GroupJoinComponent, {
      data: {
        group: group
      }
    })/*.openConfirm({
        template: '/views/modals/group_join_confirm.html',
        closeByEscape: false
    })*/
    joinDialog.afterClosed().subscribe((res) => {
      if (res === true) {
        this.GroupJoinService
          .joinPublic(group.id).pipe(take(1)).subscribe(
            {
              next: (res) => {
                group.userLevel = res.userLevel;
                this.GroupService.reload();
              },
              error: (err) => {
                console.error('Failed to join Topic', err)
              }
            }
          )
      }

    });
  }

  toggleFavourite(group: Group) {
    this.GroupService.toggleFavourite(group);
  }

  canUpdate(group: Group) {
    return this.GroupService.canUpdate(group);
  }

  trackByTopic(index: number, element: any) {
    return element.id;
  }

  toggleRemove() {
    this.removeTopics = !this.removeTopics;
  }

  reloadTopics(data?: any) {
    this.doClearFilters();
  }

  deleteGroupTopics(group: Group) {
    const confirmRemoveDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.GROUP_DELETE_ALL_TOPICS_CONFIRM_TXT_ARE_YOU_SURE',
        description: 'MODALS.GROUP_DELETE_ALL_TOPICS_CONFIRM_TXT_NO_UNDO',
        confirmBtn: 'MODALS.GROUP_DELETE_ALL_TOPICS_CONFIRM_YES',
        closeBtn: 'MODALS.GROUP_DELETE_ALL_TOPICS_CONFIRM_NO'
      }
    });

    confirmRemoveDialog.afterClosed().subscribe({
      next: (confirm) => {
        if (confirm) {
          this.allTopics$.forEach((topic) => {
            this.GroupMemberTopicService.delete({ topicId: topic.id, groupId: group.id }).pipe(
              take(1)
            ).subscribe({
              next: (res) => {
                this.doClearFilters();
              },
              error: (err) => {
                console.log(err);
              }
            })
          })
        }
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  deleteGroupMembers(group: Group) {
    const confirmRemoveDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.GROUP_DELETE_ALL_MEMBERS_CONFIRM_TXT_ARE_YOU_SURE',
        description: 'MODALS.GROUP_DELETE_ALL_MEMBERS_CONFIRM_TXT_NO_UNDO',
        confirmBtn: 'MODALS.GROUP_DELETE_ALL_MEMBERS_CONFIRM_YES',
        closeBtn: 'MODALS.GROUP_DELETE_ALL_MEMBERS_CONFIRM_NO'
      }
    });

    confirmRemoveDialog.afterClosed().subscribe({
      next: (confirm) => {
        if (confirm) {

          this.allMembers$.forEach((member) => {
            if (member.invite && member?.invite.id) {
              if (group) {
                console.log(member);
                const inviteData = Object.assign({groupId: group.id, inviteId: member.invite.id}, member.invite)
                this.GroupInviteUserService
                  .delete(inviteData)
                  .pipe(take(1))
                  .subscribe({
                    next: () => {
                      this.GroupMemberUserService.resetPage();
                    },
                    error: (err) => {
                      console.error(err);
                    }
                  })
              }
            }
            else if ((member.userId || member.id) !== this.auth.user.value.id) {
              this.GroupMemberUserService.delete({ groupId: group.id, userId: member.userId || member.id })
                .pipe(take(1))
                .subscribe({
                  next: (res) => {
                    this.GroupMemberUserService.resetPage();
                  },
                  error: (err) => {
                    console.log(err);
                  }
                })
            }
          })
        }
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  updateGroupMembersLevel(group: Group, level: string) {
    this.allMembers$.forEach((member) => {
      if ((member.userId || member.id) === this.auth.user.value.id) {
        return
      }
      if (member.invite && member?.invite.level !== level) {
        const oldLevel = member.invite.level;
        member.invite.level = level;
        if (group) {
          const inviteData = Object.assign({groupId: group.id, inviteId: member.invite.id}, member.invite)
          this.GroupInviteUserService
            .update(inviteData)
            .pipe(take(1))
            .subscribe({
              next: () => {
                this.GroupMemberUserService.resetPage();
              },
              error: (err) => {
                member.level = oldLevel
                console.error(err);
              }
            })
        }
      }
      else if (member && member?.level !== level) {
        const oldLevel = member.level;
        member.level = level;
        if (group) {
          this.GroupMemberUserService
            .update({ groupId: group.id, userId: member.userId || member.id }, member)
            .pipe(take(1))
            .subscribe({
              next: () => {
                this.GroupMemberUserService.resetPage();
              },
              error: (err) => {
                member.level = oldLevel
                console.error(err);
              }
            })
        }
      }
    })
  }
}
