import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { switchMap, combineLatest, Observable, of, BehaviorSubject, map } from 'rxjs';
import { Group } from '@interfaces/group';
import { GroupService } from '@services/group.service';
import { AppService } from '@services/app.service';
import { AuthService } from '@services/auth.service';
import { countries } from '@services/country.service';
import { languages } from '@services/language.service';
import { state, style, trigger } from '@angular/animations';
import { Country } from '@interfaces/country';
import { Language } from '@interfaces/language';
import { TopicService } from '@services/topic.service';

@Component({
  selector: 'my-groups',
  templateUrl: './my-groups.component.html',
  styleUrls: ['./my-groups.component.scss'],
  animations: [
    trigger('openClose', [
      state('open', style({
        'maxHeight': '300px',
        transition: '0.2s ease-in-out max-height'
      })),
      state('closed', style({
        'maxHeight': '50px',
        transition: '0.2s ease-in-out max-height'
      }))
    ])]
})
export class MyGroupsComponent implements OnInit {
  public wWidth = window.innerWidth;
  groupId = <string | null>null;
  showCreate = false;
  groups$: Observable<Group[] | any[]> = of([]);
  allGroups$: Group[] = [];
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
  languageFocus = false;

  searchInput = '';
  searchString$ = new BehaviorSubject('');
  moreFilters = false;
  mobileFiltersList = false;
  filtersSet = false;

  visibilityFilter$ = new BehaviorSubject('');
  engagmentsFilter$ = new BehaviorSubject('');
  statusFilter$ = new BehaviorSubject('');
  orderFilter$ = new BehaviorSubject(<any>'');
  categoryFilter$ = new BehaviorSubject('');
  countryFilter$ = new BehaviorSubject('');
  languageFilter$ = new BehaviorSubject('');

  filtersData = {
    visibility: {
      isMobileOpen: false,
      placeholder: "VIEWS.MY_GROUPS.FILTER_VISIBILITY",
      selectedValue: "",
      preSelectedValue: "",
      items: [
        { title: 'VIEWS.MY_GROUPS.FILTER_ALL', value: "all"},
        ...Object.keys(this.GroupService.VISIBILITY).map((value) => {
          return { title: `TXT_GROUP_VISIBILITY_${value}`, value }
        }),
        { title: 'VIEWS.MY_GROUPS.FILTER_FAVOURITED', value: "favourite"},
      ]
    },
    engagements: {
      isMobileOpen: false,
      placeholder: "VIEWS.MY_GROUPS.FILTER_MY_ENGAGEMENT",
      selectedValue: "",
      preSelectedValue: "",
      items: [
        { title: 'VIEWS.MY_GROUPS.FILTER_ALL', value: "all"},
        { title: 'VIEWS.MY_GROUPS.FILTER_GROUPS_I_CREATED', value: "iCreated"},
      ]
    },
    orderBy: {
      isMobileOpen: false,
      placeholder: "VIEWS.MY_GROUPS.FILTER_ORDER",
      selectedValue: "",
      preSelectedValue: "",
      items: [
        { title: 'VIEWS.MY_GROUPS.ORDER_ALL', value: "all"},
        { title: 'VIEWS.MY_GROUPS.ORDER_RECENT_ACTIVITY', value: "activity"},
        { title: 'VIEWS.MY_GROUPS.MOST_ACTIVITIES', value: "activityCount"},
        { title: 'VIEWS.MY_GROUPS.MOST_PARTICIPANTS', value: "memberCount"},
        { title: 'VIEWS.MY_GROUPS.MOST_RECENT', value: "createdAt"},
        { title: 'VIEWS.MY_GROUPS.MOST_TOPICS', value: "topicCount"},
      ]
    },
    country: {
      isMobileOpen: false,
      placeholder: "VIEWS.MY_GROUPS.FILTER_COUNTRY",
      selectedValue: "",
      preSelectedValue: "",
      /**
       * @note Only for desktop. For mobile it looks for observable.
       */
      items: [
        { title: 'VIEWS.MY_GROUPS.FILTER_ALL', value: "all"},
        ...this.countries.map((it) => {
          return { title: it.name, value: it.name }
        }),
      ]
    },
    language: {
      isMobileOpen: false,
      placeholder: "VIEWS.MY_GROUPS.FILTER_LANGUAGE",
      selectedValue: "",
      preSelectedValue: "",
      /**
       * @note Only for desktop. For mobile it looks for observable.
       */
      items: [
        { title: 'VIEWS.MY_GROUPS.FILTER_ALL', value: "all"},
        ...this.languages.map((it) => {
          return { title: it.name, value: it.name }
        }),
      ]
    },
  };

  get filterKeys() {
    return Object.keys(this.filtersData) as Array<keyof typeof this.filtersData>;
  }

  get hasMobileOpen() {
    return Object.values(this.filtersData).some((filter) => filter.isMobileOpen);
  }

  constructor(
    public Topic: TopicService,
    public app: AppService,
    public auth: AuthService,
    public GroupService: GroupService,
    public translate: TranslateService,
  ) {
    this.groups$ = combineLatest([this.visibilityFilter$, this.engagmentsFilter$, this.statusFilter$, this.orderFilter$, this.categoryFilter$, this.countryFilter$, this.languageFilter$, this.searchString$])
    .pipe(
      switchMap(([visibilityFilter, engagmentsFilter, statusFilter, orderFilter, categoryFilter, countryFilter, languageFilter, search]) => {
        GroupService.reset();
        this.allGroups$ = [];
        if (visibilityFilter) {
          if (Object.keys(GroupService.VISIBILITY).indexOf(visibilityFilter) > -1) {
            GroupService.setParam('visibility', visibilityFilter);
          } else if (['favourite', 'showModerated'].indexOf(visibilityFilter) > -1) {
            GroupService.setParam(visibilityFilter, visibilityFilter);
          }
        }

        if (engagmentsFilter) {
          if (engagmentsFilter === 'iCreated') {
            GroupService.setParam('creatorId', this.auth.user.value.id);
          }
        }

        if (statusFilter) {
          GroupService.setParam('statuses', [statusFilter]);
        }

        if (orderFilter) {
          GroupService.setParam('orderBy', orderFilter);
          GroupService.setParam('order', 'desc');
        }

        if (categoryFilter) {
          GroupService.setParam('categories', [categoryFilter]);
        }

        if (countryFilter) {
          GroupService.setParam('country', countryFilter);
        }
        if (languageFilter) {
          GroupService.setParam('language', languageFilter);
        }

        if (search) {
          console.log('SEARCH')
          GroupService.setParam('search', search);
        }

        return GroupService.loadItems();
      }), map(
        (newGroups: any) => {
          if (newGroups.length) {
            this.filtersSet = true;
          }
          this.allGroups$ = this.allGroups$.concat(newGroups);
          return this.allGroups$;
        }
      ));

    this.countries$ = this.countrySearch$.pipe(switchMap((string) => {
      const countries = this.countries.filter((country) => country.name.toLowerCase().indexOf(string.toLowerCase()) === 0);

      return [countries];
    }));

    this.languages$ = this.languageSearch$.pipe(switchMap((string) => {
      const languages = this.languages.filter((language) => language.name.toLowerCase().indexOf(string.toLowerCase())  === 0);

      return [languages];
    }));
  }

  chooseFilterValue (type: keyof typeof this.filtersData, option: string) {
    this.filtersData[type].preSelectedValue = option;
  }

  setFilterValue(filter: keyof typeof this.filtersData, val: string) {
    const value = val === 'all' ? '' : val;
    switch (filter) {
      case 'visibility':
        this.visibilityFilter$.next(value);
        break;
      case 'orderBy':
        this.orderFilter$.next(value);
        break;
      case 'engagements':
        this.engagmentsFilter$.next(value);
        break;
      case 'country':
        this.countryFilter$.next(value);
        break;
      case 'language':
        this.languageFilter$.next(value);
        break;
      default:
    }

    this.filtersData[filter].selectedValue = value;
  }

  showCreateMenu () {
    this.showCreate = !this.showCreate;
  }

  closeMobileFilter() {
    const keys = this.filterKeys;

    keys.forEach((key) => {
      this.filtersData[key].isMobileOpen = false;
      this.filtersData[key].preSelectedValue = "";
      switch(key) {
        case "language": {
          this.languageSearch$.next(this.languageSearch);
          break;
        }
        case "country": {
          this.countrySearch$.next(this.countrySearch);
          break;
        }
        default:
      }
    })
  }

  getActiveFilterText(key: keyof typeof this.filtersData, val: string) {
    const value = val === '' ? 'all' : val;
    return this.filtersData[key].items.find((item) => item.value === value)!.title;
  }

  doClearFilters() {
    const keys = this.filterKeys;
    keys.forEach((key) => {
      this.setFilterValue(key, '');
    })
  }

  doSearch(search: string) {
    this.searchString$.next(search);
  }

  ngOnInit(): void {
  }

  searchCountry(event: any) {
    this.countrySearch$.next(event);
  }

  searchLanguage(event: any) {
    this.languageSearch$.next(event);
  }

  loadPage(page: any) {
    this.allGroups$ = [];
    this.GroupService.loadPage(page);
  }
}
