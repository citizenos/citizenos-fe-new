import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LocationService } from './location.service';
import { BehaviorSubject, map, take } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apiResponse';
import { ItemsListService } from './items-list.service';
import { AuthService } from './auth.service';
import { DialogService } from 'src/app/shared/dialog';
import { Topic } from '../interfaces/topic';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class TopicMemberUserService extends ItemsListService {
  params = { ...{ topicId: <string>'' }, ...this.defaultParams };
  params$ = new BehaviorSubject(this.params);
  constructor(private readonly dialog: DialogService, private readonly  Location: LocationService, private http: HttpClient, private AuthService: AuthService, private router: Router) {
    super();
    this.items$ = this.loadItems();
  }

  getItems(params: any) {
    return this.query(params);
  }

  query(params: { [key: string]: any }) {
    let path = this.Location.getAbsoluteUrlApi(this.AuthService.resolveAuthorizedPath('/topics/:topicId/members/users'), params);
    const queryParams = Object.fromEntries(Object.entries(params).filter((i) => i[1] !== null));

    return this.http.get<ApiResponse>(path, { withCredentials: true, params: queryParams, observe: 'body', responseType: 'json' }).pipe(
      map((res) => {
        return res.data;
      })
    );
  };

  update(params: any) {
    if (!params.userId) params.userId = params.id;
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/members/users/:userId', params);
    return this.http.put<ApiResponse>(path, params, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map((res) => {
        return res.data;
      })
    );
  }

  delete(params: any) {
    if (!params.userId) params.userId = params.id;
    const path = this.Location.getAbsoluteUrlApi('/api/users/self/topics/:topicId/members/users/:userId', params);

    return this.http.delete<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map((res) => {
        return res.data;
      })
    );
  }

  doLeaveTopic(topic: Topic, redirect: string[]) {
    const leaveDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        level: 'delete',
        heading: 'MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_HEADING',
        title: 'MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_TXT_ARE_YOU_SURE',
        points: ['MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_TXT_LEAVING_TOPIC_DESC'],
        confirmBtn: 'MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_BTN_YES',
        closeBtn: 'MODALS.TOPIC_MEMBER_USER_LEAVE_CONFIRM_BTN_NO'
      }
    });
    leaveDialog.afterClosed().subscribe(result => {
      if (result === true) {
        this.delete({ id: this.AuthService.user.value.id, topicId: topic.id })
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigate(redirect);
          });
      }
    });
  };
}
