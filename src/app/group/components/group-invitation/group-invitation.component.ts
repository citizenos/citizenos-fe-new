import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, take } from 'rxjs';
import { RegisterComponent } from 'src/app/account/components/register/register.component';
import { AuthService } from 'src/app/services/auth.service';
import { ConfigService } from 'src/app/services/config.service';
import { LocationService } from 'src/app/services/location.service';
import { NotificationService } from 'src/app/services/notification.service';
import { GroupInviteUserService } from 'src/app/services/group-invite-user.service';
import { InviteData } from 'src/app/interfaces/dialogdata';

@Component({
  selector: 'app-group-invitation',
  templateUrl: './group-invitation.component.html',
  styleUrls: ['./group-invitation.component.scss']
})
export class GroupInvitationComponent implements OnInit {
  invite: any;
  config = <any>this.ConfigService.get('links');
  constructor(private ConfigService: ConfigService, private dialog: MatDialog, @Inject(MAT_DIALOG_DATA) private data: InviteData, private Auth: AuthService, private Location: LocationService, private router: Router) {
    this.invite = this.data.invite;
  }

  ngOnInit(): void {
  }

  doAccept() {
    // 3. The invited User is NOT logged in - https://github.com/citizenos/citizenos-fe/issues/112#issuecomment-541674320
    if (!this.Auth.loggedIn$.value) {
        const currentUrl = this.Location.currentUrl();
        if (!this.invite.user.isRegistered) {
            // The invited User is not registered, the User has been created by the system - https://github.com/citizenos/citizenos-fe/issues/773
            this.dialog.open(RegisterComponent,  {
              data: {
                userId: this.invite.user.id,
                redirectSuccess: currentUrl,
                email: this.invite.user.email
              }
            });
        } else {
          this.router.navigate(['/account/login'], {queryParams: {
            userId: this.invite.user.id,
            redirectSuccess: currentUrl,
            email: this.invite.user.email
          }});
            /*return $state.go('account/login', {
                userId: $scope.invite.user.id,
                redirectSuccess: currentUrl,
                email: $scope.invite.user.email // HACK: Hidden e-mail from the URL and tracking - https://github.com/citizenos/citizenos-fe/issues/657
            });*/
        }
    }

    // 2. User logged in, but opens an invite NOT meant to that account  - https://github.com/citizenos/citizenos-fe/issues/112#issuecomment-541674320
    if (this.Auth.loggedIn$.value && this.invite.user.id !== this.Auth.user.value.id) {
        this.Auth
            .logout()
            .pipe(take(1))
            .subscribe(() => {
              const currentUrl = this.Location.currentUrl();
              this.router.navigate(['/account/login'], {queryParams: {
                userId: this.invite.user.id,
                redirectSuccess: currentUrl,
                email: this.invite.user.email
              }});

            });
    }
};
}

@Component({
  selector: 'group-invitation-dialog',
  template: '',
})

export class GroupInvitationDialogComponent implements OnInit {
  inviteId: string = '';

  constructor(Auth: AuthService, dialog: MatDialog, GroupInviteUserService: GroupInviteUserService, route: ActivatedRoute, router: Router, Notification: NotificationService) {

    /*LOAD INVITE*/
    route.params.pipe(
      take(1),
      switchMap((params: any) => {
        this.inviteId = params['inviteId'];
        return GroupInviteUserService.get(params)
      })
    ).subscribe({
      next: (groupInvite: any) => {
        groupInvite.inviteId = this.inviteId;
        // 1. The invited User is logged in - https://github.com/citizenos/citizenos-fe/issues/112#issuecomment-541674320
        if (Auth.loggedIn$.value && groupInvite.user.id === Auth.user.value.id) {
          GroupInviteUserService
            .accept(groupInvite)
            .pipe(take(1))
            .subscribe({
              next: () => {
                router.navigate(['/my/groups', groupInvite.groupId])
              },
              error: (err) => {
                console.error('Invite error', err)
              }
            });
        } else {
          const invitationDialog = dialog.open(GroupInvitationComponent,
            {
              data: {
                invite: groupInvite
              }
            });
        }
      }
    })
  }

  ngOnInit(): void {
  }
}
