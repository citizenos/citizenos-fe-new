import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { LocationService } from './location.service';
import { ApiResponse } from 'src/app/interfaces/apiResponse';
import { Idea } from 'src/app/interfaces/idea';
import { Observable, BehaviorSubject, map, distinct, catchError, EMPTY, exhaustMap, shareReplay, tap, take } from 'rxjs';
import { ItemsListService } from './items-list.service';

@Injectable({
  providedIn: 'root'
})
export class TopicIdeaService extends ItemsListService {

  public IDEA_REPORT_TYPES = {
    abuse: 'abuse', // is abusive or insulting
    obscene: 'obscene', // contains obscene language
    spam: 'spam', // contains spam or is unrelated to topic
    hate: 'hate', // contains hate speech
    duplicate: 'duplicate', // duplicate
    other: 'other'
  };

  public IDEA_ORDER_BY = {
    rating: 'rating',
    popularity: 'popularity',
    date: 'date'
  };
  IDEA_VERSION_SEPARATOR = '_v';
  IdeaIds = <string[]>[];
  params = {
    topicId: <string | null>null,
    ideationId: <string | null>null,
    orderBy: <string>this.IDEA_ORDER_BY.date,
    types: <string | string[] | null>null,
    order: <string | null>null,
    offset: <number>0,
    authorId: <string | null>null,
    folderId: <string | null>null,
    showModerated: <boolean | string | null>null,
    favourite: <boolean | string | null>null,
    limit: <number>15,
  };

  params$ = new BehaviorSubject(this.params);

  count = new BehaviorSubject({
    total: 0,
    con: 0,
    pro: 0,
    poi: 0,
    reply: 0
  });

  constructor(private http: HttpClient, private Location: LocationService, private Auth: AuthService) {
    super();
    this.items$ = this.loadItems();

  }

  loadIdeas() {
    return this.reload$.pipe(
      exhaustMap(() => this.loadItems()),
      tap((ideas) => console.log(ideas)),
      shareReplay()
    );
  }

  get (data: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas/:ideaId'), data);

    return this.http.get<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }
  save(data: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas'), data);

    return this.http.post<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  update(data: any) {
    if (!data.commentId) data.commentId = data.id;
    const path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas/:ideaId'), data);

    return this.http.put<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  delete(data: any) {
    if (!data.commentId) data.commentId = data.id;
    const path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas/:ideaId'), data)

    return this.http.delete<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  toggleFavourite(idea: { [key: string]: any }) {
    if (!idea['favourite']) {
      return this.addToFavourites(idea).pipe(take(1)).subscribe(() => {
        idea['favourite'] = true;
      });
    } else {
      return this.removeFromFavourites(idea).pipe(take(1)).subscribe(() => {
        idea['favourite'] = false;
      });
    }
  };

  addToFavourites(params: { [key: string]: any }) {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/ideations/:ideationId/ideas/:ideaId/favourite', params);

    return this.http.post<ApiResponse>(path, {}, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  removeFromFavourites(params: { [key: string]: any }) {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/ideations/:ideationId/ideas/:ideaId/favourite', params);

    return this.http.delete<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  query(params?: { [key: string]: any }): Observable<ApiResponse> {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas'), params);

    const queryParams = Object.fromEntries(Object.entries(params || {}).filter((i) => i[1] !== null));
    return this.http.get<ApiResponse>(path, { withCredentials: true, params: queryParams, observe: 'body', responseType: 'json' });
  }


  getFolder (params: { [key: string]: any }): any {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/folders/:folderId'), params);

    const queryParams = Object.fromEntries(Object.entries(params).filter((i) => i[1] !== null));

    return this.http.get<ApiResponse>(path, { withCredentials: true, params: queryParams, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  getFolders (params: { [key: string]: any }): any {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas/:ideaId/folders'), params);

    const queryParams = Object.fromEntries(Object.entries(params).filter((i) => i[1] !== null));

    return this.http.get<ApiResponse>(path, { withCredentials: true, params: queryParams, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  addFolders (params: any, data: any) {
    console.log('DATA', data);
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas/:ideaId/folders'), params);

    return this.http.post<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  vote(data: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas/:ideaId/votes'), data);

    return this.http.post<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  votes(data: { [key: string]: any }) {
    if (!data['commentId']) data['commentId'] = data['id'];
    const queryParams = Object.fromEntries(Object.entries(data).filter((i) => i[1] !== null));

    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas/:ideaId/votes'), data);
    return this.http.get<ApiResponse>(path, { withCredentials: true, params: queryParams, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  };

  report(data: any) {
    if (!data.commentId) data.commentId = data.id;
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/ideations/:ideationId/ideas/:ideaId/reports'), data);

    return this.http.post<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  };

  getReport(data: any) {
    const path = this.Location.getAbsoluteUrlApi('/api/topics/:topicId/ideations/:ideationId/ideas/:ideaId/reports/:reportId', data);
    const headers = {
      'Authorization': 'Bearer ' + data.token
    };
    return this.http.get<ApiResponse>(path, { headers, withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  };

  moderate(data: any) {
    const path = this.Location.getAbsoluteUrlApi('/api/topics/:topicId/ideations/:ideationId/ideas/:ideaId/reports/:reportId/moderate', data)
    const headers = {
      'Authorization': 'Bearer ' + data.token
    };

    return this.http.post<ApiResponse>(path, data.report, { headers, withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  getItems(params: any) {
    return this.getIdeas(params);
  }

  getIdeas(params?: any | null) {
    return this.query(params).pipe(
      map((res) => {
        this.count.next(res.data.count);
        return { rows: res.data.rows, countTotal: res.data.count || 0 }
      }),
      distinct(),
      catchError(() => EMPTY)
    );
  }

  updateParams(params: { [key: string]: any }) {
    const curparams = this.params$.value;
    Object.assign(curparams, params);
    this.params$.next(curparams);
  }

  getIdeaIdWithVersion(ideaId: string, version: number) {
    return ideaId + this.IDEA_VERSION_SEPARATOR + version;
  };

}
