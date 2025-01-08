import { Component, OnInit, Input } from '@angular/core';
import { DialogService } from 'src/app/shared/dialog';
import { take } from 'rxjs';
import { Group } from 'src/app/interfaces/group';
import { AuthService } from '@services/auth.service';
import { GroupJoinService } from '@services/group-join.service';
import { GroupMemberUserService } from '@services/group-member-user.service';
import { GroupService } from '@services/group.service';
import { LocationService } from '@services/location.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'group-share',
  templateUrl: './group-share.component.html',
  styleUrls: ['./group-share.component.scss']
})
export class GroupShareComponent implements OnInit {
  @Input() group!: Group;

  join = {
    level: <string | null>this.GroupMemberUser.LEVELS[0],
    token: <string | null>null
  };

  joinUrl = <string | null>'';
  LEVELS = this.GroupMemberUser.LEVELS;
  showQR = false;
  copySuccess = false;
  constructor(
    private Auth: AuthService,
    private dialog: DialogService,
    private GroupService: GroupService,
    private GroupMemberUser: GroupMemberUserService,
    private GroupJoin: GroupJoinService,
    private Location: LocationService,
  ) {
  }

  ngOnInit(): void {
    this.join.token = this.group.join?.token;
    this.join.level = this.group.join?.level || this.GroupMemberUser.LEVELS[0];
    this.generateJoinUrl();
  }

  canUpdate() {
    return this.GroupService.canUpdate(this.group);
  }

  generateTokenJoin() {
    const generateTokenDialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'MODALS.GROUP_INVITE_SHARE_LINK_GENERATE_CONFIRM_TXT_ARE_YOU_SURE',
        heading: 'MODALS.GROUP_INVITE_SHARE_LINK_GENERATE_CONFIRM_HEADING',
        closeBtn: 'MODALS.GROUP_INVITE_SHARE_LINK_GENERATE_CONFIRM_BTN_NO',
        confirmBtn: 'MODALS.GROUP_INVITE_SHARE_LINK_GENERATE_CONFIRM_BTN_YES',
        points: ['MODALS.GROUP_INVITE_SHARE_LINK_GENERATE_CONFIRM_TXT_POINT1', 'MODALS.GROUP_INVITE_SHARE_LINK_GENERATE_CONFIRM_TXT_POINT2']
      }
    });
    generateTokenDialog.afterClosed().pipe(take(1)).subscribe(result => {
      if (result === true) {
        this.GroupJoin
          .save({
            groupId: this.group.id,
            userId: this.Auth.user.value.id,
            level: this.join.level
          }).pipe(take(1)).subscribe(res => {
            this.group.join = res;
            this.join.token = res.token;
            this.join.level = res.level;
            this.generateJoinUrl();
          })
      }
    });
  };

  doUpdateJoinToken(level: string) {
    const groupJoin = {
      groupId: this.group.id,
      userId: this.Auth.user.value.id,
      level: level,
      token: this.join.token
    };

    this.GroupJoin.update(groupJoin).pipe(take(1)).subscribe(() => {
      this.join.level = level;
      this.GroupService.reload();
    })
  };

  copyInviteLink() {
    if (this.joinUrl) {

      try {
        const urlInputElement = document.getElementById('invite_group_url_input') as HTMLInputElement || null;
        urlInputElement.focus();
        urlInputElement.select();
        urlInputElement.setSelectionRange(0, 99999);
        document.execCommand('copy');
        this.copySuccess = true;
      } catch (err) {
        console.error('Input copying error, trying Clipboard')
        try {
          navigator.clipboard.writeText(this.joinUrl);
        } catch (err) {
          console.error('Clipoard copying error')
        }
      }

    }
  };

  generateJoinUrl() {
    if (this.join.token && this.GroupService.canShare(this.group)) {
      this.joinUrl = this.Location.getAbsoluteUrl('/groups/join/' + this.join.token);
    } else {
      this.joinUrl = this.Location.getAbsoluteUrl('/groups/' + this.group.id + '/join');
    }
  };

  canShare() {
    return this.GroupService.canShare(this.group);
  }
}
