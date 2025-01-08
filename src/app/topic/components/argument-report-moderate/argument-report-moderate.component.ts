import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TopicArgumentService } from '@services/topic-argument.service';
import { DialogService, DIALOG_DATA } from 'src/app/shared/dialog';
import { Argument } from 'src/app/interfaces/argument';
import { switchMap, take, combineLatest } from 'rxjs';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { TopicService } from '@services/topic.service';

@Component({
  selector: 'app-argument-report-moderate',
  templateUrl: './argument-report-moderate.component.html',
  styleUrls: ['./argument-report-moderate.component.scss']
})
export class ArgumentReportModerateComponent implements OnInit {
  argument!: Argument;
  reportTypes = Object.keys(this.TopicArgumentService.ARGUMENT_REPORT_TYPES);
  topicId = '';
  discussionId = '';
  commentId = '';
  reportId = '';
  token = '';
  report = new UntypedFormGroup({
    type: new UntypedFormControl(this.reportTypes[0], Validators.required),
    text: new UntypedFormControl('', Validators.required),
  });
  errors?: any;
  constructor(@Inject(DIALOG_DATA) data: any, private TopicArgumentService: TopicArgumentService, private dialog: DialogService, private TopicService: TopicService) {
    this.argument = data.argument || data.report.comment;
    this.topicId = data.topicId;
    this.discussionId = data.discussionId;
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
      discussionId: this.discussionId,
      commentId: this.argument.id,
      reportId: this.reportId,
      report: this.report.value
    }
    this.TopicArgumentService.moderate(data).pipe(take(1))
      .subscribe({
        next: () => {
          this.TopicArgumentService.reload();
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
  selector: 'app-argument-report-moderate-dialog',
  template: '',
})
export class ArgumentReportModerateDialogComponent {
  topicId = '';
  commentId = '';
  discussionId = '';
  token = '';
  constructor(dialog: DialogService, route: ActivatedRoute, router: Router, TopicArgumentService: TopicArgumentService) {
    /*TODO resove queryParam token */
    combineLatest([route.params, route.queryParams]).pipe(
      switchMap(([params, queryParams]) => {
        this.topicId = params['topicId'];
        this.commentId = params['commentId'];
        this.discussionId = params['discussionId'] || params['topicId'];
        this.token = queryParams['token'];
        return TopicArgumentService.getReport({
          topicId: params['topicId'],
          commentId: params['commentId'],
          reportId: params['reportId'],
          token: queryParams['token']
        });
      }),
      take(1)
    ).subscribe({
      next: (report) => {
        const reportDialog = dialog.open(ArgumentReportModerateComponent, { data: { report, topicId: this.topicId , commentId: this.commentId, token: this.token } });
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
