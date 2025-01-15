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
      // ...
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
  mobileFilters:any = {
    visibility: false,
    my_engagement: false,
    category: false,
    orderBy: false,
    country: false,
    language: false
  }
  groupFilters = {
    visibility: '',
    my_engagement: '',
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
       //       PublicGroupService.setParam('creatorId', this.auth.user.value.id);
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

  loggedIn() {
    return this.AuthService.loggedIn$.value;
  }

  ngOnInit(): void {
  }

  createGroup() {
    this.dialog.open(GroupCreateComponent, {
      data: {
        visibility: this.GroupService.VISIBILITY.public
      }
    })
  }

  doSearch(search: string) {
    this.searchString$.next(search);
  }

  orderBy(orderBy: string) {
    if (orderBy === 'all') orderBy = '';
    this.orderFilter$.next(orderBy);
    this.groupFilters.orderBy = orderBy;
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

  showMobileOverlay () {
    const filtersShow = Object.entries(this.mobileFilters).find(([key, value]) => {
      return !!value;
    })
    if (filtersShow) return true;

    return false;
  }

  doClearFilters() {
    this.setVisibility('');
    this.orderBy('');
    this.setCountry('');
    this.setLanguage('');
    this.searchInput = '';
    this.doSearch('');
  }

  setVisibility (visibility: string) {
    if (visibility === 'all' || typeof visibility === 'boolean') visibility = '';
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

  loadPage(page: any) {
    this.allGroups$ = [];
    this.PublicGroupService.loadPage(page);
  }
}
