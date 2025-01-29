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

  moreFilters = false;
  searchInput = '';
  searchString$ = new BehaviorSubject('');
  topics$ = of(<Topic[] | any[]>[]);
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
  statusFilter$ = new BehaviorSubject('');
  orderFilter$ = new BehaviorSubject('');
  categoryFilter$ = new BehaviorSubject('');
  countryFilter$ = new BehaviorSubject('');
  languageFilter$ = new BehaviorSubject('');

  mobileFiltersList = false;

  allTopics$: Topic[] = [];
  destroy$ = new Subject<boolean>();

  filtersData = {
    status: {
      isMobileOpen: false,
      placeholder: "COMPONENTS.PUBLIC_TOPICS.FILTER_STATUS",
      selectedValue: "",
      preSelectedValue: "",
      items: [
        { title: 'TXT_TOPIC_STATUS_ALL', value: "all"},
        { title: 'COMPONENTS.PUBLIC_TOPICS.FILTER_TOPICS_MODERATED', value: "showModerated"},
        ...Object.keys(this.Topic.STATUSES).map((status) => {
          return { title: `TXT_TOPIC_STATUS_${status}`, value: status }
        }),
      ]
    },
    category: {
      isMobileOpen: false,
      placeholder: "COMPONENTS.PUBLIC_TOPICS.FILTER_CATEGORIES",
      selectedValue: "",
      preSelectedValue: "",
      items: [
        { title: 'TXT_TOPIC_CATEGORY_ALL', value: "all"},
        ...Object.keys(this.Topic.CATEGORIES).map((cat) => {
          return { title: `TXT_TOPIC_CATEGORY_${cat}`, value: cat }
        }),
      ]
    },
    country: {
      isMobileOpen: false,
      placeholder: "VIEWS.MY_TOPICS.FILTER_COUNTRY",
      selectedValue: "",
      preSelectedValue: "",
      /**
       * @note Only for desktop. For mobile it looks for observable.
       */
      items: [
        { title: 'VIEWS.MY_TOPICS.FILTER_ALL', value: "all"},
        ...this.countries.map((it) => {
          return { title: it.name, value: it.name }
        }),
      ]
    },
    language: {
      isMobileOpen: false,
      placeholder: "VIEWS.MY_TOPICS.FILTER_LANGUAGE",
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

  ngOnInit(): void {
  }

  loadPage(page: any) {
    this.allTopics$ = [];
    this.PublicTopicService.loadPage(page);
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

  chooseFilterValue (type: keyof typeof this.filtersData, option: string) {
    this.filtersData[type].preSelectedValue = option;
  }

  setFilterValue(filter: keyof typeof this.filtersData, val: string) {
    const value = val === 'all' ? '' : val;
    switch (filter) {
      case 'status':
        this.statusFilter$.next(value);
        break;
      case 'category':
        this.categoryFilter$.next(value);
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

  doClearFilters() {
    const keys = this.filterKeys;
    keys.forEach((key) => {
      this.setFilterValue(key, '');
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }

  doSearch(search: string) {
    this.searchString$.next(search);
  }
}
