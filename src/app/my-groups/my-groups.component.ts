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

@Component({
  selector: 'my-groups',
  templateUrl: './my-groups.component.html',
  styleUrls: ['./my-groups.component.scss'],
  animations: [
    trigger('openClose', [
      // ...
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
  visibility = Object.values(this.GroupService.VISIBILITY);
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
  mobileFilters:any = {
    visibility: false,
    engagements: false,
    category: false,
    order: false,
    country: false,
    language: false
  }
  mobileFiltersList = false;
  filtersSet = false;

  groupFilters = {
    visibility: '',
    engagements: '',
    category: '',
    orderBy: '',
    country: '',
    language: ''
  };

  visibilityFilter$ = new BehaviorSubject('');
  engagmentsFilter$ = new BehaviorSubject('');
  statusFilter$ = new BehaviorSubject('');
  orderFilter$ = new BehaviorSubject(<any>'');
  categoryFilter$ = new BehaviorSubject('');
  countryFilter$ = new BehaviorSubject('');
  languageFilter$ = new BehaviorSubject('');

  constructor(
    public app: AppService,
    public auth: AuthService,
    private route: ActivatedRoute,
    public GroupService: GroupService,
    private router: Router,
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
  /*  this.groups$ = combineLatest([this.route.queryParams, this.searchString$]).pipe(
      switchMap(([queryParams, search]) => {
        GroupService.reset();
        if (search) {
          GroupService.setParam('search', search);
        }
        Object.entries(queryParams).forEach((param) => {
          GroupService.setParam(param[0], param[1]);
        })
        return GroupService.loadItems();
      }
      ),
      tap((groups) => {
        if(groups.length) this.filtersSet = true;
      }));*/
    this.countries$ = this.countrySearch$.pipe(switchMap((string) => {
      const countries = this.countries.filter((country) => country.name.toLowerCase().indexOf(string.toLowerCase()) === 0);

      return [countries];
    }));

    this.languages$ = this.languageSearch$.pipe(switchMap((string) => {
      const languages = this.languages.filter((language) => language.name.toLowerCase().indexOf(string.toLowerCase())  === 0);

      return [languages];
    }));
  }

  showCreateMenu () {
    this.showCreate = !this.showCreate;
  }

  showMobileOverlay () {
    const filtersShow = Object.entries(this.mobileFilters).find(([key, value]) => {
      return !!value;
    })
    if (filtersShow) return true;

    return false;
  }

  closeMobileFilter () {
    const filtersShow = Object.entries(this.mobileFilters).find(([key, value]) => {
      return !!value;
    })
    
    if (filtersShow) {
      const filterName = filtersShow[0]
      this.mobileFilters[filterName] = false;
      if (filterName === 'language') {
        this.languageSearch$.next(this.languageSearch);
      }
      if (filterName === 'country') {
        this.countrySearch$.next(this.countrySearch);
      }
    }
  }

  doClearFilters() {
    this.setVisibility('');
    this.orderBy('');
    this.setCountry('');
    this.setLanguage('');
    this.searchInput = '';
    this.doSearch('');
    this.setFilter('');
  }

  doSearch(search: string) {
    this.searchString$.next(search);
  }

  orderBy(orderBy: string) {
    if (orderBy === 'all' || typeof orderBy !== 'string') orderBy = '';
    this.orderFilter$.next(orderBy);
    this.groupFilters.orderBy = orderBy;
  }

  setFilter(filter: string) {
    if (filter === 'all' || typeof filter !== 'string') filter = '';
    this.engagmentsFilter$.next(filter);
    this.groupFilters.engagements = filter;
  }

  setVisibility (visibility: string) {
    if (visibility === 'all' || typeof visibility !== 'string') visibility = '';
    this.groupFilters.visibility = visibility;
    this.visibilityFilter$.next(visibility);
  }

  setCountry(country: string) {
    if (country === 'all' || typeof country !== 'string') country = '';
    this.countryFilter$.next(country);
    this.groupFilters.country = country;

    this.countrySearch$.next(country);
    this.countrySearch = country;
  }

  setLanguage(language: string) {
    if (language === 'all' || typeof language !== 'string') language = '';
    this.languageFilter$.next(language);
    this.groupFilters.language = language;

    this.languageSearch$.next(language);
    this.languageSearch = language;
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
