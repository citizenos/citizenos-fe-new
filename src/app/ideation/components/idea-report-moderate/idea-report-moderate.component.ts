import { TopicIdeaService } from '@services/topic-idea.service';
import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService, DIALOG_DATA } from 'src/app/shared/dialog';
import { switchMap, take, combineLatest } from 'rxjs';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { TopicService } from '@services/topic.service';
import { Idea } from 'src/app/interfaces/idea';

@Component({
  selector: 'app-idea-report-moderate',
  templateUrl: './idea-report-moderate.component.html',
  styleUrls: ['./idea-report-moderate.component.scss']
})
export class IdeaReportModerateComponent  implements OnInit {
  idea!: Idea;
  reportTypes = Object.keys(this.TopicIdeaService.IDEA_REPORT_TYPES);
  topicId = '';
  ideationId = '';
  ideaId = '';
  reportId = '';
  token = '';
  report = new UntypedFormGroup({
    type: new UntypedFormControl(this.reportTypes[0], Validators.required),
    text: new UntypedFormControl('', Validators.required),
  });
  errors?: any;
  constructor(@Inject(DIALOG_DATA) data: any, private TopicIdeaService: TopicIdeaService, private dialog: DialogService, private TopicService: TopicService) {
    this.idea = data.idea || data.report.idea;
    this.topicId = data.topicId;
    this.ideationId = data.ideationId;
    this.ideaId = data.ideaId;
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
      ideaId: this.idea.id,
      reportId: this.reportId,
      report: this.report.value
    }
    this.TopicIdeaService.moderate(data).pipe(take(1))
      .subscribe({
        next: () => {
          this.TopicIdeaService.reload();
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
  selector: 'app-idea-report-moderate-dialog',
  template: '',
})
export class IdeaReportModerateDialogComponent {
  topicId = '';
  ideaId = '';
  ideationId = '';
  token = '';
  constructor(dialog: DialogService, route: ActivatedRoute, router: Router, TopicIdeaService: TopicIdeaService) {
    /*TODO resove queryParam token */
    combineLatest([route.params, route.queryParams]).pipe(
      switchMap(([params, queryParams]) => {
        this.topicId = params['topicId'];
        this.ideaId = params['ideaId'];
        this.ideationId = params['ideationId'];
        this.token = queryParams['token'];
        return TopicIdeaService.getReport({
          topicId: params['topicId'],
          ideationId: params['ideationId'],
          ideaId: params['ideaId'],
          reportId: params['reportId'],
          token: queryParams['token']
        });
      }),
      take(1)
    ).subscribe({
      next: (report) => {
        const reportDialog = dialog.open(IdeaReportModerateComponent, { data: { report, topicId: this.topicId , ideationId: this.ideationId, ideaId: this.ideaId, token: this.token } });
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
