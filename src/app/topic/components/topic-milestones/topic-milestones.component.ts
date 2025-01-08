import { Topic } from 'src/app/interfaces/topic';
import { Event } from 'src/app/interfaces/event';
import { Component, OnInit, Input } from '@angular/core';
import { TopicEventService } from '@services/topic-event.service';
import { TopicService } from '@services/topic.service';
import { DialogService } from 'src/app/shared/dialog';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { take, of, map } from 'rxjs';
@Component({
  selector: 'topic-milestones',
  templateUrl: './topic-milestones.component.html',
  styleUrls: ['./topic-milestones.component.scss']
})
export class TopicMilestonesComponent implements OnInit {
  @Input() topic!: Topic;
  @Input() isStatusClosed!: boolean;
  event = {
    subject: '',
    text: '',
    topicId: ''
  };

  errors = <any>null;
  public topicEvents = of(<Event[] | any[]>[]);
  public countTotal = 0;
  public maxLengthSubject = 128;
  public maxLengthText = 2048;
  constructor(private dialog: DialogService, private TopicEventService: TopicEventService, private TopicService: TopicService) {
  }

  ngOnInit(): void {
    this.topicEvents = this.TopicEventService.loadEvents({topicId: this.topic.id}).pipe(map(events => {
      this.countTotal = events.count;
      return events.rows;
    }));
    this.TopicEventService.setParam('topicId', this.topic.id);
    this.event.topicId = this.topic.id;
  }

  submitEvent() {
    this.TopicEventService
      .save(this.event)
      .pipe(take(1))
      .subscribe(() => {
        this.event.subject = '';
        this.event.text = '';
        this.TopicEventService.reloadEvents();
      });
  };

  canEdit () {
    return this.TopicService.canEdit(this.topic);
  }

  canDelete () {
    return this.TopicService.canDelete(this.topic);
  }

  toggleEditMode(event: any) {
    if (!event.orgSubject) {
      event.origSubject = event.subject;
      event.origText = event.text;
    }
    if (!event.editMode) {
      event.editMode = true;
    } else {
      event.editMode = !event.editMode;
      event.subject = event.origSubject;
      event.subject = event.origText;
    }
  }

  editEvent (event:any) {
    event.topicId = this.topic.id;
    this.TopicEventService
      .update(event)
      .pipe(take(1))
      .subscribe(() => {
        this.event.subject = '';
        this.event.text = '';
        event.editMode = !event.editMode;
        this.TopicEventService.reloadEvents();
      });
  }

  deleteEvent(event: any) {
    event.topicId = this.topic.id;
    const deleteDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.TOPIC_EVENT_DELETE_CONFIRM_HEADING',
        title: 'MODALS.TOPIC_EVENT_DELETE_CONFIRM_TXT_ARE_YOU_SURE',
        description: event.subject,
        points: ['MODALS.TOPIC_EVENT_DELETE_CONFIRM_TXT_ARE_YOU_SURE'],
        confirmBtn: 'MODALS.TOPIC_EVENT_DELETE_CONFIRM_BTN_YES',
        closeBtn: 'MODALS.TOPIC_EVENT_DELETE_CONFIRM_BTN_NO'
      }
    });

    deleteDialog.afterClosed().subscribe((result:any) => {
      if (result === true) {
        this.TopicEventService
          .delete(event)
          .pipe(take(1))
          .subscribe(() => {
            this.event.subject = '';
            this.event.text = '';
            this.TopicEventService.reloadEvents();
          });
      }
    });
  }
}
