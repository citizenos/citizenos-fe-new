import { Component, OnInit, Input, Inject } from '@angular/core';
import { DialogService, DIALOG_DATA } from 'src/app/shared/dialog';
import { NotificationService } from '@services/notification.service';
import { TopicNotificationService } from '@services/topic-notification.service';
import { TopicService } from '@services/topic.service';
import { map, Observable, take, catchError, EMPTY } from 'rxjs';
import { Topic } from 'src/app/interfaces/topic';
import { NotificationPreferences } from '@interfaces/notification-preferences.interface';

@Component({
  selector: 'topic-notification-settings',
  templateUrl: './topic-notification-settings.component.html',
  styleUrls: ['./topic-notification-settings.component.scss']
})
export class TopicNotificationSettingsComponent implements OnInit {
  @Input() topicId!: string;
  public tabSelected = 'general';

  public topic$?: Observable<Topic>;
  public settings: any;
  private static readonly DEFAULT_PREFERENCES: NotificationPreferences = {
    Topic: false,
    Discussion: false,
    DiscussionComment: false,
    TopicDiscussion: false,
    CommentVote: false,
    TopicReport: false,
    TopicVoteList: false,
    TopicEvent: false,
    Ideation: false,
    Idea: false,
    IdeaVote: false,
    TopicIdeation: false,
    IdeaComment: false,
    IdeaReport: false,
    CommentReport: false
  };

  public preferences: NotificationPreferences;

  allowNotifications = false
  constructor(
    private readonly TopicNotificationService: TopicNotificationService,
    private readonly NotificationService: NotificationService,
    private readonly Topic: TopicService,
    @Inject(DIALOG_DATA) public data: { topicId: string },
    private readonly DialogService: DialogService
  ) {
    this.topicId = data.topicId;
    this.topic$ = this.Topic.get(this.data.topicId);
    this.preferences = TopicNotificationSettingsComponent.DEFAULT_PREFERENCES;
    if (data.topicId)
      this.topicId = data.topicId;

    this.topic$ = this.Topic.get(this.data.topicId);
  }

  ngOnInit(): void {
    this.settings = this.TopicNotificationService.get({ topicId: this.topicId }).pipe(
      map((settings: any) => {
        console.log(settings)
        this.allowNotifications = settings.allowNotifications;
        this.preferences = { ...this.preferences, ...settings.preferences };
        return { ...this.settings, ...settings };
      })
    )
  }

  toggleAllNotifications() {
    let toggle = true;
    this.allowNotifications = false;
    if (Object.values(this.preferences).indexOf(false) === -1) {
      toggle = false;
    }
    Object.keys(this.preferences).forEach((key: string) => {
      if (toggle) {
        this.preferences[key as keyof NotificationPreferences] = true;
      } else {
        this.preferences[key as keyof NotificationPreferences] = false;
      }
    });
    if (toggle) {
      this.allowNotifications = true;
    }
  };

  allChecked() {
    return (Object.values(this.preferences).indexOf(false) === -1)
  };

  selectOption(options: string | string[]) {
    if (!Array.isArray(options)) options = [options];
    options.forEach((option) => {
      this.preferences[option as keyof NotificationPreferences] = !this.preferences[option as keyof NotificationPreferences];
      if (this.preferences[option as keyof NotificationPreferences] === true) {
        this.allowNotifications = true;
      }
    });
  };
  doSaveSettings() {
    const request$ = !this.allowNotifications
      ? this.TopicNotificationService.delete({ topicId: this.topicId })
      : this.TopicNotificationService.update({
          allowNotifications: this.allowNotifications,
          preferences: this.preferences,
          topicId: this.topicId
        });

    request$.pipe(
      take(1),
      catchError(error => {
        console.log(error);
        this.NotificationService.addError('MODALS.TOPIC_NOTIFICATION_SETTINGS_ERROR_SAVE');
        return EMPTY;
      })
    ).subscribe(() => {
      this.DialogService.closeAll();
    });
  }

}
