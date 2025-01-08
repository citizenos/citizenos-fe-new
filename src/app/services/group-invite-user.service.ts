import { LocationService } from '@services/location.service';
import { ItemsListService } from '@services/items-list.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, BehaviorSubject, shareReplay, exhaustMap } from 'rxjs';
import { ApiResponse } from '../interfaces/apiResponse';

@Injectable({
  providedIn: 'root'
})
export class GroupInviteUserService extends ItemsListService {
  params = Object.assign(this.defaultParams, {groupId: <string | null>null});
  params$ = new BehaviorSubject(this.params);

  public LEVELS = ['read','admin'];

  constructor(private http: HttpClient, private Location: LocationService) {
    super();
    this.items$ = this.reload$.pipe(
      exhaustMap(() => this.loadItems()),
      shareReplay()
    );
  }

  getItems(params:any) {
    return this.query(params);
  }

  get(params: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/invites/users/:inviteId', params);

    return this.http.get<any>(path, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map((res) => {
        const data = res.data;
        data.user.isRegistered = res.status.code !== 20002;
        return data;
      })
    );
  }

  save(params: any, data: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/invites/users', params);

    return this.http.post<any>(path, data, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map((data) => {
        return data;
      })
    );
  }

  query(params: { [key: string]: any }) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/invites/users', params);
    const queryParams = Object.fromEntries(Object.entries(params).filter((i) => i[1] !== null));

    return this.http.get<any>(path, { withCredentials: true, params: queryParams, responseType: 'json', observe: 'body' }).pipe(
      map((res) => {
        return res.data;
      })
    );
  }

  accept(params: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/invites/users/:inviteId/accept', params);

    return this.http.post<any>(path, {}, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map((data) => {
        return data;
      })
    );
  }

  delete(params: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/invites/users/:inviteId', params);

    return this.http.delete<any>(path, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map((data) => {
        return data;
      })
    );
  }

  update(data: any) {
    if (!data.inviteId) data.inviteId = data.id;
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/invites/users/:inviteId', data);
    return this.http.put<ApiResponse>(path, data, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map(res => res.data)
    );
  }
}
