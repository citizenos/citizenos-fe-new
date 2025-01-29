import { TranslateService } from '@ngx-translate/core';
import { Component, Input, OnInit, ViewChild, ViewEncapsulation, ElementRef } from '@angular/core';
import { DialogService } from 'src/app/shared/dialog';
import { take } from 'rxjs';
import { Argument } from 'src/app/interfaces/argument';
import { AuthService } from '@services/auth.service';
import { ConfigService } from '@services/config.service';
import { LocationService } from '@services/location.service';
import { TopicArgumentService } from '@services/topic-argument.service';
import { NotificationService } from '@services/notification.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { ArgumentReactionsComponent } from '../argument-reactions/argument-reactions.component';
import { ArgumentReportComponent } from '../argument-report/argument-report.component';
import { TopicMemberUserService } from '@services/topic-member-user.service';
@Component({
  selector: 'argument',
  templateUrl: './argument.component.html',
  styleUrls: ['./argument.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ArgumentComponent implements OnInit {
  @ViewChild('argumentBody') argumentBody!: ElementRef;
  @Input() argument!: any;
  @Input() canReply!: any;
  @Input() root?: any;
  @Input() topicId!: string;
  @Input() showReplies?:boolean = false;
  showEdit = false;
  showEdits = false;
  showReply = false;
  readMore = false;
  showDeletedArgument = false;
  mobileActions = false;
  isReply = false;
  errors = [];
  wWidth = window.innerWidth;

  constructor(
    public dialog: DialogService,
    public config: ConfigService,
    public Auth: AuthService,
    private readonly Location: LocationService,
    private readonly Notification: NotificationService,
    private readonly Translate: TranslateService,
    private readonly TopicMemberUserService: TopicMemberUserService,
    public readonly TopicArgumentService: TopicArgumentService
  ) {
  }

  ngOnInit(): void {
    this.argument.replies.count = this.argument.replies.rows?.length || 0;
    this.argument.replies.rows?.forEach((reply:any) =>{
      if (reply.children?.length) {
        this.argument.replies.count += reply.children.length;
      }
    })

    this.isReply = this.argument.type === 'reply';
    if (this.argument.children) {
      this.argument.children = this.argument.children.sort((b:any, a:any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      });
    }
  }

  ngAfterViewInit() {
    if (this.isReply) {
      const argBody = this.argumentBody.nativeElement;
      const authorName = document.createElement('b');
      authorName.innerText = (this.argument.parent.creator?.name || '') + ' ';
      argBody.firstChild.prepend(authorName);
    }
  }

  isEdited() {
    return this.argument.edits.length > 1;
  };

  canEdit() {
    return (this.argument.creator.id === this.Auth.user.value.id && !this.argument.deletedAt);
  };

  isVisible() {
    return (!this.argument.deletedAt && !this.showDeletedArgument) || (this.argument.deletedAt && this.showDeletedArgument);
  };

  showArgument (value: boolean) {
    this.showDeletedArgument = value;
  }
  argumentEditMode() {
    if (this.showEdit) { // Visible, so we gonna hide, need to clear form errors
      this.errors = [];
    }
    this.showEdit = !this.showEdit;
  };

  toggleEdit(event: any) {
    this.argumentEditMode();
  }
  doShowDeleteArgument() {
    const deleteArgument = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.TOPIC_DELETE_ARGUMENT_TITLE',
        title: 'MODALS.TOPIC_DELETE_ARGUMENT_TITLE',
        points: ['MODALS.TOPIC_DELETE_ARGUMENT_TXT_ARE_YOU_SURE'],
        confirmBtn: 'MODALS.TOPIC_DELETE_ARGUMENT_BTN_YES',
        closeBtn: 'MODALS.TOPIC_DELETE_ARGUMENT_BTN_NO'
      }
    });

    deleteArgument.afterClosed().subscribe((confirm) => {
      if (confirm === true) {
        const argument = { topicId: this.topicId, ...this.argument};
        this.TopicArgumentService
          .delete(argument)
          .pipe(take(1))
          .subscribe(() => {
            this.TopicArgumentService.reset();
          });
      }
    });
  };

  copyArgumentLink(event: MouseEvent) {
    const id = this.argument.id + '_v' + (this.argument.edits.length - 1);
    const url = this.Location.getAbsoluteUrl('/topics/:topicId', { topicId: this.topicId }, { argumentId: id });
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = url;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);

    this.Notification.inline(this.Translate.instant('VIEWS.TOPICS_TOPICID.ARGUMENT_LNK_COPIED'), event.pageX, event.pageY - 35);
  };

  doArgumentReport() {
    this.dialog.open(ArgumentReportComponent, {
      data: {
        argument: this.argument,
        topicId: this.topicId
      }
    });
  };

  doArgumentVote(value: number) {
    if (!this.Auth.loggedIn$.getValue) {
      return;
    }

    const argument = {
      commentId: this.argument.id,
      topicId: this.topicId,
      discussionId: this.argument.discussionId,
      value: value
    };

    this.TopicArgumentService
      .vote(argument)
      .pipe(take(1))
      .subscribe((voteResult) => {
        this.argument.votes = voteResult;
        this.TopicMemberUserService.reload();
      });
  };

  doShowVotersList() {
    this.dialog.open(ArgumentReactionsComponent, {
      data: {
        commentId: this.argument.id,
        discussionId: this.argument.discussionId,
        topicId: this.topicId
      }
    });
  };

  getParentAuthor() {
    if (this.argument.parent.id === this.root?.id) {
      return this.root.creator.name;
    }

    const parentReply = this.root?.replies.rows.find((a: any) => a.id === this.argument.parent.id)
    if (parentReply) {
      return parentReply.creator.name;
    }
    return '';
  };

  goToParentArgument(reply: Argument) {
    if (!reply.parent.id || !reply.parent.hasOwnProperty('version')) {
      return;
    }

    const argumentIdWithVersion = this.TopicArgumentService.getArgumentIdWithVersion(reply.parent.id, reply.parent.version);
    let commentElement: HTMLElement | null = document.getElementById(argumentIdWithVersion);
    // The referenced comment was found on the page displayed
    if (commentElement) {
      this.scrollTo(commentElement);
    }
  };

  private scrollTo(argumentEl: HTMLElement | null) {
    if (argumentEl) {
      const bodyEl: HTMLElement | null = argumentEl.querySelector('.argument_body');
      if (bodyEl)
        bodyEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      argumentEl.classList.add('highlight');
      setTimeout(() => {
        argumentEl?.classList.remove('highlight');
      }, 2000);
    }
  }
}
