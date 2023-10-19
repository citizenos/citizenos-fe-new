import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, switchMap, take } from 'rxjs';
import { GroupJoinService } from 'src/app/services/group-join.service';
import { LocationService } from 'src/app/services/location.service';
import { Group } from 'src/app/interfaces/group';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-group-join',
  templateUrl: './group-join.component.html',
  styleUrls: ['./group-join.component.scss']
})
export class GroupJoinComponent implements OnInit {
  group: Group;
  constructor(private router: Router, @Inject(MAT_DIALOG_DATA) data: any, private Location: LocationService, private GroupJoinService: GroupJoinService) {
    this.group = data.group;
  }

  ngOnInit(): void {
  }

}

@Component({
  selector: 'app-group-join',
  template: ''
})
export class GroupTokenJoinComponent {
  token: string = '';
  constructor(router: Router, dialog: MatDialog, route: ActivatedRoute, Location: LocationService, GroupJoinService: GroupJoinService) {
    route.params.pipe(
      switchMap((params: any) => {
        this.token = params['token'];
        return GroupJoinService.get(params['token'])
      }),take(1))
      .subscribe({
        next: (group) => {
          const joinDialog = dialog.open(GroupJoinComponent, {
            data: {
              group: group,
              token: this.token
            }
          });

          joinDialog.afterClosed().subscribe((confirm) => {
            if (confirm === true) {
              GroupJoinService.join(this.token).pipe(
                take(1)
              ).subscribe({
                next: (group) => {
                  router.navigate(['/my/groups', group.id]);
                },
                error: (res) => {
                  const status = res.status;
                  if (status.code === 40100) { // Unauthorized
                    const currentUrl = Location.currentUrl();
                    router.navigate(['/account/login'], { queryParams: { redirectSuccess: currentUrl } });
                  } else if (status.code === 40001) { // Matching token not found.
                    router.navigate(['/']);
                  } else {
                    router.navigate(['/404']);
                  }
                }
              })
            }
          });
        },
        error: (err) => {
          console.error("Group join error", err);
        }
      });
  }
}