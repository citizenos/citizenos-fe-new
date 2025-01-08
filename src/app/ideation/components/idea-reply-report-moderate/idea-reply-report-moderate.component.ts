import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DIALOG_DATA } from 'src/app/shared/dialog';
import { Argument } from 'src/app/interfaces/argument';
import { switchMap, take, combineLatest } from 'rxjs';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { TopicService } from '@services/topic.service';
import { TopicIdeaRepliesService } from '@services/topic-idea-replies.service';

@Component({
  selector: 'app-idea-reply-report-moderate',
  templateUrl: './idea-reply-report-moderate.component.html',
  styleUrls: ['./idea-reply-report-moderate.component.scss']
})
export class IdeaReplyReportModerateComponent {
  argument!: Argument;
  reportTypes = Object.keys(this.TopicIdeaRepliesService.ARGUMENT_REPORT_TYPES);
  topicId = '';
  ideationId = '';
  ideaId = '';
  commentId = '';
  reportId = '';
  token = '';
  report = new UntypedFormGroup({
    type: new UntypedFormControl(this.reportTypes[0], Validators.required),
    text: new UntypedFormControl('', Validators.required),
  });
  errors?: any;
  constructor(@Inject(DIALOG_DATA) data: any, private TopicIdeaRepliesService: TopicIdeaRepliesService, private dialog: DialogService, private TopicService: TopicService) {
    this.argument = data.argument || data.report.comment;
    this.topicId = data.topicId;
    this.ideationId = data.ideationId;
    this.ideaId = data.ideaId;
    this.commentId = data.commentId;
    this.reportId = data.report.id;
    this.token = data.token;
    this.report.patchValue(data.report); //Object.assign({}, data.report);
  }

  ngOnInit(): void {
  }

  selectReportType(type: string) {
    this.report.controls['type'].setValue(type);
  }

  doModerate() {
    /*TODO resove data */
    const data = {
      token: this.token,
      topicId: this.topicId,
      ideationId: this.ideationId,
      ideaId: this.ideaId,
      commentId: this.argument.id,
      reportId: this.reportId,
      report: this.report.value
    }
    this.TopicIdeaRepliesService.moderate(data).pipe(take(1))
      .subscribe({
        next: () => {
          this.TopicIdeaRepliesService.reload();
          this.dialog.closeAll();
        },
        error: (err) => {
          console.error(err);
          this.dialog.closeAll();
        }
      })
  };
}

@Component({
  selector: 'app-idea-reply-report-moderate-dialog',
  template: '',
})
export class IdeaReplyReportModerateDialogComponent {
  topicId = '';
  commentId = '';
  ideationId = '';
  ideaId = '';
  token = '';
  constructor(dialog: DialogService, route: ActivatedRoute, router: Router, TopicIdeaRepliesService: TopicIdeaRepliesService) {
    /*TODO resove queryParam token */
    combineLatest([route.params, route.queryParams]).pipe(
      switchMap(([params, queryParams]) => {
        this.topicId = params['topicId'];
        this.ideationId = params['ideationId'];
        this.ideaId = params['ideaId'];
        this.commentId = params['commentId'];
        this.token = queryParams['token'];

        return TopicIdeaRepliesService.getReport({
          topicId: params['topicId'],
          ideationId: params['ideationId'],
          ideaId: params['ideaId'],
          commentId: params['commentId'],
          reportId: params['reportId'],
          token: queryParams['token']
        });
      }),
      take(1)
    ).subscribe({
      next: (report) => {
        dialog.closeAll();
        const reportDialog = dialog.open(IdeaReplyReportModerateComponent, { data: { report, topicId: this.topicId, ideationId: this.ideationId, ideaId: this.ideaId, commentId: this.commentId, token: this.token } });
        reportDialog.afterClosed().subscribe(() => {
          router.navigate(['topics', this.topicId]);
        })
      },
      error: (err) => {
        console.error(err.message || err.status.message);
      }
    });

  }

}
