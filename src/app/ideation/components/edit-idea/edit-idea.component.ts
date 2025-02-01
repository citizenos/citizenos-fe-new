import { IdeaAttachmentService } from '@services/idea-attachment.service';
import { TopicIdeationService } from '@services/topic-ideation.service';
import { TopicIdeaService } from '@services/topic-idea.service';
import { TopicMemberUserService } from '@services/topic-member-user.service';
import { AppService } from '@services/app.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { UploadService } from '@services/upload.service';

import { trigger, state, style } from '@angular/animations';
import { Component, Input, EventEmitter, Output } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, take } from 'rxjs';
import { Idea, IdeaStatus} from 'src/app/interfaces/idea';
import { AddIdeaComponent } from '../add-idea/add-idea.component';

@Component({
  selector: 'edit-idea',
  templateUrl: './edit-idea.component.html',
  styleUrls: ['./edit-idea.component.scss'],
  animations: [
    trigger('openSlide', [
      state('open', style({
        'maxHeight': '100%',
        transition: 'max-height 0.2s ease-in-out',
      })),
      state('closed', style({
        padding: '0',
        'maxHeight': '0',
        transition: 'all 0.2s ease-in-out',
      }))
    ])]
})
export class EditIdeaComponent extends AddIdeaComponent {
  @Input() idea!: Idea;
  @Output() showEdit = new EventEmitter<boolean | null>();

  constructor(
    app: AppService,
    AuthService: AuthService,
    TopicIdeationService: TopicIdeationService,
    UploadService: UploadService,
    IdeaAttachmentService: IdeaAttachmentService,
    Notification: NotificationService,
    TopicIdeaService: TopicIdeaService,
    TopicMemberUserService: TopicMemberUserService,
    route: ActivatedRoute,
    translate: TranslateService,
    router: Router) {
    super(app, AuthService, TopicIdeationService, UploadService, IdeaAttachmentService, Notification, TopicIdeaService, TopicMemberUserService, route, translate, router);
  }

  override ngOnInit(): void {
    this.ideaForm.patchValue({
      statement: this.idea.statement,
      description: this.idea.description
    });
    this.description = this.idea.description;
    this.updateText(this.idea.description);
    this.IdeaAttachmentService
      .query({ topicId: this.topicId, ideationId: this.idea.ideationId, ideaId: this.idea.id, type: 'image' })
      .pipe(take(1))
      .subscribe((res: any) => {
        this.images = res.rows;
        return of(this.images)
      });
  }

  override close() {
    this.showEdit.emit(false);
  }

  override afterPostNavigate(idea: Idea) {
    this.showEdit.emit(false);
    if (idea.status === IdeaStatus.draft) {
      this.router.navigate(
        ['ideation', idea.ideationId],
        {
          relativeTo: this.route
        });
    }

    this.router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: { ideaId: idea.id }
      });
  }

  override postIdea(status?: IdeaStatus) {
    const idea = {
      ideaId: this.idea.id,
      ideationId: this.idea.ideationId,
      parentVersion: 0,
      statement: this.ideaForm.value['statement'],
      description: this.ideaForm.value['description'],
      topicId: this.topicId,
      status: status
    };
    this.TopicIdeaService
      .update(idea)
      .pipe(take(1))
      .subscribe({
        next: (idea) => {
          this.afterPost(idea)
        },
        error: (err) => {
          console.error(err);
          this.errors = err;
        }
      })
  };

  ideaEditMode() {
    this.ideaForm.patchValue({ 'statement': this.idea.statement });
    this.ideaForm.patchValue({ 'description': this.idea.description });
    this.showEdit.emit(false);
  };

  removeImage(image: any, index: number) {
    return this.IdeaAttachmentService.delete({
      topicId: this.topicId,
      ideationId: this.idea.ideationId,
      ideaId: this.idea.id,
      attachmentId: image.id
    }).pipe(take(1)).subscribe({
      next: () => {
        this.images.splice(index, 1);
      }
    });
  }
}
