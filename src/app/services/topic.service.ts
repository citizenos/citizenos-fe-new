import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from 'src/app/interfaces/apiResponse';
import { LocationService } from './location.service';
import { Observable, switchMap, map, of, take, BehaviorSubject, exhaustMap, shareReplay } from 'rxjs';
import { Topic } from 'src/app/interfaces/topic';
import { AuthService } from './auth.service';
import { DialogService } from 'src/app/shared/dialog';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class TopicService {
  public CATEGORIES = {
    agriculture: "agriculture",
    animal_protection: "animal_protection",
    arts: "arts",
    business: "business",
    civil_society: "civil_society",
    communities: "communities",
    culture: "culture",
    defence: "defence",
    democracy: "democracy",
    diversity: "diversity",
    education: "education",
    entertainment: "entertainment",
    environment: "environment",
    equality: "equality",
    health: "health",
    human_rights: "human_rights",
    legal: "legal",
    media: "media",
    migration: "migration",
    politics: "politics",
    public_transportation: "public_transportation",
    religion: "religion",
    science: "science",
    social_welfare: "social_welfare",
    sports: "sports",
    taxes: "taxes",
    technology: "technology",
    urban_development: "urban_development",
    work: "work",
    youth: "youth",
  };

  public STATUSES = {
    draft: 'draft',
    ideation: 'ideation',
    inProgress: 'inProgress', // Being worked on
    voting: 'voting', // Is being voted which means the Topic is locked and cannot be edited.
    followUp: 'followUp', // Done editing Topic and executing on the follow up plan.
    closed: 'closed' // Final status - Topic is completed and no editing/reopening/voting can occur.
  };

  public VISIBILITY = <any>{
    public: 'public', // Everyone has read-only on the Topic.  Pops up in the searches..
    private: 'private' // No-one can see except collaborators
  };

  public LEVELS = <any>{
    read: 'read',
    edit: 'edit',
    admin: 'admin'
  };
  CATEGORIES_COUNT_MAX = 3;

  private readonly loadTopic$ = new BehaviorSubject<void>(undefined);

  constructor(private readonly dialog: DialogService, private readonly Location: LocationService, private readonly http: HttpClient, private readonly Auth: AuthService, private readonly router: Router) { }

  loadTopic(id: string, params?: { [key: string]: string | boolean }) {
    return this.loadTopic$.pipe(
      exhaustMap(() => this.get(id, params)),
      shareReplay()
    );
  }

  reloadTopic(): void {
    this.loadTopic$.next();
  }

  get(id: string, params?: { [key: string]: string | boolean }): Observable<Topic> {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId'), { topicId: id });
    return this.http.get<ApiResponse>(path, { withCredentials: true, params, observe: 'body', responseType: 'json' })
      .pipe(switchMap((res: any) => {
        const topic = res.data;
        return of(topic);
      }))
  }

  count() {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/count');

    return this.http.get<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(map(res => res.data));
  }

  save(data: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/topics')

    return this.http.post<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  readDescription(id: string, rev?: string): Observable<Topic> {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/description', { topicId: id });
    let params = <any>{};
    if (rev) {
      params.rev = rev;
    }
    return this.http.get<ApiResponse>(path, { withCredentials: true, params , observe: 'body', responseType: 'json' })
      .pipe(switchMap((res: any) => {
        const topic = res.data;
        return of(topic);
      }))
  }
  update(data: any) {
    const updateFields = ['visibility', 'status', 'categories', 'endsAt', 'hashtag', 'imageUrl', 'title', 'intro', 'contact', 'country', 'language'];
    const sendData: any = {};

    updateFields.forEach((field) => {
      if (field in data) {
        sendData[field] = data[field];
      }
    });

    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId', { topicId: data.id || data.topicId });

    return this.http.put<ApiResponse>(path, sendData, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  revert (topicId: string ,rev: number) {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/revert', { topicId: topicId });

    return this.http.post<ApiResponse>(path, {rev: rev}, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  patch(data: any) {
    const updateFields = ['title', 'visibility', 'status', 'categories', 'endsAt', 'hashtag', 'imageUrl', 'intro', 'contact', 'country', 'language'];
    const sendData: any = {};

    updateFields.forEach((field) => {
      if (field in data) {
        sendData[field] = data[field];
      }
    });

    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId', { topicId: data.id || data.topicId });

    return this.http.patch<ApiResponse>(path, sendData, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res)
      );
  }

  query(params: { [key: string]: any }): Observable<ApiResponse> {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/topics');
    const queryParams = Object.fromEntries(Object.entries(params).filter((i) => i[1] !== null));

    return this.http.get<ApiResponse>(path, { withCredentials: true, params: queryParams, observe: 'body', responseType: 'json' })
      .pipe(switchMap((res: any) => {
        const topic = res.data;
        return of(topic);
      }))
  };

  delete(data: any) {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId', { topicId: data.id || data.topicId });

    return this.http.delete<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(map(res => res.data));
  }

  duplicate(data: any) {
    if (!data.topicId) data.topicId = data.id;
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/duplicate', data);

    return this.http.get<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(map(res => res.data));
  };

  addToFavourites(topicId: string) {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/favourite', { topicId: topicId });

    return this.http.post<ApiResponse>(path, {}, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  removeFromFavourites(topicId: string) {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/favourite', { topicId: topicId });

    return this.http.delete<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  download(topicId: string) {
    return this.Location.getAbsoluteUrlApi('/api/topics/:topicId/download', { topicId });
  }

  toggleFavourite(topic: Topic) {
    if (!topic.favourite) {
      return this.addToFavourites(topic.id).pipe(take(1)).subscribe(() => {
        topic.favourite = true;
      });
    } else {
      return this.removeFromFavourites(topic.id).pipe(take(1)).subscribe(() => {
        topic.favourite = false;
      });
    }
  };

  isPrivate(topic: Topic) {
    return topic && topic.visibility === this.VISIBILITY.private;
  };

  canUpdate(topic: Topic) {
    return (topic?.permission && topic.permission.level === this.LEVELS.admin && topic.status !== this.STATUSES.closed);
  };

  changeState(topic: Topic, state: keyof typeof this.STATUSES, stateSuccess?: string) {
    const templates = <any>{
      closed: {
        level: 'delete',
        heading: 'MODALS.TOPIC_CLOSE_CONFIRM_HEADING_CLOSE_TOPIC',
        title: 'MODALS.TOPIC_CLOSE_CONFIRM_TXT_ARE_YOU_SURE',
        description: 'MODALS.TOPIC_CLOSE_CONFIRM_TXT_NO_UNDO',
        points: ['MODALS.TOPIC_CLOSE_CONFIRM_TXT_NO_EDIT', 'MODALS.TOPIC_CLOSE_CONFIRM_TXT_NO_VOTE'],
        closeBtn: 'MODALS.TOPIC_CLOSE_CONFIRM_BTN_NO',
        confirmBtn: 'MODALS.TOPIC_CLOSE_CONFIRM_BTN_YES'
      },
      vote: {
        heading: 'MODALS.TOPIC_SEND_TO_VOTE_CONFIRM_HEADING',
        title: 'MODALS.TOPIC_SEND_TO_VOTE_CONFIRM_TXT_ARE_YOU_SURE',
        description: 'MODALS.USER_DELETE_CONFIRM_TXT_NO_UNDO',
        points: ['MODALS.TOPIC_SEND_TO_VOTE_CONFIRM_TXT_NO_EDIT'],
        confirmBtn: 'MODALS.TOPIC_SEND_TO_VOTE_CONFIRM_BTN_YES',
        closeBtn: 'MODALS.TOPIC_SEND_TO_VOTE_CONFIRM_BTN_NO'
      }
    }

    if (templates[state]) {
      const confirm = this.dialog.open(ConfirmDialogComponent, {
        data: templates[state]
      });
      confirm.afterClosed().subscribe((res) => {
        if (res === true) {
          this.patch({
            id: topic.id,
            status: this.STATUSES[state]
          }).pipe(take(1))
            .subscribe({
              next: () => {
                if (state === 'voting' && !topic.voteId && !topic.vote) {
                  this.router.navigate(['/topics', topic.id, 'votes', 'create'])
                }
                this.reloadTopic();
                if (state === 'followUp') {
                  this.router.navigate(['/topics', topic.id], { fragment: 'followUp' })
                }
                this.dialog.closeAll();
              }, error: (res) => {
                console.error(res);
              }
            })

        }
      });
    } else {
      this.patch({
        id: topic.id,
        status: this.STATUSES[state]
      }).pipe(take(1))
        .subscribe({
          next: () => {
            if (state === 'voting' && !topic.voteId && !topic.vote) {
              this.router.navigate(['/topics', topic.id, 'votes', 'create'])
            }
            this.reloadTopic();
            if (state === 'followUp') {
              this.router.navigate(['/topics', topic.id], { fragment: 'followUp' })
            }
            this.dialog.closeAll();
          }, error: (res) => {
            console.error(res);
          }
        })
    }
  }
  /**
   * Can one edit Topics settings and possibly description (content)?
   * Use canEditDescription() if you only need to check if content can be edited.
   *
   * @returns {boolean}
   *
   */
  canEdit(topic: Topic) {
    return (topic && [this.LEVELS.admin, this.LEVELS.edit].indexOf(topic.permission.level) > -1 && topic.status !== this.STATUSES.closed);
  };

  /**
   * Can one edit Topics description (content)?
   *
   * @returns {boolean}
   *
   */
  canEditDescription(topic: Topic) {
    return this.canEdit(topic) && [this.STATUSES.ideation, this.STATUSES.inProgress, this.STATUSES.draft].indexOf(topic.status) > -1;
  };

  canDelete(topic: Topic) {
    return (topic && topic.permission?.level === this.LEVELS.admin);
  };

  canSendToFollowUp(topic: Topic) {
    return this.canUpdate(topic) && topic.vote?.id && topic.status !== this.STATUSES.followUp;
  };

  canSendToVote(topic: Topic) {
    return this.canUpdate(topic) && [this.STATUSES.voting, this.STATUSES.followUp, this.STATUSES.closed].indexOf(topic.status) < 0;
  };

  canLeave() {
    return this.Auth.loggedIn$.value;
  };

  canShare(topic: Topic) {
    return topic && (!this.isPrivate(topic) || this.canUpdate(topic));
  }

  doDeleteTopic(topic: Topic, redirect: string[]) {
    const deleteDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.TOPIC_DELETE_CONFIRM_HEADING',
        title: 'MODALS.TOPIC_DELETE_CONFIRM_TXT_ARE_YOU_SURE',
        description: 'MODALS.TOPIC_DELETE_CONFIRM_TXT_NO_UNDO',
        points: ['MODALS.TOPIC_DELETE_CONFIRM_TXT_TOPIC_DELETED', 'MODALS.TOPIC_DELETE_CONFIRM_TXT_DISCUSSION_DELETED', 'MODALS.TOPIC_DELETE_CONFIRM_TXT_TOPIC_REMOVED_FROM_GROUPS'],
        confirmBtn: 'MODALS.TOPIC_DELETE_CONFIRM_YES',
        closeBtn: 'MODALS.TOPIC_DELETE_CONFIRM_NO'
      }
    });
    deleteDialog.afterClosed().subscribe(result => {
      if (result === true) {
        this.delete(topic)
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigate(redirect);
          })
      }
    });
  };
}
