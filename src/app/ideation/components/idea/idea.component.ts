import { IdeaAttachmentService } from '@services/idea-attachment.service';
import { TopicIdeaRepliesService } from '@services/topic-idea-replies.service';
import { TopicIdeaService } from '@services/topic-idea.service';
import { Component, ContentChildren, QueryList, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DIALOG_DATA, DialogRef, DialogService } from 'src/app/shared/dialog';
import { take, combineLatest, Observable, switchMap, map, tap } from 'rxjs';
import { AuthService } from '@services/auth.service';
import { IdeaboxComponent } from '../ideabox/ideabox.component';
import { TopicMemberUserService } from '@services/topic-member-user.service';
import { ConfigService } from '@services/config.service';
import { TranslateService } from '@ngx-translate/core';
import { Argument } from 'src/app/interfaces/argument';
import { TopicService } from '@services/topic.service';
import { Folder } from 'src/app/interfaces/folder';
import { DomSanitizer } from '@angular/platform-browser';
import { IdeaReplyComponent } from '../idea-reply/idea-reply.component';

@Component({
  selector: 'app-idea',
  template: ''
})
export class IdeaComponent {
  ideaId: string = '';
  topicId: string = '';
  ideationId: string = '';
  constructor(dialog: DialogService, route: ActivatedRoute, TopicIdeaService: TopicIdeaService, router: Router, TopicService: TopicService) {
    route.params.pipe(take(1), switchMap((params) => {
      this.ideaId = params['ideaId'];
      this.topicId = params['topicId'];
      this.ideationId = params['ideationId'];

      return TopicIdeaService.get({ ideaId: this.ideaId, ideationId: this.ideationId, topicId: this.topicId })
    })).subscribe((idea) => {
      TopicService.get(this.topicId).pipe(take(1)).subscribe((topic) => {
        dialog.closeAll();
        const ideaDialog = dialog.open(IdeaDialogComponent, {
          data: {
            idea,
            topic,
            ideation: { id: this.ideationId },
            route: route
          }
        });

        ideaDialog.afterClosed().subscribe((value) => {
          if (value) {
            TopicIdeaService.reload();
            router.navigate(['/', 'topics', this.topicId], { fragment: 'ideation' })
          }
        });
      })
    });
  }
}

@Component({
  selector: 'app-idea-dialog',
  templateUrl: './idea-dialog.component.html',
  styleUrls: ['./idea-dialog.component.scss']
})
export class IdeaDialogComponent extends IdeaboxComponent {
  @ContentChildren(IdeaReplyComponent) ideaReplies!: QueryList<any>;
  data: any = inject(DIALOG_DATA);
  route;
  TopicIdeaRepliesService = inject(TopicIdeaRepliesService);
  IdeaAttachmentService = inject(IdeaAttachmentService);
  DomSanitizer = inject(DomSanitizer);
  dialogRef = inject(DialogRef<IdeaDialogComponent>);
  replies$: Observable<any>;
  argument = <Argument>{};
  notification: any;
  replyCount = 0;
  folders$: Observable<Folder[]>;
  images$: Observable<any>;

  constructor(
    dialog: DialogService,
    config: ConfigService,
    router: Router,
    Auth: AuthService,
    TopicMemberUserService: TopicMemberUserService,
    Translate: TranslateService,
    TopicService: TopicService,
    TopicIdeaService: TopicIdeaService
  ) {
    super(dialog, config, router, Auth, TopicMemberUserService, Translate, TopicService, TopicIdeaService);
    this.idea = this.data.idea;
    this.topic = this.data.topic;
    this.ideation = this.data.ideation;
    this.route = this.data.route;
    const url = this.router.parseUrl(this.router.url);
    this.TopicIdeaService.setParam('topicId', this.topic.id);
    this.TopicIdeaService.setParam('ideationId', this.topic.ideationId);
    this.replies$ = combineLatest([this.route.params, this.TopicIdeaRepliesService.reload$]).pipe(
      switchMap(([params]) => {
        const paramsObj = Object.assign({}, params);
        paramsObj.topicId = this.topic.id;
        paramsObj.ideationId = this.topic.ideationId;
        paramsObj.ideaId = this.idea.id;
        return this.TopicIdeaRepliesService.getArguments(paramsObj);
      }),
      map((res: any) => {
        let results = res.rows.concat([]);
        const argArray = <any[]>[];
        let children = <any>{};
        let showReplies = false;
        if (Object.keys(this.route.queryParams.value).indexOf('replyId') > -1) {
          showReplies = true;
        }
        const countTree = (parentNode: any, currentNode: any) => {
          argArray.push(currentNode);
          currentNode.showReplies = showReplies;
          if (currentNode.replies.rows.length > 0) {
            currentNode.replies.rows.forEach((reply: any) => {
              reply.showReplies = showReplies;
              countTree(parentNode, reply);
              const replyClone = Object.assign({}, reply);
              replyClone.replies = [];
              if (!parentNode.children) parentNode.children = [];
              parentNode.children.push(replyClone);
            });
          }
          // To have parent comment/reply data
          const parent = argArray.find((arg) => arg.id === currentNode.parent.id);
          currentNode.parent = Object.assign(currentNode.parent, parent);
        };

        results.forEach((row: any,) => {
          countTree(row, row);
          if (row.id === row.parent.id)
            row.parent = this.idea;
        });

        this.replyCount = results.length;
        return results;
      }),
      tap((replies) => {
        setTimeout(() => {
          if (this.route.queryParams.value['replyId']) {
            this.idea.showReplies = true;
            this.goToArgument(this.route.queryParams.value['replyId'], replies);
          }
        }, 1000);
      }));
    this.folders$ = this.TopicIdeaService
      .getFolders({ topicId: this.topic.id, ideationId: this.idea.ideationId, ideaId: this.idea.id })
      .pipe(map((res: any) => res.rows));
    this.images$ = this.IdeaAttachmentService.query({ topicId: this.topic.id, ideationId: this.idea.ideationId, ideaId: this.idea.id, type: 'image' })
      .pipe(map((res: any) => res.rows));
  }

  override ngAfterViewInit(): void {
    if (Object.keys(this.route.queryParams.value).indexOf('replyId') > -1) {
      this.idea.showReplies = true;
    }
  }
  prevIdea() {
    this.TopicIdeaService.loadItems().pipe(take(1)).subscribe((ideas) => {
      let index = ideas.findIndex((item) => item.id === this.idea.id);
      if (index === 0) index = ideas.length;
      const newIdea = ideas[index - 1];
      this.router.navigate(['/', this.Translate.currentLang, 'topics', this.topic.id, 'ideation', this.ideation.id, 'ideas', newIdea.id]);
      this.idea = newIdea;
      this.folders$ = this.TopicIdeaService
        .getFolders({ topicId: this.topic.id, ideationId: this.idea.ideationId, ideaId: this.idea.id })
        .pipe(take(1), map((res: any) => res.rows));
      this.images$ = this.IdeaAttachmentService
        .query({ topicId: this.topic.id, ideationId: this.idea.ideationId, ideaId: this.idea.id, type: 'image' })
        .pipe(take(1), map((res: any) => res.rows));
      this.notification = null;
    })
  }

  nextIdea() {
    this.TopicIdeaService.loadItems().pipe(take(1)).subscribe((ideas) => {
      let index = ideas.findIndex((item) => item.id === this.idea.id);
      if (index === ideas.length - 1) index = -1;
      const newIdea = ideas[index + 1];
      this.router.navigate(['/', this.Translate.currentLang, 'topics', this.topic.id, 'ideation', this.ideation.id, 'ideas', newIdea.id]);
      this.idea = newIdea;
      this.folders$ = this.TopicIdeaService
        .getFolders({ topicId: this.topic.id, ideationId: this.idea.ideationId, ideaId: this.idea.id })
        .pipe(take(1), map((res: any) => res.rows));
      this.images$ = this.IdeaAttachmentService
        .query({ topicId: this.topic.id, ideationId: this.idea.ideationId, ideaId: this.idea.id, type: 'image' })
        .pipe(take(1), map((res: any) => res.rows));

      this.notification = null;
    });
  }

  private _parseArgumentIdAndVersion(argumentIdWithVersion: string) {
    if (!argumentIdWithVersion) {
      return {
        commentId: null,
        commentVersion: null
      }
    }
    if (argumentIdWithVersion.length === 36) {
      argumentIdWithVersion = argumentIdWithVersion + this.TopicIdeaRepliesService.ARGUMENT_VERSION_SEPARATOR + '0';
    }
    const argumentIdAndVersionRegex = new RegExp('^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4{1}[a-fA-F0-9]{3}-[89abAB]{1}[a-fA-F0-9]{3}-[a-fA-F0-9]{12})' + this.TopicIdeaRepliesService.ARGUMENT_VERSION_SEPARATOR + '([0-9]+)$'); // SRC: https://gist.github.com/bugventure/f71337e3927c34132b9a#gistcomment-2238943
    const argumentIdWithVersionSplit = argumentIdWithVersion.match(argumentIdAndVersionRegex);

    if (!argumentIdWithVersionSplit) {
      console.error('Invalid input for _parseCommentIdAndVersion. Provided commentId does not look like UUIDv4 with version appended', argumentIdWithVersion);
      return {
        commentId: null,
        commentVersion: null
      }
    }

    return {
      argumentIdWithVersion,
      id: argumentIdWithVersionSplit[1],
      version: parseInt(argumentIdWithVersionSplit[2]),
    }
  };

  private scrollTo(argumentEl: HTMLElement | null) {
    if (argumentEl) {
      argumentEl.scrollIntoView();
      argumentEl.classList.add('highlight');
      setTimeout(() => {
        argumentEl?.classList.remove('highlight');
      }, 2000);
    }
  }
  goToArgument(argumentIdWithVersion: string, items: any) {
    if (!argumentIdWithVersion || argumentIdWithVersion.indexOf(this.TopicIdeaRepliesService.ARGUMENT_VERSION_SEPARATOR) < 0) {
      console.error('Invalid input for this.goToComment. Expecting UUIDv4 comment ID with version. For example: "604670eb-27b4-48d0-b19b-b6cf6bde33b2_v0"', argumentIdWithVersion);
      return;
    }
    let commentElement: HTMLElement | null = document.getElementById(argumentIdWithVersion);
    // The referenced comment was found on the page displayed
    if (commentElement) {
      this.scrollTo(commentElement);
      commentElement.classList.add('highlight');
      setTimeout(() => {
        if (commentElement)
          commentElement.classList.remove('highlight');
      }, 2000);
    } else {
      // The referenced comment was NOT found on the page displayed.
      // That means either:
      // 1. the commentId + version refers to another version of the comment and the comments are not expanded.
      // 2. the commentId + version refers to a comment reply, but replies have not been expanded.
      // 3. the commentId + version is on another page
      // 4. the comment/reply does not exist

      const argumentParameterValues = this._parseArgumentIdAndVersion(argumentIdWithVersion);
      const argumentId = argumentParameterValues.id;
      const argumentVersion = argumentParameterValues.version || 0;

      if (!argumentId) {
        return console.error('this.goToArgument', 'No argumentId and/or version provided, nothing to do here', argumentIdWithVersion);
      }
      for (let i = 0; i < items.length; i++) {
        // 1. the commentId + version refers to another version of the comment and the comments are not expanded.
        if (items[i] === argumentId) {
          items[i].showEdits = true;
          const commentElement: HTMLElement | null = document.getElementById(argumentIdWithVersion);
          this.scrollTo(commentElement);
        } else { // 2. the commentId + version refers to a comment reply, but replies have not been expanded.
          for (let j = 0; j < items[i].children.length; j++) {
            if (items[i].children[j].id === argumentId) {
              const id = items[i].id;
              setTimeout(() => {
                document.getElementById(id + '_replies')?.click();
                const el: HTMLElement | null = document.getElementById(argumentIdWithVersion);
                this.scrollTo(el)
              }, 300)

              // Expand edits only if an actual edit is referenced.
              const replyEdits = items[i].children[j].edits;
              if (replyEdits.length && argumentVersion !== replyEdits.length - 1) {
                items[i].children[j].showEdits = true; // In case the reply has edits and that is referenced.
              }

              /*  this.$timeout(() => { // TODO:  After "showEdits" is set, angular will render the edits and that takes time. Any better way to detect of it to be done?
                  this.app.scrollToAnchor(commentIdWithVersion)
                    .then(() => {
                      const commentElement = angular.element(this.$document[0].getElementById(commentIdWithVersion));
                      commentElement.addClass('highlight');
                      this.$state.commentId = commentIdWithVersion;
                      this.$timeout(() => {
                        commentElement.removeClass('highlight');
                      }, 500);
                    });
                }, 100);*/

              // Break the outer loop when the inner reply loop finishes as there is no more work to do.
              i = items.length;

              break;
            }
          }
        }
      }
    }
  };

  viewFolder(folder: Folder) {
    this.dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['/', this.Translate.currentLang, 'topics', this.topic.id], { queryParams: { folderId: folder.id }, });
    });
    this.dialogRef.close();
  }

  hasMoreIdeas() {
    return this.TopicIdeaService.count.value;
  }
}
