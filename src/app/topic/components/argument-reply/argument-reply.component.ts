import { NotificationService } from '@services/notification.service';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { take } from 'rxjs';
import { Argument } from 'src/app/interfaces/argument';
import { AuthService } from '@services/auth.service';
import { TopicArgumentService } from '@services/topic-argument.service';
import { Router } from '@angular/router';
@Component({
  selector: 'argument-reply',
  templateUrl: './argument-reply.component.html',
  styleUrls: ['./argument-reply.component.scss']
})
export class ArgumentReplyComponent {
  @Input() argument!: Argument;
  @Input() topicId!: string;
  @Input() showReply!: boolean;
  @Output() showReplyChange = new EventEmitter<boolean>();
  public reply = {
    subject: '',
    type: 'reply',
    text: ''
  };
  ARGUMENT_TYPES = Object.keys(this.TopicArgumentService.ARGUMENT_TYPES);
  ARGUMENT_TYPES_MAXLENGTH = this.TopicArgumentService.ARGUMENT_TYPES_MAXLENGTH;
  ARGUMENT_SUBJECT_MAXLENGTH = this.TopicArgumentService.ARGUMENT_SUBJECT_MAXLENGTH;
  errors = <any>null;
  constructor(public AuthService: AuthService, private readonly TopicArgumentService: TopicArgumentService, private readonly Notification: NotificationService, private readonly router: Router) {

  }

  saveReply() {
    const reply = {
      parentId: this.argument.id,
      parentVersion: (this.argument.edits.length - 1),
      type: this.reply.type,
      discussionId: this.argument.discussionId,
      subject: this.reply.subject,
      text: this.reply.text,
      topicId: this.topicId
    };

    this.errors = null;
    if (!this.reply.text.length) {
      this.Notification.removeAll();
      this.Notification.addError('COMPONENTS.ARGUMENT_REPLY.ERROR_NO_TEXT');
      return;
    }
    this.TopicArgumentService
      .save(reply)
      .pipe(take(1))
      .subscribe((reply) => {
        this.TopicArgumentService.reload();
        this.router.navigate(['/', 'topics', this.topicId], { queryParams: { argumentId: reply.id + "_v0" } });
      });

  };

  close() {
    this.showReplyChange.emit(false);
  }
}
