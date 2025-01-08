import { TranslateService } from '@ngx-translate/core';
import { Component, Input, OnInit, ViewChild, ViewEncapsulation, ElementRef, EventEmitter, Output, ContentChildren, QueryList } from '@angular/core';
import { DialogService } from 'src/app/shared/dialog';
import { take } from 'rxjs';
import { Argument } from 'src/app/interfaces/argument';
import { AuthService } from '@services/auth.service';
import { TopicMemberUserService } from '@services/topic-member-user.service';
import { ConfigService } from '@services/config.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { ArgumentReactionsComponent } from 'src/app/topic/components/argument-reactions/argument-reactions.component';
import { TopicIdeaRepliesService } from '@services/topic-idea-replies.service';
import { IdeaReplyReportComponent } from '../idea-reply-report/idea-reply-report.component';
@Component({
  selector: 'idea-reply',
  templateUrl: './idea-reply.component.html',
  styleUrls: ['./idea-reply.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class IdeaReplyComponent implements OnInit {
  @ViewChild('argumentBody') argumentBody!: ElementRef;
  @ContentChildren('replyItem') ideaReplies!: QueryList<any>;
  @Input() argument!: any;
  @Input() root?: any;
  @Input() topicId!: string;
  @Input() ideationId!: string;
  @Input() ideaId!: string;
  @Input() showReply?: boolean;
  @Output() showReplyChange = new EventEmitter<boolean>();

  showEdit = false;
  showEdits = false;
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
    public readonly TopicIdeaRepliesService: TopicIdeaRepliesService,
    private readonly TopicMemberUserService: TopicMemberUserService
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
      authorName.innerText = (this.argument.parent.creator?.name || this.argument.parent.author?.name ||  '') + ' ';
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
    return (!this.argument.deletedAt && !this.showDeletedArgument && !this.showEdit) || (this.argument.deletedAt && this.showDeletedArgument);
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
        heading: 'MODALS.TOPIC_DELETE_IDEA_REPLY_TITLE',
        title: 'MODALS.TOPIC_DELETE_IDEA_REPLY_TITLE',
        points: ['MODALS.TOPIC_DELETE_IDEA_REPLY_TXT_ARE_YOU_SURE'],
        confirmBtn: 'MODALS.TOPIC_DELETE_IDEA_REPLY_BTN_YES',
        closeBtn: 'MODALS.TOPIC_DELETE_IDEA_REPLY_BTN_NO'
      }
    });

    deleteArgument.afterClosed().subscribe((confirm) => {
      if (confirm === true) {
        const argument = Object.assign({ topicId: this.topicId, ideationId: this.ideationId, ideaId: this.ideaId }, this.argument);
        this.TopicIdeaRepliesService
          .delete(argument)
          .pipe(take(1))
          .subscribe(() => {
            this.TopicIdeaRepliesService.reset();
          });
      }
    });
  };

  close () {
    this.showReplyChange.emit(false);
  }

  copyArgumentLink(event: MouseEvent) {
    const id = this.argument.id + '_v' + (this.argument.edits.length - 1);
    const url = this.Location.getAbsoluteUrl('/topics/:topicId/ideation/:ideationId/ideas/:ideaId', { topicId: this.topicId, ideationId: this.ideationId, ideaId: this.ideaId }, { replyId: id });
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
    this.dialog.open(IdeaReplyReportComponent, {
      data: {
        argument: this.argument,
        topicId: this.topicId,
        ideaId: this.ideaId,
        ideationId: this.ideationId
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
      ideationId: this.ideationId,
      ideaId: this.ideaId,
      value: value
    };

    this.TopicIdeaRepliesService
      .vote(argument)
      .pipe(take(1))
      .subscribe((voteResult) => {
        this.TopicMemberUserService.reload();
        this.argument.votes = voteResult;
      });
  };

  doShowVotersList() {
    this.dialog.open(ArgumentReactionsComponent, {
      data: {
        commentId: this.argument.id,
        topicId: this.topicId,
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

    const argumentIdWithVersion = this.TopicIdeaRepliesService.getArgumentIdWithVersion(reply.parent.id, reply.parent.version);
    let commentElement: HTMLElement | null = document.getElementById(argumentIdWithVersion);
    // The referenced argument was found on the page displayed
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
