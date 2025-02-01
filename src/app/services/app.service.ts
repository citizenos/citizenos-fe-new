import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';
import { DialogService } from 'src/app/shared/dialog';
import { BehaviorSubject, map, take } from 'rxjs';
import { Group } from '../interfaces/group';
import { Topic } from '../interfaces/topic';
import { TopicNotificationSettingsComponent } from '../topic/components/topic-notification-settings/topic-notification-settings.component';
import { ConfigService } from './config.service';
import { TopicService } from './topic.service';
import { LocationService } from '@services/location.service';
import { TopicMemberUserService } from '@services/topic-member-user.service';
import { Router } from '@angular/router';
import { LoginDialogComponent } from '../account/components/login/login.component';
import { RegisterDialogComponent } from '../account/components/register/register.component';
import { CreateComponent } from 'src/app/core/components/create/create.component';
import { ActivityFeedDialogComponent } from '../core/components/activity-feed/activity-feed.component';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../interfaces/apiResponse';
import { Title, Meta } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

declare let hwcrypto: any;

@Injectable({
  providedIn: 'root'
})
export class AppService {
  showNav = false;
  showSearch = false;
  mobileTutorial = false;
  editMode = false;
  darkNav = false;
  mobileNavBox = false;
  tabletNav = false;
  showActivities = false;
  searchAllowed = true;
  addArgument = new BehaviorSubject(false);
  addIdea = new BehaviorSubject(false);
  showSearchResults = false;
  showSearchFiltersMobile = false; //remove after UI update
  showHelp = new BehaviorSubject(false);
  group = new BehaviorSubject<Group | undefined>(undefined);
  topic: Topic | undefined;
  topicsSettings = false;
  wWidth = window.innerWidth;

  createMenu = false;
  accessibility = new BehaviorSubject({
    contrast: 'default',
    text: ''
  });

  constructor(
    private readonly dialog: DialogService,
    private readonly Title: Title,
    private readonly Meta: Meta,
    private readonly translate: TranslateService,
    public readonly config: ConfigService,
    private readonly Location: LocationService,
    private readonly TopicService: TopicService,
    private readonly TopicMemberUserService: TopicMemberUserService,
    private readonly router: Router,
    private readonly AuthService: AuthService,
    private readonly http: HttpClient) { }

  showMobile() {
    return window.innerWidth <= 560;
  }

  doShowActivityModal(params?: any) {
    if (this.showMobile() && !params.topicId && !params.groupId) {
      this.router.navigate([this.translate.currentLang, 'activity']);
    } else {
      this.dialog.closeAll();
      const activitiesDialog = this.dialog.open(ActivityFeedDialogComponent, {
        data: params
      });
      this.showActivities = true;
      activitiesDialog.afterClosed().subscribe({
        next: () => {
          this.showActivities = false;
        }
      })
    }
  };

  doShowLogin(redirectSuccess?: string) {
    this.dialog.open(LoginDialogComponent, { data: { redirectSuccess } });
  }

  doShowRegister(email?: string) {
    this.dialog.closeAll();
    this.dialog.open(RegisterDialogComponent, {
      data: {
        email: email,
        redirectSuccess: this.Location.currentUrl()
      }
    })
  }

  doNavigateLogin(data: { redirectSuccess?: string, groupId?: string, topicId?: string }) {
    this.dialog.closeAll();
    this.router.navigate(['/account/login'], { queryParams: data });
  }

  doShowTopicNotificationSettings(topicId: string) {
    const topicSettingsDialog = this.dialog.open(TopicNotificationSettingsComponent, { data: { topicId } });
    topicSettingsDialog.afterClosed().subscribe(() => {
      this.TopicMemberUserService.reload();
    })
  }

  isTouchDevice() {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  };

  logout() {
    this.AuthService.logout()
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.AuthService.reloadUser();
          setTimeout(() => {
            this.router.navigate(['/']);
          });
        },
        error: (err) => {
          console.error('LOGOUT ERROR', err);
        }
      });
  }

  createNewTopic(groupId?: string, status?: string,) {
    const topic = <any>{};
    const url = ['topics'];
    if (status && status === 'voting') {
      url.push('vote');
    } else if (status && status === 'ideation') {
      url.push('ideation');
    }

    topic.description = '<html><head></head><body></body></html>';
    this.TopicService.save(topic)
      .pipe(take(1))
      .subscribe((topic) => {
        const redirect = url.concat(['create', topic.id])
        if (groupId) {
          console.log('redirect', groupId);
          this.router.navigate(redirect, { queryParams: { groupId }, fragment: 'info' })
        } else {
          this.router.navigate(redirect)
        }
      });
  }


  showCreateMenu() {
    if (!this.createMenu) {
      const createDialog = this.dialog.open(CreateComponent);
      createDialog.afterClosed().subscribe(() => {
        this.dialog.closeAll();
        this.createMenu = false;
      })
      this.createMenu = true;
    } else if (this.createMenu) {
      this.dialog.closeAll();
    }
  }

  hwCryptoErrorToTranslationKey(err: any) {
    const errorKeyPrefix = 'MSG_ERROR_HWCRYPTO_';
    switch (err.message) {
      case hwcrypto.NO_CERTIFICATES:
      case hwcrypto.USER_CANCEL:
      case hwcrypto.NO_IMPLEMENTATION:
        return errorKeyPrefix + err.message.toUpperCase();
      case hwcrypto.INVALID_ARGUMENT:
      case hwcrypto.NOT_ALLOWED:
      case hwcrypto.TECHNICAL_ERROR:
        console.error(err.message, 'Technical error from HWCrypto library', err);
        return errorKeyPrefix + 'TECHNICAL_ERROR';
      default:
        console.error(err.message, 'Unknown error from HWCrypto library', err);
        return errorKeyPrefix + 'TECHNICAL_ERROR';
    }
  };

  stats() {
    const path = this.Location.getAbsoluteUrlApi('/api/stats');

    return this.http.get<ApiResponse>(path, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map(res => res.data)
    );
  };

  setPageTitle(title?: string) {
    this.Title.setTitle(this.translate.instant(title || 'META_DEFAULT_TITLE'));
    this.Meta.addTag({
      property: 'og:title',
      content: this.translate.instant(title || 'META_DEFAULT_TITLE')
    });
  }
}
