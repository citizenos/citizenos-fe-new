import { GroupService } from '@services/group.service';
import { Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, switchMap, take, tap } from 'rxjs';
import { GroupJoinService } from '@services/group-join.service';
import { LocationService } from '@services/location.service';
import { Group } from 'src/app/interfaces/group';
import { DialogService, DIALOG_DATA } from 'src/app/shared/dialog';
import { AppService } from '@services/app.service';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'group-join',
  templateUrl: './group-join.component.html',
  styleUrls: ['./group-join.component.scss'],
})
export class GroupJoinComponent {
  group: Group;
  constructor(
    @Inject(DIALOG_DATA) data: any,
    public dialog: DialogService,
    public router: Router
  ) {
    this.group = data.group;
  }

  goToGroup() {
    this.dialog.closeAll();
    this.router.navigate(['/groups/', this.group.id]);
  }
}

@Component({
  selector: 'group-token-join',
  template: '',
})
export class GroupTokenJoinComponent {
  token: string = '';
  join$;

  constructor(
    router: Router,
    dialog: DialogService,
    route: ActivatedRoute,
    Location: LocationService,
    GroupJoinService: GroupJoinService,
    GroupService: GroupService,
    app: AppService,
    Auth: AuthService
  ) {
    function joinGroup(group: Group, token: string, redirectSuccess?: string) {
      /**
       * @note Add a redirectSuccess query parameter to the login URL
       * to join the user to the topic directly after login.
       */
      let redirect = redirectSuccess;
      route.queryParams.subscribe((params) => {
        if (!params['join']) {
          redirect = `${redirect}?join=true`;
        }
      });

      if (token) {
        GroupJoinService.join(token)
          .pipe(take(1))
          .subscribe({
            next: (group) => {
              router.navigate(['/groups', group.id]);
            },
            error: (res) => {
              const status = res.status;
              if (status.code === 40100) {
                // Unauthorized
                app.doNavigateLogin({ redirectSuccess: redirect });
              } else if (status.code === 40001) {
                // Matching token not found.
                router.navigate(['dashboard']);
              } else {
                router.navigate(['/404']);
              }
            },
          });
      } else {
        GroupJoinService.joinPublic(group.id)
          .pipe(take(1))
          .subscribe({
            next: (group) => {
              router.navigate(['/groups', group.id]);
            },
            error: (res) => {
              const status = res.status;
              if (status.code === 40100) {
                // Unauthorized
                app.doNavigateLogin({
                  redirectSuccess: redirect,
                  groupId: group.id,
                });
              } else if (status.code === 40001) {
                // Matching token not found.
                router.navigate(['dashboard']);
              } else {
                router.navigate(['/404']);
              }
            },
          });
      }
    }

    function showJoinDialog(
      group: Group,
      token: string,
      redirectSuccess?: string
    ) {
      const joinDialog = dialog.open(GroupJoinComponent, {
        data: {
          group,
          token,
        },
      });

      joinDialog.afterClosed().subscribe((confirm) => {
        if (confirm === true) {
          joinGroup(group, token, redirectSuccess);
        }
      });
    }

    this.join$ = combineLatest([
      Auth.loggedIn$,
      Auth.user,
      route.params,
      route.queryParams,
    ])
      .pipe(
        take(1),
        tap(([_, __, routeParams, queryParams]) => {
          this.token = routeParams['token'];

          GroupJoinService.get(this.token).subscribe({
            next: (group) => {
              const userIsInGroup = group.userLevel;
              const groupId = group.id;
              const redirectSuccess = Location.currentUrl();

              const hasDirectJoin =
                queryParams && queryParams['join'] === 'true';

              if (userIsInGroup) {
                router.navigate(['/groups', groupId]);
              } else if (Auth.loggedIn$.value && hasDirectJoin) {
                joinGroup(group, this.token, redirectSuccess);
              } else {
                router.navigate(['dashboard']);
                showJoinDialog(group, this.token, redirectSuccess);
              }
            },
            error: (err) => {
              console.error('Group join error', err);
              if (err.status?.code === 40400) router.navigate(['/404']);
            },
          });
        })
      )
      .subscribe({
        error: (err) => console.error('Token join error', err),
      });
  }
}
