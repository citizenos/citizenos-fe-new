import { Component, Inject } from '@angular/core';
import { DialogService, DIALOG_DATA } from 'src/app/shared/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, take, tap } from 'rxjs';
import { InviteData } from 'src/app/interfaces/dialogdata';
import { AuthService } from '@services/auth.service';
import { ConfigService } from '@services/config.service';
import { LocationService } from '@services/location.service';
import { NotificationService } from '@services/notification.service';
import { TopicInviteUserService } from '@services/topic-invite-user.service';

@Component({
  selector: 'app-topic-invitation',
  templateUrl: './topic-invitation.component.html',
  styleUrls: ['./topic-invitation.component.scss'],
})
export class TopicInvitationComponent {
  invite;
  currentUrl: string | undefined;
  config = this.ConfigService.get('links');
  constructor(
    private ConfigService: ConfigService,
    private dialog: DialogService,
    @Inject(DIALOG_DATA) private data: InviteData,
    private Auth: AuthService,
    private router: Router
  ) {
    this.invite = data.invite;
    this.currentUrl = this.data.currentUrl;
  }

  goToTopic() {
    this.dialog.closeAll();
    this.router.navigate(['/topics/', this.invite.topic.id]);
  }

  loggedIn() {
    return this.Auth.loggedIn$.value;
  }
}

@Component({
  selector: 'topic-invite-dialog',
  template: '',
})
export class TopicInvitationDialogComponent {
  inviteId: string = '';
  join$;

  constructor(
    Auth: AuthService,
    dialog: DialogService,
    TopicInviteUserService: TopicInviteUserService,
    route: ActivatedRoute,
    router: Router,
    Notification: NotificationService,
    Location: LocationService
  ) {
    function joinTopic(topicInvite: any) {
      TopicInviteUserService.accept(topicInvite)
        .pipe(take(1))
        .subscribe({
          next: () => {
            router.navigate(['/topics', topicInvite.topicId]);
          },
          error: (err) => {
            console.error('Invite error', err);
          },
        });
    }

    function showJoinDialog(topicInvite: any, currentUrl: string) {
      const invitationDialog = dialog.open(TopicInvitationComponent, {
        data: {
          invite: topicInvite,
          currentUrl,
        },
      });

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
        email: topicInvite.user.email,
      };

      invitationDialog.afterClosed().subscribe({
        next: (res) => {
          if (res === true) {
            if (Auth.loggedIn$.value) {
              if (topicInvite.user.id !== Auth.user.value.id) {
                Auth.logout()
                  .pipe(take(1))
                  .subscribe(() => {
                    router.navigate(['/account/login'], {
                      queryParams: {
                        ...queryParams,
                        userId: topicInvite.user.id,
                      },
                    });
                  });
              } else {
                joinTopic(topicInvite);
              }
            } else {
              /**
               * @note This case works not as expected.
               * Or good to have an eye on this case.
               * @see topic-invite-user.service.ts
               */
              if (topicInvite.user.isRegistered) {
                router.navigate(['/account/login'], {
                  queryParams: {
                    ...queryParams,
                    userId: topicInvite.user.id,
                  },
                });
              } else {
                router.navigate(['/account', 'signup'], {
                  queryParams: {
                    ...queryParams,
                    inviteId: topicInvite.id,
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
          TopicInviteUserService.get(routeParams).subscribe({
            next: (topicInvite) => {
              topicInvite.inviteId = this.inviteId;

              const joinTopicUrlForRedirect = Location.currentUrl();

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
                router.navigate(['/topics', topicInvite.topicId]);
              } else if (
                Auth.loggedIn$.value &&
                topicInvite.user.id === Auth.user.value.id &&
                hasDirectJoin
              ) {
                joinTopic(topicInvite);
              } else {
                router.navigate(['dashboard']);
                showJoinDialog(topicInvite, joinTopicUrlForRedirect);
              }
            },
            error: (err) => {
              router.navigate(['/']);
              setTimeout(() => {
                if (err.code === 41002 || err.status?.code === 41002) {
                  Notification.addError(
                    'MSG_ERROR_GET_API_USERS_TOPICS_INVITES_USERS_41002',
                    'MSG_ERROR_GET_API_USERS_TOPICS_INVITES_USERS_41002_HEADING'
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
