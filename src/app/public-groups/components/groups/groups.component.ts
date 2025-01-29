import { Group } from 'src/app/interfaces/group';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, switchMap, map, BehaviorSubject, combineLatest } from 'rxjs';
import { AuthService } from '@services/auth.service';
import { GroupService } from '@services/group.service';
import { countries } from '@services/country.service';
import { languages } from '@services/language.service';
import { PublicGroupService } from '@services/public-group.service';
import { GroupCreateComponent } from 'src/app/group/components/group-create/group-create.component';
import { DialogService } from 'src/app/shared/dialog';
import { AppService } from '@services/app.service';
import { trigger, state, style } from '@angular/animations';
import { Country } from 'src/app/interfaces/country';
import { Language } from 'src/app/interfaces/language';

@Component({
  selector: 'app-groups',
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.scss'],
  animations: [
    trigger('openClose', [
      state('open', style({
        'maxHeight': '450px',
        transition: '0.2s ease-in-out max-height'
      })),
      state('closed', style({
        'maxHeight': '50px',
        transition: '0.2s ease-in-out max-height'
      }))
    ])]
})
export class GroupsComponent implements OnInit {
  allGroups$: Group[] = [];
  groups$ = of(<Group[] | any[]>[]);
  moreFilters = false;
  searchInput = '';
  searchString$ = new BehaviorSubject('');

  visibilityFilter$ = new BehaviorSubject('');
  engagmentsFilter$ = new BehaviorSubject('');
  statusFilter$ = new BehaviorSubject('');
  orderFilter$ = new BehaviorSubject(<any>'');
  categoryFilter$ = new BehaviorSubject('');
  countryFilter$ = new BehaviorSubject('');
  languageFilter$ = new BehaviorSubject('');

  mobileFiltersList = false;

  countrySearch = '';
  countrySearch$ = new BehaviorSubject('');
  countries = countries.sort((a: any, b: any) => {
    return a.name.localeCompare(b.name);
  });
  countries$ = of(<Country[]>[]);

  languageSearch = '';
  languageSearch$ = new BehaviorSubject('');
  languages = languages.sort((a: any, b: any) => {
    return a.name.localeCompare(b.name);
  });
  languages$ = of(<Language[]>[]);

  filtersSet = false;

  filtersData = {
    visibility: {
      isMobileOpen: false,
      placeholder: "VIEWS.PUBLIC_GROUPS.FILTERS.VISIBILITY",
      selectedValue: "",
      preSelectedValue: "",
      items: [
        { title: 'VIEWS.PUBLIC_GROUPS.FILTERS.ALL', value: "all"},
      ]
    },
    orderBy: {
      isMobileOpen: false,
      placeholder: "VIEWS.PUBLIC_GROUPS.FILTERS.ORDER",
      selectedValue: "",
      preSelectedValue: "",
      items: [
        { title: 'VIEWS.PUBLIC_GROUPS.FILTERS.ALL', value: "all"},
        { title: 'VIEWS.PUBLIC_GROUPS.FILTERS.ORDER_RECENT_ACTIVITY', value: "activity"},
        { title: 'VIEWS.PUBLIC_GROUPS.FILTERS.MOST_ACTIVITIES', value: "activityCount"},
        { title: 'VIEWS.PUBLIC_GROUPS.FILTERS.MOST_PARTICIPANTS', value: "memberCount"},
        { title: 'VIEWS.PUBLIC_GROUPS.FILTERS.MOST_RECENT', value: "createdAt"},
        { title: 'VIEWS.PUBLIC_GROUPS.FILTERS.MOST_TOPICS', value: "topicCount"},
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

  constructor(private dialog: DialogService,
    private route: ActivatedRoute,
    private AuthService: AuthService,
    public GroupService: GroupService,
    public PublicGroupService: PublicGroupService,
    public app: AppService) {
    this.PublicGroupService.reset();

    this.groups$ = combineLatest([this.visibilityFilter$, this.engagmentsFilter$, this.statusFilter$, this.orderFilter$, this.categoryFilter$, this.countryFilter$, this.languageFilter$, this.searchString$])
      .pipe(
        switchMap(([visibilityFilter, engagmentsFilter, statusFilter, orderFilter, categoryFilter, countryFilter, languageFilter, search]) => {
          PublicGroupService.reset();
          this.allGroups$ = [];
          if (visibilityFilter) {
            if (['favourite', 'showModerated'].indexOf(visibilityFilter) > -1) {
              PublicGroupService.setParam(visibilityFilter, visibilityFilter);
            }
          }

          if (engagmentsFilter) {
            if (engagmentsFilter === 'hasVoted') {
              PublicGroupService.setParam(engagmentsFilter, true);
            } else if (engagmentsFilter === 'hasNotVoted') {
              PublicGroupService.setParam('hasVoted', false);
            } else if (engagmentsFilter === 'iCreated') {
            }
          }

          if (statusFilter) {
            PublicGroupService.setParam('statuses', [statusFilter]);
          }

          if (orderFilter) {
            PublicGroupService.setParam('orderBy', orderFilter);
            PublicGroupService.setParam('order', 'desc');
          }

          if (categoryFilter) {
            PublicGroupService.setParam('categories', [categoryFilter]);
          }

          if (countryFilter) {
            PublicGroupService.setParam('country', countryFilter);
          }
          if (languageFilter) {
            PublicGroupService.setParam('language', languageFilter);
          }

          if (search) {
            PublicGroupService.setParam('name', search);
          }

          return PublicGroupService.loadItems();
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
      const languages = this.languages.filter((language) => language.name.toLowerCase().indexOf(string.toLowerCase()) === 0);

      return [languages];
    }));

  }

  searchCountry(event: any) {
    this.countrySearch$.next(event);
  }

  searchLanguage(event: any) {
    this.languageSearch$.next(event);
  }

  addConditionalItems(): void {
    if (this.loggedIn()) {
      this.filtersData.visibility.items.push(
        { title: 'VIEWS.PUBLIC_GROUPS.FILTERS.FAVOURITED', value: "favourite" }
      );
    }
  }

  loggedIn() {
    return this.AuthService.loggedIn$.value;
  }

  ngOnInit(): void {
    this.addConditionalItems();
  }

  chooseFilterValue (type: keyof typeof this.filtersData, option: string) {
    this.filtersData[type].preSelectedValue = option;
  }

  createGroup() {
    this.dialog.open(GroupCreateComponent, {
      data: {
        visibility: this.GroupService.VISIBILITY.public
      }
    })
  }

  getActiveFilterText(key: keyof typeof this.filtersData, val: string) {
    const value = val === '' ? 'all' : val;
    return this.filtersData[key].items.find((item) => item.value === value)!.title;
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

  doSearch(search: string) {
    this.searchString$.next(search);
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

  doClearFilters() {
    const keys = this.filterKeys;
    keys.forEach((key) => {
      this.setFilterValue(key, '');
    })
  }

  loadPage(page: any) {
    this.allGroups$ = [];
    this.PublicGroupService.loadPage(page);
  }
}
