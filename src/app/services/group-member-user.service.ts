import { Injectable } from '@angular/core';
import { ItemsListService } from './items-list.service';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, exhaustMap, map, of, shareReplay } from 'rxjs';

import { LocationService } from './location.service';
import { AuthService } from './auth.service';
import { ApiResponse } from 'src/app/interfaces/apiResponse';
@Injectable({
  providedIn: 'root'
})
export class GroupMemberUserService extends ItemsListService {
  params = Object.assign(this.defaultParams, {groupId: <string | null>null, include: <Array<string> | string | null>null });
  params$ = new BehaviorSubject(this.params);
  public LEVELS = ['read','admin'];

  constructor(private Location: LocationService, private http: HttpClient, private Auth: AuthService) {
    super ();
    this.items$ = this.reload$.pipe(
      exhaustMap(() => this.loadItems()),
      shareReplay()
    );
  }

  resetPage() {
    this.params$.value.offset = 0;
    this.params$.value.page = 1;
    this.items$ = of([]);
  }

  getItems (params:any) {
    return this.query(params)
  }

  get(params: any) {
    let path = this.Location.getAbsoluteUrlApi(
      this.Auth.resolveAuthorizedPath('/groups/:groupId/members/users/:userId'),
      { 'userId:': params.userId, 'groupId:': params.groupId })

    return this.http.get<ApiResponse>(path, { withCredentials: true }).pipe(
      map(res => res.data)
    )
  }

  save(params: any, data: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/members/users', params);

    return this.http.post<ApiResponse>(path, data, { withCredentials: true }).pipe(
      map(res => res.data)
    )
  }

  update(params: any, data: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/members/users/:userId', params);

    return this.http.put<ApiResponse>(path, data, { withCredentials: true }).pipe(
      map(res => res.data)
    )
  }

  query(params: { [key: string]: any }) {
    let path = this.Location.getAbsoluteUrlApi(
      this.Auth.resolveAuthorizedPath('/groups/:groupId/members/users'),
      { groupId: params['groupId'] });
    const queryParams = Object.fromEntries(Object.entries(params).filter((i) => i[1] !== null));

    return this.http.get<ApiResponse>(path, { withCredentials: true, params: queryParams, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    )
  }

  delete(params: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/members/users/:userId', params)

    return this.http.delete<ApiResponse>(path, { withCredentials: true, responseType: 'json', observe: 'body' });
  }
}
