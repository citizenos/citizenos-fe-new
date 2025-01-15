import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppService } from '@services/app.service';
import { TopicService } from '@services/topic.service';
import { PublicTopicService } from '@services/public-topic.service';
import { switchMap, map, of, Subject, BehaviorSubject, combineLatest, } from 'rxjs';
import { Topic } from 'src/app/interfaces/topic';
import { trigger, state, style } from '@angular/animations';
import { AuthService } from '@services/auth.service';
import { countries } from '@services/country.service';
import { languages } from '@services/language.service';
import { Country } from 'src/app/interfaces/country';
import { Language } from 'src/app/interfaces/language';

@Component({
  selector: 'public-topics',
  templateUrl: './topics.component.html',
  styleUrls: ['./topics.component.scss'],
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
export class TopicsComponent implements OnInit {

  //mew
  moreFilters = false;
  searchInput = '';
  searchString$ = new BehaviorSubject('');
  topics$ = of(<Topic[] | any[]>[]);
  //new
  public FILTERS_ALL = 'all';
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
  topicFilters = {
    category: '',
    orderBy: '',
    status: '',
    country: '',
    language: ''
  };
  statusFilter$ = new BehaviorSubject('');
  orderFilter$ = new BehaviorSubject('');
  categoryFilter$ = new BehaviorSubject('');
  countryFilter$ = new BehaviorSubject('');
  languageFilter$ = new BehaviorSubject('');

  mobileFilters: any = {
    category: false,
    status: false,
    orderBy: '',
    country: false,
    language: false,
  }
  mobileFiltersList = false;
  categories$ = Object.keys(this.Topic.CATEGORIES);

  statuses$ = Object.keys(this.Topic.STATUSES);
  allTopics$: Topic[] = [];
  destroy$ = new Subject<boolean>();

  constructor(
    private route: ActivatedRoute,
    private Topic: TopicService,
    public PublicTopicService: PublicTopicService,
    public auth: AuthService,
    public app: AppService) {
    this.PublicTopicService.reset();
    this.topics$ = combineLatest([this.statusFilter$, this.orderFilter$, this.categoryFilter$, this.countryFilter$, this.languageFilter$, this.searchString$])
      .pipe(
        switchMap(([statusFilter, orderFilter, categoryFilter, countryFilter, languageFilter, search]) => {
          PublicTopicService.reset();
       //   PublicTopicService.setParam('include', ['vote', 'event']);
          this.allTopics$ = [];

          if (statusFilter) {
            if (['favourite', 'showModerated'].indexOf(statusFilter) > -1) {
              PublicTopicService.setParam(statusFilter, statusFilter);
            } else {
              PublicTopicService.setParam('statuses', [statusFilter]);
            }
          }

          if (orderFilter) {
            PublicTopicService.setParam('orderBy', orderFilter);
            PublicTopicService.setParam('order', 'desc');
          }

          if (categoryFilter) {
            PublicTopicService.setParam('categories', [categoryFilter]);
          }

          if (countryFilter) {
            PublicTopicService.setParam('country', countryFilter);
          }
          if (languageFilter) {
            PublicTopicService.setParam('language', languageFilter);
          } PublicTopicService

          if (search) {
            PublicTopicService.setParam('search', search);
          }

          return PublicTopicService.loadItems();
        }), map(
          (newtopics: any) => {
            if (newtopics.length) {
              //    this.filtersSet = true;
            }
            this.allTopics$ = this.allTopics$.concat(newtopics);
            return this.allTopics$;
          }
        ));

    /*this.topics$ = combineLatest([this.route.queryParams, this.searchString$]).pipe(
      switchMap(([queryParams, search]) => {
        PublicTopicService.reset();
        this.allTopics$ = [];
        if (search) {
          PublicTopicService.setParam('title', search);
        }
        Object.entries(queryParams).forEach((param) => {
          PublicTopicService.setParam(param[0], param[1]);
        })
        return PublicTopicService.loadItems();
      }), map(
        (newtopics: any) => {
          this.allTopics$ = this.allTopics$.concat(newtopics);
          return this.allTopics$;
        }
      ));*/
    this.countries$ = this.countrySearch$.pipe(switchMap((string) => {
      const countries = this.countries.filter((country) => country.name.toLowerCase().indexOf(string?.toLowerCase()) === 0);

      return [countries];
    }));
    this.languages$ = this.languageSearch$.pipe(switchMap((string) => {
      const languages = this.languages.filter((language) => language.name.toLowerCase().indexOf(string?.toLowerCase()) === 0);

      return [languages];
    }));
  }

  searchCountry(event: any) {
    if (typeof event === 'string')
      this.countrySearch$.next(event);
  }

  searchLanguage(event: any) {
    if (typeof event === 'string')
      this.languageSearch$.next(event);
  }

  trackByFn(index: number, element: any) {
    return element.id;
  }

  orderBy(orderBy: string) {
    if (orderBy === 'all' || typeof orderBy !== 'string') orderBy = '';
    this.orderFilter$.next(orderBy);
    this.topicFilters.orderBy = orderBy;
  }

  setStatus(status: string) {
    if (status === 'all'|| typeof status !== 'string') status = '';
    this.statusFilter$.next(status);
    this.topicFilters.status = status;
  }

  setCategory(category: string) {
    if (category === 'all' || typeof category !== 'string') category = '';
    this.categoryFilter$.next(category);
    this.topicFilters.category = category;
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

  ngOnInit(): void {
  }

  loadPage(page: any) {
    this.allTopics$ = [];
    this.PublicTopicService.loadPage(page);
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

  showMobileOverlay() {
    const filtersShow = Object.entries(this.mobileFilters).find(([key, value]) => {
      return !!value;
    })
    if (filtersShow) return true;

    return false;
  }

  doClearFilters() {
    this.setStatus('');
    this.setCategory('');
    this.setCountry('');
    this.setLanguage('');
    this.searchInput = '';
    this.doSearch('');
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }

  isFilterApplied() {
    return this.topicFilters.category !== this.FILTERS_ALL || this.topicFilters.status !== this.FILTERS_ALL || this.topicFilters.country !== '' || this.topicFilters.country !== '';
  };

  //mew

  doSearch(search: string) {
    this.searchString$.next(search);
  }
}
