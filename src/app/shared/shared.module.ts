import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LinkyModule} from 'ngx-linky';

import { TopicboxComponent } from '../public-topics/components/topicbox/topicbox.component';
import { PublicgroupboxComponent } from '../public-groups/components/publicgroupbox/publicgroupbox.component';
import { GroupboxComponent } from '../my-groups/components/groupbox/groupbox.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

import { TranslateModule } from '@ngx-translate/core';
import { CosDropdownDirective } from '../directives/cos-dropdown.directive';

import { TypeaheadComponent, TypeaheadItem, TypeaheadSelect } from './components/typeahead/typeahead.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CosInitialsComponent } from './components/cos-initials/cos-initials.component';
import { MomentModule } from 'ngx-moment';
import { QRCodeModule } from 'angularx-qrcode';
import { CosPaginationComponent } from './components/cos-pagination/cos-pagination.component';
import { SocialshareDirective } from '../directives/socialshare.directive';
import { ActivityComponent } from './components/activity/activity.component';
import { CosToggleComponent } from './components/cos-toggle/cos-toggle.component';
import { TopicMemberUserComponent } from '../topic/components/topic-member-user/topic-member-user.component';
import { TopicMemberGroupComponent } from '../topic/components/topic-member-group/topic-member-group.component';
import { TopicMemberInviteComponent } from '../topic/components/topic-member-invite/topic-member-invite.component';
import { TopicMemberInviteDeleteComponent } from '../topic/components/topic-member-invite-delete/topic-member-invite-delete.component';
import { TopicVoteCastComponent } from '../topic/components/topic-vote-cast/topic-vote-cast.component';
import { BigGraphComponent } from '../topic/components/big-graph/big-graph.component';

import { GroupInviteComponent, GroupCreateInviteComponent, GroupInviteDialogComponent } from '../group/components/group-invite/group-invite.component';
import { GroupMemberUserComponent } from '../group/components/group-member-user/group-member-user.component';
import { GroupInviteUserComponent } from '../group/components/group-invite-user/group-invite-user.component';
import { GroupShareComponent } from '../group/components/group-share/group-share.component';
import { GroupAddTopicsComponent, GroupAddTopicsDialogComponent } from '../group/components/group-add-topics/group-add-topics.component';

import { MarkdownDirective } from '../directives/markdown.directive';
import { MarkdownPipe } from '@services/markdown.service';
import { MarkdownLinkDialogComponent } from '../directives/components/markdown-link-dialog/markdown-link-dialog.component';
import { CosEllipsisPipe } from './pipes/cos-ellipsis.pipe';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { CheckHeightDirective } from '../directives/check-height.directive';
import { EtherpadDirective } from '../directives/etherpad.directive';
import { CosInputComponent } from './components/cos-input/cos-input.component';
import { HtmlDirective } from '../directives/html.directive';
import { DownloadDirective } from '../directives/download.directive';
import { CosDisabledDirective } from '../directives/cos-disabled.directive';
import { DialogModule } from './dialog/dialog';
import { DragndropDirective } from '../directives/dragndrop.directive';
import { PageHeaderComponent } from '../core/components/page-header/page-header.component';
import { ActivitiesButtonComponent } from './components/activities-button/activities-button.component';
import { MobileFiltersDirective, MobileFilterDirective } from '../directives/mobile-filters.directive';
import { CosCalenderComponent } from './components/cos-calender/cos-calender.component';
import { TourComponent } from './components/tour/tour.component';
import { TourItemDirective, TourItemTemplateComponent } from '../directives/tour-item.directive';
import { InterruptDialogComponent } from './components/interrupt-dialog/interrupt-dialog.component';
import { TooltipComponent} from './components/tooltip/tooltip.component';
import { ImageEditorComponent } from './components/image-editor/image-editor.component';
import { SearchFilterComponent } from './components/search-filter/search-filter.component';
import { TopicVoteDeadlineComponent } from '../topic/components/topic-vote-deadline/topic-vote-deadline.component';

import { NotificationComponent } from '../core/components/notification/notification.component';
import { SiteNotificationComponent } from './components/site-notification/site-notification.component';

@NgModule({
  declarations: [
    ActivityComponent,
    BigGraphComponent,
    ConfirmDialogComponent,
    CosDropdownDirective,
    CosEllipsisPipe,
    SafeHtmlPipe,
    CosInitialsComponent,
    CosPaginationComponent,
    CosToggleComponent,
    EtherpadDirective,
    GroupInviteComponent,
    GroupCreateInviteComponent,
    GroupInviteDialogComponent,
    GroupMemberUserComponent,
    GroupInviteUserComponent,
    GroupShareComponent,
    GroupAddTopicsComponent,
    GroupAddTopicsDialogComponent,
    MarkdownDirective,
    MarkdownPipe,
    PublicgroupboxComponent,
    SocialshareDirective,
    TopicMemberInviteComponent,
    TopicMemberInviteDeleteComponent,
    TopicMemberUserComponent,
    TopicMemberGroupComponent,
    TopicVoteCastComponent,
    TopicboxComponent,
    TypeaheadComponent,
    TypeaheadItem,
    TypeaheadSelect,
    CheckHeightDirective,
    CosInputComponent,
    HtmlDirective,
    DownloadDirective,
    GroupboxComponent,
    CosDisabledDirective,
    DragndropDirective,
    PageHeaderComponent,
    ActivitiesButtonComponent,
    MobileFiltersDirective,
    MobileFilterDirective,
    CosCalenderComponent,
    TourComponent,
    TourItemDirective,
    TourItemTemplateComponent,
    InterruptDialogComponent,
    TooltipComponent,
    ImageEditorComponent,
    SearchFilterComponent,
    TopicVoteDeadlineComponent,
    NotificationComponent,
    MarkdownLinkDialogComponent,
    SiteNotificationComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MomentModule,
    QRCodeModule,
    TranslateModule,
    LinkyModule,
    DialogModule
  ],
   exports: [
    ActivityComponent,
    BigGraphComponent,
    ConfirmDialogComponent,
    CosDropdownDirective,
    CosEllipsisPipe,
    SafeHtmlPipe,
    CosInitialsComponent,
    CosPaginationComponent,
    CosToggleComponent,
    EtherpadDirective,
    GroupInviteComponent,
    GroupCreateInviteComponent,
    GroupInviteDialogComponent,
    GroupMemberUserComponent,
    GroupInviteUserComponent,
    GroupShareComponent,
    GroupAddTopicsComponent,
    GroupAddTopicsDialogComponent,
    MarkdownDirective,
    MarkdownPipe,
    MomentModule,
    PublicgroupboxComponent,
    QRCodeModule,
    SocialshareDirective,
    TopicboxComponent,
    TopicMemberInviteComponent,
    TopicMemberInviteDeleteComponent,
    TopicMemberUserComponent,
    TopicMemberGroupComponent,
    TopicVoteCastComponent,
    TypeaheadComponent,
    TypeaheadItem,
    TypeaheadSelect,
    CheckHeightDirective,
    CosInputComponent,
    HtmlDirective,
    DownloadDirective,
    GroupboxComponent,
    CosDisabledDirective,
    DragndropDirective,
    PageHeaderComponent,
    ActivitiesButtonComponent,
    MobileFiltersDirective,
    MobileFilterDirective,
    CosCalenderComponent,
    TourComponent,
    TourItemDirective,
    TourItemTemplateComponent,
    TooltipComponent,
    ImageEditorComponent,
    SearchFilterComponent,
    DialogModule,
    NotificationComponent,
    MarkdownLinkDialogComponent,
    SiteNotificationComponent
   ]
})
export class SharedModule { }
