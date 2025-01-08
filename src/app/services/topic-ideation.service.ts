import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from 'src/app/interfaces/apiResponse';
import { LocationService } from './location.service';
import { map, BehaviorSubject, exhaustMap, shareReplay } from 'rxjs';
import { Topic } from 'src/app/interfaces/topic';
import { Ideation } from 'src/app/interfaces/ideation'; // Ideation interface
import { AuthService } from './auth.service';
import { TopicService } from './topic.service';
import { ItemsListService } from './items-list.service';

@Injectable({
  providedIn: 'root'
})
export class TopicIdeationService extends ItemsListService {
  STATUSES = this.TopicService.STATUSES;

  params = {
    topicId: <string | null>null,
    ideationId: <string | null>null,
    types: <string | string[] | null>null,
    sortOrder: <string | null>null,
    offset: <number>0,
    authorId: <string | null>null,
    showModerated: <boolean | string | null>null,
    favourite: <boolean | string | null>null,
    limit: <number>8,
  };

  params$ = new BehaviorSubject(this.params);

  constructor(private Location: LocationService, private http: HttpClient, private Auth: AuthService, private TopicService: TopicService) {
    super();
    this.items$ = this.loadItems();
  }

  loadIdeation(params?: { [key: string]: string | boolean }) {
    return this.reload$.pipe(
      exhaustMap(() => this.get(params)),
      shareReplay()
    );
  }

  query(params: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations'), params);

    return this.http.get<ApiResponse>(path, { withCredentials: true, params, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  get<Ideation>(params?: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId'), params);

    return this.http.get<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  save(data: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations'), data)

    return this.http.post<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  participants(data: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/participants'), data);

    return this.http.get<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  update(data: any) {
    console.log('data', data);
    const path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId'), {topicId: data.topicId, ideationId: data.ideationId || data.id});
    console.log(path);
    return this.http.put<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  delete(data: any) {
    if (!data.ideationId) data.ideationId = data.id;
    const path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId'), data)

    return this.http.delete<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  downloadIdeas(topicId: string, ideationId: string) {
    return this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/ideations/:ideationId/download', { topicId, ideationId });
  }

  hasIdeationEnded(topic: Topic, ideation: Ideation) {
    if ([this.STATUSES.draft, this.STATUSES.ideation].indexOf(topic.status) === -1) {
      return true;
    }
    return ideation && ideation.deadline && new Date() > new Date(ideation.deadline);
  };

  hasIdeationEndedExpired(topic: Topic, ideation: Ideation) {
    return ([this.STATUSES.draft, this.STATUSES.ideation].indexOf(topic.status) === -1) || ideation.deadline && (new Date() > new Date(ideation.deadline));
  };

  getItems(params: any) {
    return this.get(params);
  }
}
