import { Component, Inject } from '@angular/core';
import { DialogService, DIALOG_DATA } from 'src/app/shared/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, take, tap } from 'rxjs';
import { AuthService } from '@services/auth.service';
import { ConfigService } from '@services/config.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { GroupInviteUserService } from '@services/group-invite-user.service';
import { InviteData } from 'src/app/interfaces/dialogdata';

@Component({
  selector: 'app-group-invitation',
  templateUrl: './group-invitation.component.html',
  styleUrls: ['./group-invitation.component.scss'],
})
export class GroupInvitationComponent {
  invite: any;
  currentUrl: string | undefined;
  config = <any>this.ConfigService.get('links');
  constructor(
    private ConfigService: ConfigService,
    private dialog: DialogService,
    @Inject(DIALOG_DATA) private data: InviteData,
    private Auth: AuthService,
    private router: Router
  ) {
    this.invite = this.data.invite;
    this.currentUrl = this.data.currentUrl;
  }

  goToGroup() {
    this.dialog.closeAll();
    this.router.navigate(['/groups/', this.invite.groupId]);
  }
}

@Component({
  selector: 'group-invitation-dialog',
  template: '',
})
export class GroupInvitationDialogComponent {
  inviteId: string = '';
  join$;

  constructor(
    Auth: AuthService,
    dialog: DialogService,
    GroupInviteUserService: GroupInviteUserService,
    route: ActivatedRoute,
    router: Router,
    Notification: NotificationService,
    Location: LocationService
  ) {
    function joinGroup(groupInvite: any) {
      GroupInviteUserService.accept(groupInvite)
        .pipe(take(1))
        .subscribe({
          next: () => {
            router.navigate(['groups', groupInvite.groupId]);
          },
          error: (err) => {
            Notification.addError(err.message || err.status.message);
            console.error('Invite error', err);
          },
        });
    }

    function showJoinDialog(groupInvite: any, currentUrl: string) {
      /**
       * @note Add a redirectSuccess query parameter to the login URL
       * to join the user to the topic directly after login.
       */
      let redirect = currentUrl;
      route.queryParams.subscribe((params) => {
        if (!params['join']) {
          redirect = `${redirect}?join=true`;
        }
      });

      const queryParams = {
        redirectSuccess: redirect,
        email: groupInvite.user.email,
      };

      const invitationDialog = dialog.open(GroupInvitationComponent, {
        data: {
          invite: groupInvite,
          currentUrl,
        },
      });

      invitationDialog.afterClosed().subscribe({
        next: (res) => {
          if (res === true) {
            if (Auth.loggedIn$.value) {
              if (groupInvite.user.id !== Auth.user.value.id) {
                Auth.logout()
                  .pipe(take(1))
                  .subscribe(() => {
                    router.navigate(['/account/login'], {
                      queryParams: {
                        ...queryParams,
                        userId: groupInvite.user.id,
                      },
                    });
                  });
              } else {
                joinGroup(groupInvite);
              }
            } else {
              /**
               * @note This case works not as expected.
               * Or good to have an eye on this case.
               * @see group-invite-user.service.ts
               */
              if (groupInvite.user.isRegistered) {
                router.navigate(['/account/login'], {
                  queryParams: {
                    ...queryParams,
                    userId: groupInvite.user.id,
                  },
                });
              } else {
                router.navigate(['/account', 'signup'], {
                  queryParams: {
                    ...queryParams,
                    inviteId: groupInvite.id,
                  },
                });
              }
            }
          }
        },
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
          this.inviteId = routeParams['inviteId'];
          GroupInviteUserService.get(routeParams).subscribe({
            next: (groupInvite) => {
              groupInvite.inviteId = this.inviteId;

              const joinUrlForRedirect = Location.currentUrl();

              const hasDirectJoin =
                queryParams && queryParams['join'] === 'true';

              /**
               * @todo Implement userIsInTopic check.
               * Should be a boolean value returned from the API.
               *
               * Or redirect to the dashboard if the user is already in the topic.
               * Or show info toast.
               */
              const userIsInTopic = false;

              if (userIsInTopic) {
                router.navigate(['/groups', groupInvite.topicId]);
              } else if (
                Auth.loggedIn$.value &&
                groupInvite.user.id === Auth.user.value.id &&
                hasDirectJoin
              ) {
                joinGroup(groupInvite);
              } else {
                router.navigate(['dashboard']);
                showJoinDialog(groupInvite, joinUrlForRedirect);
              }
            },
            error: (err) => {
              router.navigate(['/']);
              setTimeout(() => {
                console.log(err);
                if (err.code === 41002 || err.status?.code === 41002) {
                  Notification.addError(
                    'MSG_ERROR_GET_API_USERS_GROUPS_INVITES_USERS_41002',
                    'MSG_ERROR_GET_API_USERS_GROUPS_INVITES_USERS_41002_HEADING'
                  );
                } else {
                  Notification.addError(err.message || err.status.message);
                }
              }, 400);
            },
          });
        })
      )
      .subscribe({
        error: (err) => console.error('Token join error', err),
      });
  }
}
