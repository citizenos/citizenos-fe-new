import { TopicDiscussionService } from '@services/topic-discussion.service';
import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation, Input, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { tap, of, map, take, switchMap } from 'rxjs';
import { Topic } from 'src/app/interfaces/topic';
import { Argument } from 'src/app/interfaces/argument';
import { AuthService } from '@services/auth.service';
import { AppService } from '@services/app.service';
import { TopicArgumentService } from '@services/topic-argument.service';
import { TopicService } from '@services/topic.service';
import { DialogService } from 'src/app/shared/dialog';
import { TopicDiscussionCreateDialogComponent } from '../topic-discussion-create-dialog/topic-discussion-create-dialog.component';
import { Discussion } from 'src/app/interfaces/discussion';
import { TranslateService } from '@ngx-translate/core';
import { EditDiscussionDeadlineComponent } from '../edit-discussion-deadline/edit-discussion-deadline.component';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '@services/notification.service';
import { MissingDiscussionComponent } from '../missing-discussion/missing-discussion.component';

@Component({
  selector: 'topic-arguments',
  templateUrl: './topic-arguments.component.html',
  styleUrls: ['./topic-arguments.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TopicArgumentsComponent implements OnInit {
  @Input() topic!: Topic;
  @ViewChild('post_argument_wrap') postArgumentEl?: ElementRef;
  wWidth = window.innerWidth;
  argumentTypes = Object.keys(this.TopicArgumentService.ARGUMENT_TYPES).map((type: string) => {
    return { type: type, checked: false }
  });
  arguments$ = of(<Argument[] | any[]>[]);
  discussion$ = of(<Discussion | any>null);
  orderByOptions = Object.keys(this.TopicArgumentService.ARGUMENT_ORDER_BY);
  focusArgumentSubject = false;
  filtersSelected = false;
  constructor(
    private readonly Auth: AuthService,
    public TopicService: TopicService,
    private readonly dialog: DialogService,
    @Inject(ActivatedRoute) private readonly route: ActivatedRoute,
    public translate: TranslateService,
    private readonly app: AppService,
    private readonly Notification: NotificationService,
    private readonly TopicDiscussionService: TopicDiscussionService,
    public TopicArgumentService: TopicArgumentService) {
    this.TopicArgumentService.setParam('limit', 5);

    this.arguments$ = this.TopicArgumentService.reload$.pipe(
      switchMap(() => {
        return this.TopicArgumentService.loadArguments()
      }),
      map((res: any[]) => {
        let results = res.concat([]);
        const argArray = <any[]>[];
        const countTree = (parentNode: any, currentNode: any) => {
          argArray.push(currentNode);
          if (currentNode.replies.rows.length > 0) {
            currentNode.replies.rows.forEach((reply: any) => {
              if (parentNode.type !== this.TopicArgumentService.ARGUMENT_TYPES.reply) {
                countTree(reply, reply);
              } else {
                countTree(parentNode, reply);
                const replyClone = { ...reply };
                replyClone.replies = [];
                if (!parentNode.children) parentNode.children = [];
                parentNode.children.push(replyClone);
              }
            });
          }
          // To have parent comment/reply data
          if (currentNode.type === this.TopicArgumentService.ARGUMENT_TYPES.reply) {
            const parent = argArray.find((arg) => arg.id === currentNode.parent.id);
            currentNode.parent = Object.assign(currentNode.parent, parent);
          }
        };

        results.forEach((row: any,) => {
          row.replies.count = countTree(row, row);
        });
        this.TopicArgumentService.items$ = of(results);
        return results;
      }),
      tap(() => {
        this.route.queryParams.pipe(take(1), tap((params) => {
          setTimeout(() => {
            if (params['argumentId']) {
              this.goToArgument(params['argumentId'], null);
            }
          });
        })).subscribe();
      }));
  }

  ngOnDestroy(): void {
    this.app.addArgument.next(false);
  }
  ngOnInit(): void {
    this.TopicArgumentService.setParam('topicId', this.topic.id)
    this.discussion$ = this.TopicService.loadTopic(this.topic.id).pipe(switchMap((topic) => {
      if (topic.discussionId) {
        return this.TopicDiscussionService.loadDiscussion({
          topicId: this.topic.id,
          discussionId: topic.discussionId
        }).pipe(tap((discussion) => {

          if (!discussion.question && discussion.createdAt === discussion.updatedAt && this.canUpdate()) {
            this.dialog.open(MissingDiscussionComponent, {
              data: { topic: this.topic }
            });
          }
        }));
      } else {
        return of(null);
      }
    }))
  }

  filterArguments() {
    this.filtersSelected = true;
    const types = this.argumentTypes.filter((item: any) => item.checked).map(item => item.type);
    this.TopicArgumentService.loadPage(1);
    this.TopicArgumentService.setParam('types', types);
  }
  getArgumentPercentage(count: number) {
    return count / (this.TopicArgumentService.count.value.pro + this.TopicArgumentService.count.value.con) * 100 || 0;
  }

  doAddArgument() {
    if (this.Auth.loggedIn$.value) {
      if (this.topic.status !== this.TopicService.STATUSES.ideation && this.topic.discussionId) {
        this.app.addArgument.next(true);
        this.postArgumentEl?.nativeElement.scrollIntoView();
        this.focusArgumentSubject = true;
      } else {
        const startDiscussionDialog = this.dialog.open(TopicDiscussionCreateDialogComponent, {
          data: {
            topic: this.topic
          }
        });

        startDiscussionDialog.afterClosed().subscribe((val) => {
          if (val) {
            this.TopicService.get(this.topic.id).pipe(take(1)).subscribe((topic) => {
              this.topic = topic;
              this.discussion$ = this.TopicDiscussionService.loadDiscussion({
                topicId: this.topic.id,
                discussionId: this.topic.discussionId
              });
            })
          }

        })
      }
    } else {
      this.app.doShowLogin();
    }
  };

  private _parseArgumentIdAndVersion(argumentIdWithVersion: string) {
    if (!argumentIdWithVersion) {
      return {
        commentId: null,
        commentVersion: null
      }
    }
    if (argumentIdWithVersion.length === 36) {
      argumentIdWithVersion = argumentIdWithVersion + this.TopicArgumentService.ARGUMENT_VERSION_SEPARATOR + '0';
    }
    const argumentIdAndVersionRegex = new RegExp('^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4{1}[a-fA-F0-9]{3}-[89abAB]{1}[a-fA-F0-9]{3}-[a-fA-F0-9]{12})' + this.TopicArgumentService.ARGUMENT_VERSION_SEPARATOR + '([0-9]+)$'); // SRC: https://gist.github.com/bugventure/f71337e3927c34132b9a#gistcomment-2238943
    const argumentIdWithVersionSplit = RegExp(argumentIdAndVersionRegex).exec(argumentIdWithVersion);

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
  goToArgument(argumentIdWithVersion: string, $event: any) {
    if (!argumentIdWithVersion || argumentIdWithVersion.indexOf(this.TopicArgumentService.ARGUMENT_VERSION_SEPARATOR) < 0) {
      console.error('Invalid input for this.goToComment. Expecting UUIDv4 comment ID with version. For example: "604670eb-27b4-48d0-b19b-b6cf6bde33b2_v0"', argumentIdWithVersion);
      return;
    }
    let commentElement: HTMLElement | null = document.getElementById(argumentIdWithVersion);
    // The referenced comment was found on the page displayed
    if (commentElement) {
      this.scrollTo(commentElement);
      commentElement.classList.add('highlight');
      setTimeout(() => {
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
     // const argumentVersion = argumentParameterValues.version ?? 0;
      if (!argumentId) {
        return console.error('this.goToArgument', 'No argumentId and/or version provided, nothing to do here', argumentIdWithVersion);
      }

      const functionParseReplies = (items: any, parent?: any) => {
        for (let i = 0; i < items.length; i++) {
          // 1. the commentId + version refers to another version of the comment and the comments are not expanded.

          if (items[i].id === argumentId) {
            console.log(items[i].id, argumentId);
            if (parent) {
              document.getElementById(parent.id + '_replies')?.click();
            }
            items[i].showEdits = true;
            setTimeout(() => {
              const commentElement: HTMLElement | null = document.getElementById(argumentIdWithVersion);
              if (commentElement) {
                this.scrollTo(commentElement);
                commentElement.classList.add('highlight');
                setTimeout(() => {
                  commentElement.classList.remove('highlight');
                }, 2000);
              }
            }, 200)

            i = items.length;
          } else if (items[i].replies.rows.length) { // 2. the commentId + version refers to a comment reply, but replies have not been expanded.
            console.log(items[i].replies.rows)
            functionParseReplies(items[i].replies.rows, parent || items[i]);
            /*for (let j = 0; j < items[i].replies.rows.length; j++) {
              if (items[i].replies.rows[j].id === argumentId) {
                const id = items[i].id;
                setTimeout(() => {
                  document.getElementById(id + '_replies')?.click();
                  setTimeout(() => {
                    const commentElement: HTMLElement | null = document.getElementById(argumentIdWithVersion);
                    this.scrollTo(commentElement);

                  }, 300)
                }, 300)

                // Expand edits only if an actual edit is referenced.
                const replyEdits = items[i].replies.rows[j].edits;
                if (replyEdits.length && argumentVersion !== replyEdits.length - 1) {
                  items[i].replies.rows[j].showEdits = true; // In case the reply has edits and that is referenced.
                }
                // Break the outer loop when the inner reply loop finishes as there is no more work to do.
                i = items.length;

                break;
              }
            }*/
          }
        }
      }
      this.TopicArgumentService.items$.pipe(take(1))
        .subscribe(
          (items: any) => {
            functionParseReplies(items);
          }
        )

    }
  };

  canUpdate() {
    return this.TopicService.canUpdate(this.topic);
  }

  canEdit() {
    return this.TopicService.canEdit(this.topic);
  }
  canEditDeadline() {
    return this.canEdit() && this.topic.status === this.TopicService.STATUSES.inProgress;
  }

  hasDiscussionEndedExpired(discussion: Discussion) {
    return this.TopicDiscussionService.hasDiscussionEndedExpired(this.topic, discussion);
  };

  hasIdeationEnded(discussion: Discussion) {
    return this.TopicDiscussionService.hasDiscussionEnded(this.topic, discussion);
  };

  editDeadline(discussion: Discussion) {
    const discussionDeadlineDialog = this.dialog.open(EditDiscussionDeadlineComponent, {
      data: {
        discussion,
        topic: this.topic
      }
    });
    discussionDeadlineDialog.afterClosed().subscribe(() => {
      this.TopicDiscussionService.reloadDiscussion();
    })
  }

  closeDiscussion(discussion: Discussion) {
    const closeDiscussionDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'warn',
        heading: 'COMPONENTS.CLOSE_DISCUSSION_CONFIRM.HEADING',
        description: 'COMPONENTS.CLOSE_DISCUSSION_CONFIRM.ARE_YOU_SURE',
        confirmBtn: 'COMPONENTS.CLOSE_DISCUSSION_CONFIRM.CONFIRM_YES',
        closeBtn: 'COMPONENTS.CLOSE_DISCUSSION_CONFIRM.CONFIRM_NO'
      }
    });
    closeDiscussionDialog.afterClosed().subscribe({
      next: (value) => {
        if (value) {
          discussion.deadline = new Date();
          this.saveDiscussion(discussion);
          this.topic.status = this.TopicService.STATUSES.inProgress;
          this.TopicService.patch(this.topic).pipe(take(1)).subscribe({
            next: () => {
              this.TopicService.reloadTopic();
            }
          });
        }
      }
    });
  }

  saveDiscussion(discussion: Discussion) {
    const saveDiscussion: any = { topicId: this.topic.id, discussionId: discussion.id, deadline: discussion.deadline };
    this.TopicDiscussionService.update(saveDiscussion)
      .pipe(take(1))
      .subscribe({
        next: (ideation) => {
          this.TopicDiscussionService.reloadDiscussion();
          this.TopicService.reloadTopic();
          this.dialog.closeAll();
        },
        error: (res) => {
          Object.values(res).forEach((message) => {
            if (typeof message === 'string')
              this.Notification.addError(message);
          });
        }
      });
  }
}
