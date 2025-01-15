import { Component, Inject } from '@angular/core';
import { UserTopicService } from '@services/user-topic.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, map, of, switchMap } from 'rxjs';
import { Topic } from '../interfaces/topic';
import { AppService } from '@services/app.service';
import { TopicService } from '@services/topic.service';
import { trigger, state, style } from '@angular/animations';
import { countries } from '@services/country.service';
import { languages } from '@services/language.service';
import { Country } from '@interfaces/country';
import { Language } from '@interfaces/language';

@Component({
  selector: 'my-topics',
  templateUrl: './my-topics.component.html',
  styleUrls: ['./my-topics.component.scss'],
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
export class MyTopicsComponent {
  wWidth = window.innerWidth;
  moreFilters = false;
  searchInput = '';
  searchString$ = new BehaviorSubject('');
  topics$ = of(<Topic[] | any[]>[]);

  allTopics$: Topic[] = [];
  topicFilters = {
    visibility: '',
    category: '',
    status: '',
    country: '',
    orderBy: '',
    engagements: '',
    language: ''
  };

  topicTypeFilter$ = new BehaviorSubject('');
  engagmentsFilter$ = new BehaviorSubject('');
  statusFilter$ = new BehaviorSubject('');
  orderFilter$ = new BehaviorSubject('');
  categoryFilter$ = new BehaviorSubject('');
  countryFilter$ = new BehaviorSubject('');
  languageFilter$ = new BehaviorSubject('');

  mobileFilters: any = {
    type: false,
    category: false,
    status: false,
    orderBy: false,
    engagements: false,
    country: false,
    language: false,
  }

  mobileFiltersList = false;
  showCreate = false;
  categories$ = Object.keys(this.Topic.CATEGORIES);

  statuses$ = Object.keys(this.Topic.STATUSES);
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

  constructor(
    public Topic: TopicService,
    public UserTopicService: UserTopicService,
    public route: ActivatedRoute,
    private router: Router,
    public auth: AuthService,
    public app: AppService,
    @Inject(TranslateService) public translate: TranslateService
  ) {

    this.topics$ = combineLatest([this.topicTypeFilter$, this.engagmentsFilter$, this.statusFilter$, this.orderFilter$, this.categoryFilter$, this.countryFilter$, this.languageFilter$, this.searchString$])
      .pipe(
        switchMap(([topicTypeFilter, engagmentsFilter, statusFilter, orderFilter, categoryFilter, countryFilter, languageFilter, search]) => {
          UserTopicService.reset();
       //   UserTopicService.setParam('include', ['vote', 'event']);
          this.allTopics$ = [];
          if (topicTypeFilter) {
            if (UserTopicService.VISIBILITY.indexOf(topicTypeFilter) > -1) {
              UserTopicService.setParam('visibility', topicTypeFilter);
            } else if (['favourite', 'showModerated'].indexOf(topicTypeFilter) > -1) {
              UserTopicService.setParam(topicTypeFilter, topicTypeFilter);
            }
          }

          if (engagmentsFilter) {
            if (engagmentsFilter === 'hasVoted') {
              UserTopicService.setParam(engagmentsFilter, true);
            } else if (engagmentsFilter === 'hasNotVoted') {
              UserTopicService.setParam('hasVoted', false);
            } else if (engagmentsFilter === 'iCreated') {
              UserTopicService.setParam('creatorId', this.auth.user.value.id);
            }
          }

          if (statusFilter) {
            UserTopicService.setParam('statuses', [statusFilter]);
          }

          if (orderFilter) {
            UserTopicService.setParam('orderBy', orderFilter);
            UserTopicService.setParam('order', 'desc');
          }

          if (categoryFilter) {
            UserTopicService.setParam('categories', [categoryFilter]);
          }

          if (countryFilter) {
            UserTopicService.setParam('country', countryFilter);
          }
          if (languageFilter) {
            UserTopicService.setParam('language', languageFilter);
          }

          if (search) {
            UserTopicService.setParam('search', search);
          }

          return UserTopicService.loadItems();
        }), map(
          (newtopics: any) => {
            if (newtopics.length) {
              this.filtersSet = true;
            }
            this.allTopics$ = this.allTopics$.concat(newtopics);
            return this.allTopics$;
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

  showCreateMenu() {
    this.showCreate = !this.showCreate;
  }

  showMobileOverlay() {
    const filtersShow = Object.entries(this.mobileFilters).find(([key, value]) => {
      return !!value;
    })
    if (filtersShow) return true;

    return false;
  }

  closeMobileFilter() {
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

  searchCountry(event: any) {
    this.countrySearch$.next(event);
  }

  searchLanguage(event: any) {
    this.languageSearch$.next(event);
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

  setVisibility(visibility: string) {
    if (visibility === 'all' || typeof visibility !== 'string') visibility = '';
    this.topicTypeFilter$.next(visibility);
    this.topicFilters.visibility = visibility;
  }

  setCategory(category: string) {
    if (category === 'all' || typeof category !== 'string') category = '';
    this.categoryFilter$.next(category);
    this.topicFilters.category = category;
  }

  setFilter(filter: string) {
    if (filter === 'all' || typeof filter !== 'string') filter = '';
    this.engagmentsFilter$.next(filter);
    this.topicFilters.engagements = filter;
  }

  setCountry(country: string) {
    if (country === 'all' || typeof country !== 'string') country = '';
    this.countryFilter$.next(country);
    this.topicFilters.country = country;
  }

  setLanguage(language: string) {
    if (language === 'all' || typeof language !== 'string') language = '';
    this.languageFilter$.next(language);
    this.topicFilters.language = language;
  }

  doSearch(search: string) {
    this.searchString$.next(search);
  }

  onSelect(id: string) {
    // this.UserTopicService.filterTopics(id);
    this.router.navigate([], { relativeTo: this.route, queryParams: { filter: id } });
  }

  doClearFilters() {
    this.setVisibility('');
    this.setFilter('');
    this.orderBy('');
    this.setStatus('');
    this.setCategory('');
    this.setCountry('');
    this.setLanguage('');
  }

  loadPage(page: any) {
    this.allTopics$ = [];
    this.UserTopicService.loadPage(page);
  }
}
