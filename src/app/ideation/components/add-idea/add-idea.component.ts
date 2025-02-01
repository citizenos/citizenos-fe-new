import { IdeaAttachmentService } from '@services/idea-attachment.service';
import { TopicIdeationService } from '@services/topic-ideation.service';
import { TopicIdeaService } from '@services/topic-idea.service';
import { TopicMemberUserService } from '@services/topic-member-user.service';
import { AppService } from '@services/app.service';
import { AuthService } from '@services/auth.service';
import { NotificationService } from '@services/notification.service';
import { UploadService } from '@services/upload.service';

import { Attachment } from '@interfaces/attachment';
import { Idea, IdeaStatus } from '@interfaces/idea';
import { Notification } from '@interfaces/notification';
import { MarkdownDirective } from 'src/app/directives/markdown.directive';

import { trigger, state, style } from '@angular/animations';
import { Component, Input, Inject, EventEmitter, Output, ElementRef, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { take, map, takeWhile, of } from 'rxjs';

@Component({
  selector: 'add-idea',
  templateUrl: './add-idea.component.html',
  styleUrls: ['./add-idea.component.scss'],
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
export class AddIdeaComponent {

  @Input() topicId!: string;
  @Input() ideationId!: string;
  @Input() notification?: Notification;
  @Output() notificationChange = new EventEmitter<any>();

  @ViewChild(MarkdownDirective) editor!: MarkdownDirective;
  @ViewChild('imageUpload') fileInput?: ElementRef;

  tmpImageUrl?: string;
  images = <any[]>[];
  newImages = <any[]>[];
  topicAttachments$ = of(<Attachment[] | any[]>[]);
  attachments = <any[]>[]

  wWidth = window.innerWidth;
  focusIdeaStatement = false;
  argumentType = <string>'pro';
  errors: any;
  addIdea;
  description = <string>'';
  ideaForm = new UntypedFormGroup({
    statement: new UntypedFormControl('', [Validators.required]),
    description: new UntypedFormControl('', [Validators.required]),
  });
  IMAGE_LIMIT = 10;
  IDEA_STATEMENT_MAXLENGTH = 1024;
  private readonly IDEA_VERSION_SEPARATOR = '_v';
  constructor(
    public app: AppService,
    private readonly AuthService: AuthService,
    private readonly TopicIdeationService: TopicIdeationService,
    private readonly UploadService: UploadService,
    readonly IdeaAttachmentService: IdeaAttachmentService,
    private readonly Notification: NotificationService,
    public readonly TopicIdeaService: TopicIdeaService,
    private readonly TopicMemberUserService: TopicMemberUserService,
    @Inject(ActivatedRoute) readonly route: ActivatedRoute,
    @Inject(TranslateService) public readonly translate: TranslateService,
    @Inject(Router) readonly router: Router) {
    this.addIdea = this.app.addIdea.pipe(map((val) => {
      this.description = '';
      this.ideaForm.reset();
      this.images = [];
      return val;
    }))
  }

  ngOnInit(): void {
    this.IdeaAttachmentService.setParam('topicId', this.topicId);
    this.IdeaAttachmentService.setParam('ideationId', this.ideationId);
  }

  loggedIn() {
    return this.AuthService.loggedIn$.value;
  }

  ideaMaxLength() {
    return 0;
  }

  updateText(text: any) {
    setTimeout(() => {
      this.ideaForm.controls['description'].markAsTouched();
      this.ideaForm.controls['description'].setValue(text);
    })
  }

  addNewIdea() {
    if (!this.loggedIn()) {
      this.app.doShowLogin();
    } else {
      this.app.addIdea.next(true);
    }
  }

  close() {
    this.app.addIdea.next(false);
  }

  clear() {
    this.updateText('')
    this.description = '';
    this.ideaForm.patchValue({
      statement: '',
      description: ''
    });
    this.ideaForm.markAsUntouched();
    this.ideaForm.controls['statement'].patchValue('');
    this.ideaForm.controls['description'].markAsPristine();
    this.ideaForm.controls['description'].markAsUntouched();
    setTimeout(() => {
      if (this.fileInput?.nativeElement.value)
        this.fileInput.nativeElement.value = null;
      this.ideaForm.controls['description'].markAsPristine();
      this.ideaForm.controls['description'].markAsUntouched();
      this.ideaForm.markAsUntouched()
    })
  }
  draftIdea() {
    this.postIdea(IdeaStatus.draft);
  }

  publishIdea() {
    this.postIdea(IdeaStatus.published);
  }

  afterPost(idea: Idea) {
    this.doSaveAttachments(idea.id)
    this.TopicIdeaService.reload();
    this.TopicIdeationService.reload();
    this.TopicMemberUserService.reload();
    this.description = '';
    this.ideaForm.reset();
    this.clear();
    this.app.addIdea.next(false);
    this.afterPostNavigate(idea);
  }

  afterPostNavigate(idea: Idea) {
    if (idea.status === IdeaStatus.draft) {
      this.router.navigate(
        ['ideation', this.ideationId],
        {
          relativeTo: this.route
        });
    }
    /*  this.notificationChange.emit({
        level: 'success'
        message: this.translate.instant('COMPONENTS.ADD_IDEA.MSG_SUCCESS')
      })*/
    this.router.navigate(
      ['ideation', this.ideationId, 'ideas', idea.id],
      {
        relativeTo: this.route
      });
  }

  postIdea(status?: IdeaStatus) {
    const idea = {
      parentVersion: 0,
      statement: this.ideaForm.value['statement'],
      description: this.ideaForm.value['description'],
      topicId: this.topicId,
      ideationId: this.ideationId,
      status: status
    };
    this.TopicIdeaService
      .save(idea)
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

  getIdeaIdWithVersion(ideaId: string, version: number) {
    return ideaId + this.IDEA_VERSION_SEPARATOR + version;
  };

  fileUpload() {
    const allowedTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml'];
    const files = this.fileInput?.nativeElement.files;
    if ((this.images.length + this.newImages.length) >= this.IMAGE_LIMIT) {
      return this.Notification.addError(this.translate.instant('MSG_ERROR_IDEA_IMAGE_LIMIT', { limit: this.IMAGE_LIMIT }));
    }
    for (let i = 0; i < files.length; i++) {
      if (allowedTypes.indexOf(files[i].type) < 0) {
        this.Notification.addError(this.translate.instant('MSG_ERROR_FILE_TYPE_NOT_ALLOWED', { allowedFileTypes: allowedTypes.toString() }));
      } else if (files[i].size > 5000000) {
        this.Notification.addError(this.translate.instant('MSG_ERROR_FILE_TOO_LARGE', { allowedFileSize: '5MB' }));
      } else if ((this.images.length + i) < this.IMAGE_LIMIT) {
        const reader = new FileReader();
        reader.onload = () => {
          const file = files[i];
          file.link = reader.result;
          this.newImages.push(file);
        };
        reader.readAsDataURL(files[i]);
      } else {
        this.Notification.addError(this.translate.instant('MSG_ERROR_IDEA_IMAGE_LIMIT', { limit: this.IMAGE_LIMIT }));
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
        image.source = this.IdeaAttachmentService.SOURCES.upload;
        this.UploadService.uploadIdeaImage({ topicId: this.topicId, ideationId: this.ideationId, ideaId }, image, { name: image.name })
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

  removeNewImage(index: number) {
    this.newImages.splice(index, 1);
  }
}
