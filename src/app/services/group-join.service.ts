
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { LocationService } from '@services/location.service';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/apiResponse';

@Injectable({
  providedIn: 'root'
})
export class GroupJoinService {

  constructor(private Location: LocationService, private http: HttpClient) { }

  get(token: string) {
    const path = this.Location.getAbsoluteUrlApi('/api/groups/join/:token', { token });

    return this.http.get<ApiResponse>(path, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map(res => res.data)
    );
  }

  join(token: string) {
    const path = this.Location.getAbsoluteUrlApi('/api/groups/join/:token', { token });
    return this.http.post<ApiResponse>(path, {}, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map(res => res.data)
    );
  }

  joinPublic(groupId: string) {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/join', { groupId });
    return this.http.post<ApiResponse>(path, {}, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map(res => res.data)
    );
  }

  save(data: any) {
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/join', { groupId: data.groupId });
    return this.http.put<ApiResponse>(path, data, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map(res => res.data)
    );
  }

  update(data: any) {
    let path = this.Location.getAbsoluteUrlApi('/api/users/self/groups/:groupId/join/:token', { groupId: data.groupId || data.id, token: data.token });

    return this.http.put<ApiResponse>(path, data, { withCredentials: true, responseType: 'json', observe: 'body' }).pipe(
      map(res => res.data)
    );
  }
}
