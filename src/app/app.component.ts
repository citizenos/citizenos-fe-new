import { DialogService } from 'src/app/shared/dialog';
import { Component, Inject, HostListener, ChangeDetectorRef, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { Router, PRIMARY_OUTLET, Event, NavigationStart, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Title, Meta, MetaDefinition } from '@angular/platform-browser';

import { AuthService} from '@services/auth.service';
import { AppService } from '@services/app.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { ConfigService } from '@services/config.service';
import { takeUntil, Subject, tap, map } from 'rxjs';
import * as moment from 'moment';
import { DOCUMENT } from '@angular/common';
import { NgxTranslateDebugService } from 'ngx-translate-debug';
import { PrivacyPolicyComponent } from 'src/app/account/components/privacy-policy/privacy-policy.component';
import { AddEmailComponent } from 'src/app/account/components/add-email/add-email.component';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  config$ = this.config.load();
  wWidth: number = window.innerWidth;
  destroy$ = new Subject<boolean>();

  @ViewChild('content') content?: ElementRef;
  private readonly keysPressed = <string[]>[];
  @HostListener('window:keydown', ['$event'])
  handleKeyDownEvent(event: KeyboardEvent) {
    if (this.keysPressed.indexOf(event.key) === -1) this.keysPressed.push(event.key);
    if (this.keysPressed.toString() === 'Control,Alt,Shift,T') this.translateDebug.toggleDebug();
  }
  @HostListener('window:keyup', ['$event'])
  handleKeyUpEvent(event: KeyboardEvent) {
    if (this.keysPressed.indexOf(event.key) > -1) this.keysPressed.splice(this.keysPressed.indexOf(event.key), 1);
  }

  constructor(
    private readonly router: Router,
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly title: Title,
    private readonly Meta: Meta,
    public translate: TranslateService,
    private readonly config: ConfigService,
    private readonly renderer: Renderer2,
    private readonly changeDetection: ChangeDetectorRef,
    private readonly Location: LocationService,
    private readonly Notification: NotificationService,
    private readonly auth: AuthService,
    private readonly dialog: DialogService,
    private readonly translateDebug: NgxTranslateDebugService,
    public app: AppService) {
    const languageConf = config.get('language');
    translate.addLangs(Object.keys(languageConf.list));
    translate.setDefaultLang(languageConf.default);
    this.setDefaultMetaInfo();
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event: Event) => {
        if (event && event instanceof NavigationStart) {
          app.tabletNav = false;
          app.darkNav = false;
          this.Notification.removeAll(); //Remove all notifications on navigating away
          app.showNav = false;
          app.topic = undefined;
          const parsedUrl = router.parseUrl(event.url);
          const outlet = parsedUrl.root.children[PRIMARY_OUTLET];

          const g = outlet?.segments.map(seg => seg.path) || [''];
          let langParam = g[0];
          if (translate.currentLang !== langParam && translate.getLangs().indexOf(langParam) === -1) {
            console.log((this.auth.userLang$.value || translate.currentLang || translate.getBrowserLang()) ?? translate.getDefaultLang())
            g.unshift((this.auth.userLang$.value || translate.currentLang || translate.getBrowserLang()) ?? translate.getDefaultLang());
            this.router.navigate(g, { queryParams: parsedUrl.queryParams, fragment: parsedUrl.fragment ?? undefined });
          }
          else if (translate.currentLang !== langParam) {
            if (!this.translateDebug.isDebugMode) {
              translate.use(langParam);
              moment.locale(langParam);
            }
          }
        }
        if (event && event instanceof NavigationEnd) {
          this.createRelUrls(event.url);
          this.app.setPageTitle();
        }
      });
    /* Change body class if accessibility settings are changed */
    this.app.accessibility.pipe(
      takeUntil(this.destroy$),
      map((classes: any) => {
        this.document.body.classList.remove(...this.document.body.classList);
        this.document.body.classList.add(classes.contrast);
        if (classes.text) {
          this.document.body.classList.add(classes.text);
        }
      })
    ).subscribe();
    //
    this.auth.user$.pipe(tap((user) => {
      if (user && (!user.termsVersion || user.termsVersion !== this.config.get('legal').version)) {
        const tosDialog = this.dialog.open(PrivacyPolicyComponent, {
          data: { user, new: !user.termsVersion }
        });
        tosDialog.afterClosed().subscribe(() => {
          if (!user.email) {
            const emailDialog = this.dialog.open(AddEmailComponent, {
              data: { user }
            });
            emailDialog.afterClosed().subscribe(() => {
              user.loggedIn = true;
              this.auth.user.next({ id: user.id });
              this.auth.loggedIn$.next(true);
              window.location.reload();
            })
          } else {
            window.location.reload();
          }
        });
      } else if (user && !user.email) {
        const emailDialog = this.dialog.open(AddEmailComponent, {
          data: { user }
        });
        emailDialog.afterClosed().subscribe((loggedIn) => {
          console.log(loggedIn);
          if (loggedIn) {
            user.loggedIn = true;
            this.auth.user.next({ id: user.id });
            this.auth.loggedIn$.next(true);
            window.location.reload();
          }
        })
      }
    })).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }

  displaySearch() {
    const parsedUrl = this.router.parseUrl(this.router.url);
    const outlet = parsedUrl.root.children[PRIMARY_OUTLET];

    const g = outlet?.segments.map(seg => seg.path) || [''];
    let langParam = g[0];
    if (langParam === this.translate.currentLang && g[0] === 'topics') return false;
    return true;
  };


  setDefaultMetaInfo() {
    this.title.setTitle(this.translate.instant('META_DEFAULT_TITLE'));
    const tags = <MetaDefinition[]>[
      {
        rel: 'shortcut icon',
        href: this.Location.getAbsoluteUrl('/assets/imgs/favicon.ico'),
        type: 'image/x-icon'
      },
      {
        name: 'keywords',
        content: this.translate.instant('META_DEFAULT_KEYWORDS')
      },
      {
        name: 'description',
        content: this.translate.instant('META_DEFAULT_DESCRIPTION')
      },
      {
        property: 'og:title',
        content: this.translate.instant('META_DEFAULT_TITLE')
      },
      {
        property: 'og:image',
        content: this.Location.getAbsoluteUrl('/assets/imgs/logo_dark_seo.jpg'),
      },
      {
        property: 'og:description',
        content: this.translate.instant('META_DEFAULT_DESCRIPTION')
      },
      {
        property: 'og:url',
        content: this.Location.currentUrl()
      },
      {
        property: 'og:site_name',
        content: 'CitizenOS.com'
      },
    ]

    this.Meta.addTags(tags);
  };

  createRelUrls(url: string) {
    this.translate.getLangs().forEach((language) => {
      const urlItem = url.split('/');
      urlItem[1] = language;
      let link: HTMLLinkElement = this.document.createElement('link');
      const linkTags = this.document.querySelectorAll(`link[hreflang=${language}]`);
      if (linkTags.length) {
        link = <HTMLLinkElement>linkTags[0];
      } else {
        this.document.head.appendChild(link);
      }
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', language);
      link.setAttribute('href', this.Location.getAbsoluteUrl(urlItem.join('/')));
    });
  };

  isDialog () {
    return this.dialog.getOpenDialogs();
  }

  hasNotifications () {
    let count = 0;
    Object.values(this.Notification.levels).forEach((level) => {
      count += this.Notification.messages[level].length;
    })
    if (count && window.innerWidth > 1024) {
      this.renderer.setStyle(this.content?.nativeElement, 'padding-top', `${77 * count}px`);
    } else if (this.content?.nativeElement.style['padding-top'] && parseInt(this.content?.nativeElement.style['padding-top']) > 0){
      this.renderer.setStyle(this.content?.nativeElement, 'padding-top', `0`);
    }
    return count;
  }
}
