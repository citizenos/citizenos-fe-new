import { trigger, state, style } from '@angular/animations';
import { Component, Input, Inject, EventEmitter, Output, ElementRef, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, take, takeWhile } from 'rxjs';
import { Idea } from 'src/app/interfaces/idea';
import { AppService } from '@services/app.service';
import { AuthService } from '@services/auth.service';
import { IdeaAttachmentService } from '@services/idea-attachment.service';
import { NotificationService } from '@services/notification.service';
import { TopicIdeaService } from '@services/topic-idea.service';
import { UploadService } from '@services/upload.service';

@Component({
  selector: 'edit-idea',
  templateUrl: './edit-idea.component.html',
  styleUrls: ['./edit-idea.component.scss'],
  animations: [
    trigger('openSlide', [
      // ...
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
export class EditIdeaComponent {
  @Input() topicId!: string;
  @Input() ideationId!: string;
  @Input() idea!: Idea;
  @Output() showEdit = new EventEmitter<boolean | null>();
  @ViewChild('imageUpload') fileInput?: ElementRef;

  wWidth = window.innerWidth;
  focusIdeaStatement = false;
  argumentType = <string>'pro';
  errors: any;
  images = <any[]>[];
  newImages = <any[]>[];
  description = <string>'';
  ideaForm = new UntypedFormGroup({
    statement: new UntypedFormControl('', [Validators.required]),
    description: new UntypedFormControl('', [Validators.required]),
  });

  IMAGE_LIMIT = 10;
  IDEA_STATEMENT_MAXLENGTH = 1024;
  private IDEA_VERSION_SEPARATOR = '_v';
  constructor(
    public app: AppService,
    private AuthService: AuthService,
    public TopicIdeaService: TopicIdeaService,
    @Inject(ActivatedRoute) private route: ActivatedRoute,
    @Inject(IdeaAttachmentService) private IdeaAttachmentService: IdeaAttachmentService,
    @Inject(UploadService) private UploadService: UploadService,
    @Inject(NotificationService) private Notification: NotificationService,
    @Inject(TranslateService) public translate: TranslateService,
    @Inject(Router) private router: Router) { }

  ngOnInit(): void {
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

  loggedIn() {
    return this.AuthService.loggedIn$.value;
  }

  ideaMaxLength() {
    return 0;
  }

  updateText(text: any) {
    this.ideaForm.controls['description'].markAsTouched();
    this.ideaForm.controls['description'].setValue(text);
  }

  close() {
    this.showEdit.emit(false);
  }

  postIdea() {
    const idea = {
      ideaId: this.idea.id,
      ideationId: this.idea.ideationId,
      parentVersion: 0,
      statement: this.ideaForm.value['statement'],
      description: this.ideaForm.value['description'],
      topicId: this.topicId
    };
    this.TopicIdeaService
      .update(idea)
      .pipe(take(1))
      .subscribe({
        next: (idea) => {
          this.doSaveAttachments(idea.id);
          this.TopicIdeaService.reset();
          this.TopicIdeaService.setParam('topicId', this.topicId);
          this.TopicIdeaService.setParam('ideationId', this.idea.ideationId);
          this.description = '';
          this.ideaForm.reset();
          this.app.addIdea.next(false);
          this.TopicIdeaService.reload();
          this.idea.statement = idea.statement;
          this.idea.description = idea.description;
          this.showEdit.emit(false);

          this.router.navigate(
            [],
            {
              relativeTo: this.route,
              queryParams: { ideaId: idea.id }
            });
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

  fileUpload() {
    const allowedTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml'];
    const files = this.fileInput?.nativeElement.files;
    if ((this.images.length + this.newImages.length) >= this.IMAGE_LIMIT) {
      return this.Notification.addError(this.translate.instant('MSG_ERROR_IDEA_IMAGE_LIMIT', {limit: this.IMAGE_LIMIT}));
    }
    for (let i=0; i < files.length; i++) {
      if (allowedTypes.indexOf(files[i].type) < 0) {
        this.Notification.addError(this.translate.instant('MSG_ERROR_FILE_TYPE_NOT_ALLOWED', { allowedFileTypes: allowedTypes.toString() }));
      } else if (files[i].size > 5000000) {
        this.Notification.addError(this.translate.instant('MSG_ERROR_FILE_TOO_LARGE', { allowedFileSize: '5MB' }));
      } else if ((this.images.length + i) < this.IMAGE_LIMIT ) {
        const reader = new FileReader();
        reader.onload = () => {
          const file = files[i];
          file.link = reader.result;
          this.newImages.push(file);
        };
        reader.readAsDataURL(files[i]);
      } else {
        i = files.length;
        this.Notification.addError(this.translate.instant('MSG_ERROR_IDEA_IMAGE_LIMIT', {limit: this.IMAGE_LIMIT}));
      }
    }
  }

  uploadImage() {
    this.fileInput?.nativeElement.click();
  };

  getAllowedFileSize() {
    return (this.UploadService.ALLOWED_FILE_SIZE / 1000 / 1000).toString() + 'MB';
  }

  getAllowedFileTypes() {
    return ["jpg", "jpeg", "img", "png"].join(', ');
  }

  doSaveAttachments(ideaId: string) {
    let i = 0;
    while (i < this.newImages.length) {
      let image = this.newImages[i];
      if (image) {
        console.log(image);
        image.source = this.IdeaAttachmentService.SOURCES.upload;
        this.UploadService.uploadIdeaImage({topicId: this.topicId, ideationId: this.idea.ideationId, ideaId}, image, {name: image.name})
          .pipe(takeWhile((e) => !e.link, true))
          .subscribe({
            next: (result) => {
            },
            error: (res) => {
              /*   if (res.errors) {
                   const keys = Object.keys(res.errors);
                   keys.forEach((key) => {
                     this.Notification.addError(res.errors[key]);
                   });
                 } else if (res.status && res.status.message) {
                   this.Notification.addError(res.status.message);
                 } else {
                   this.Notification.addError(res.message);
                 }*/
            }
          });
      }
      i++;
    }
  };

  removeImage (image: any, index: number) {
    return this.IdeaAttachmentService.delete({
      topicId: this.topicId,
      ideationId: this.idea.ideationId,
      ideaId: this.idea.id,
      attachmentId: image.id
    }).pipe(take(1)).subscribe({
      next:() => {
        this.images.splice(index, 1);
      }
    });
  }
  removeNewImage(index: number) {
    this.newImages.splice(index, 1);
  }
}
