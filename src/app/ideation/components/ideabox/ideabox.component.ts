import { TopicService } from '@services/topic.service';
import { AfterViewInit, Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { Idea } from 'src/app/interfaces/idea';
import { AuthService } from '@services/auth.service';
import { ConfigService } from '@services/config.service';
import { TopicIdeaService } from '@services/topic-idea.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { DialogService } from 'src/app/shared/dialog';
import { IdeaReportComponent } from '../idea-report/idea-report.component';
import { AddIdeaFolderComponent } from '../add-idea-folder/add-idea-folder.component';
import { IdeaReportReasonComponent } from '../idea-report-reason/idea-report-reason.component';
import { Topic } from 'src/app/interfaces/topic';
import { Ideation } from 'src/app/interfaces/ideation';
import { IdeaReactionsComponent } from '../idea-reactions/idea-reactions.component';
import { TopicMemberUserService } from '@services/topic-member-user.service';

@Component({
  selector: 'ideabox',
  templateUrl: './ideabox.component.html',
  styleUrls: ['./ideabox.component.scss']
})
export class IdeaboxComponent implements AfterViewInit {
  @Input() idea!: Idea; // decorate the property with @Input()
  showDeletedIdea = false;
  @Input() topic!: Topic;
  @Input() ideation!: Ideation;
  showReplies = false;
  isNew = false;
  showEdit = false;
  showEdits = false;
  showReply = false;
  readMore = false;
  mobileActions = false;
  isReply = false;
  errors = [];
  wWidth = window.innerWidth;
  constructor(
    public dialog: DialogService,
    public config: ConfigService,
    public router: Router,
    public Auth: AuthService,
    private readonly TopicMemberUserService: TopicMemberUserService,
    public Translate: TranslateService,
    public TopicService: TopicService,
    public TopicIdeaService: TopicIdeaService
  ) {
  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
  }
  ngOnInit(): void {
    if (new Date().getTime() - new Date(this.idea.createdAt).getTime() < 5000) {
      this.isNew = true;
    }
    setTimeout(() => {
      this.isNew = false
    }, 2000);
  }
  canEditTopic() {
    return this.TopicService.canEdit(this.topic);
  }
  canEditIdea() {
    return (this.idea.author.id === this.Auth.user.value.id && !this.idea.deletedAt && [this.TopicService.STATUSES.draft, this.TopicService.STATUSES.ideation].indexOf(this.topic.status) > -1);
  };

  goToView($event: any, showReplies?: boolean) {
    const routerLink = ['/', 'topics', this.topic.id, 'ideation', this.ideation.id, 'ideas', this.idea.id];
    const params = <any>{};
    if (showReplies) {
      params.queryParams = {replyId: ''};
    }
    this.router.navigate(routerLink, params);
  }


  isEdited() {
    return this.idea.edits?.length > 1;
  };

  isVisible() {
    return (!this.idea.deletedAt && !this.showDeletedIdea) || (this.idea.deletedAt && this.showDeletedIdea);
  };

  showIdea(value: boolean) {
    this.showDeletedIdea = value;
  }
  ideaEditMode() {
    if (this.showEdit) { // Visible, so we gonna hide, need to clear form errors
      this.errors = [];
    }
    this.showEdit = !this.showEdit;
  };

  toggleEdit(event: any) {
    this.ideaEditMode();
  }
  doShowDeleteIdea() {
    const deleteIdea = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.TOPIC_DELETE_IDEA_TITLE',
        title: 'MODALS.TOPIC_DELETE_IDEA_TITLE',
        points: ['MODALS.TOPIC_DELETE_IDEA_TXT_ARE_YOU_SURE'],
        confirmBtn: 'MODALS.TOPIC_DELETE_IDEA_BTN_YES',
        closeBtn: 'MODALS.TOPIC_DELETE_IDEA_BTN_NO'
      }
    });

    deleteIdea.afterClosed().subscribe((confirm) => {
      if (confirm === true) {
        const idea = { topicId: this.topic.id, ideaId: this.idea.id, ideationId: this.ideation.id };
        this.TopicIdeaService
          .delete(idea)
          .pipe(take(1))
          .subscribe(() => {
            this.TopicIdeaService.reload();
          });
      }
    });
  };

  doIdeaReport() {
    this.dialog.open(IdeaReportComponent, {
      data: {
        idea: this.idea,
        ideationId: this.ideation.id,
        topicId: this.topic.id
      }
    });
  };

  canVote() {
    return (this.Auth.loggedIn$.value && this.topic.status === this.TopicService.STATUSES.ideation);
  }

  doIdeaVote(value: number) {
    if (!this.canVote()) {
      return;
    }

    const idea = {
      ideaId: this.idea.id,
      ideationId: this.ideation.id,
      topicId: this.topic.id,
      value: value
    };

    this.TopicIdeaService
      .vote(idea)
      .pipe(take(1))
      .subscribe((voteResult) => {
        this.idea.votes = voteResult;
        this.TopicMemberUserService.reload();
      });
  };

  toggleFavourite() {
    this.TopicIdeaService.toggleFavourite({ favourite: this.idea.favourite, topicId: this.topic.id, ideationId: this.ideation.id, ideaId: this.idea.id });
    this.idea.favourite = !this.idea.favourite;
  }

  doShowVotersList() {
      this.dialog.open(IdeaReactionsComponent, {
        data: {
          ideaId: this.idea.id,
          ideationId: this.ideation.id,
          topicId: this.topic.id,
        }
      });
  }

  addToFolder() {
    this.dialog.open(AddIdeaFolderComponent, {
      data: {
        topicId: this.topic.id,
        ideationId: this.ideation.id,
        idea: this.idea
      }
    })
  }

  reportReasonDialog() {
    this.dialog.open(IdeaReportReasonComponent, {
      data: {
        report: {
          moderatedReasonText: this.idea.deletedReasonText,
          moderatedReasonType: this.idea.deletedReasonType
        }
      }
    })
  }
}
