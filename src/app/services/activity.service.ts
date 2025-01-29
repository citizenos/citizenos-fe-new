import { Injectable, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { BehaviorSubject, exhaustMap, map, shareReplay, switchMap, tap, take, combineLatest, Subject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import * as jsonpatch from 'fast-json-patch';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer } from '@angular/platform-browser';

import { ItemsListService } from './items-list.service';
import { LocationService } from './location.service';
import { AuthService } from './auth.service';
import { AppService } from '@services/app.service';
import { TopicService } from '@services/topic.service';
import { DialogService } from 'src/app/shared/dialog';
import { BlockNavigationIfChange } from 'src/app/shared/pending-changes.guard';
import { NotificationService } from '@services/notification.service';
import { UploadService } from '@services/upload.service';
import { GroupService } from '@services/group.service';
import { GroupMemberTopicService } from '@services/group-member-topic.service';
import { TopicInviteUserService } from '@services/topic-invite-user.service';
import { TopicMemberUserService } from '@services/topic-member-user.service';
import { TopicAttachmentService } from '@services/topic-attachment.service';
import { TopicMemberGroupService } from '@services/topic-member-group.service';
import { TopicDiscussionService } from '@services/topic-discussion.service';

@Injectable({
  providedIn: 'root'
})
export class ActivityService extends ItemsListService {
  params = {
    offset: <number>0,
    limit: <number>10,
    include: <string | null>null,
    filter: <string | null>null,
    groupId: <string|undefined> undefined,
    topicId: <string|undefined> undefined
  };
  public filters = ['all', 'userTopics', 'userGroups', 'user', 'self'];
  params$ = new BehaviorSubject(Object.assign({}, this.params));
  private loadUnread$ = new BehaviorSubject<void>(undefined);
  lastViewTime = <string | null>null;
  constructor(public Location: LocationService, public Auth: AuthService, public http: HttpClient, public $translate: TranslateService, public router: Router) {
    super();
    this.items$ = this.loadItems();
  }

  loadUnreadItems(params?: { [key: string]: any }) {
    return this.loadUnread$.pipe(
      exhaustMap(() => this.getUnreadActivities(params)),
      shareReplay()
    );
  };

  reloadUnreadItems(): void {
    this.loadUnread$.next();
  }

  getItems(params: any) {
    return this.query(params);
  }

  success = (res: any) => {
    const data = res.data;
    const parsedResult = <any[]>[];
    data.forEach((activity: any, key: number) => {
      if (activity.data) {
        if (activity.data.type === 'Create' &&
          !activity.data.target &&
          activity.data.object &&
          (activity.data.object['@type'] === 'Vote' || Array.isArray(activity.data.object)
            && activity.data.object[0]['@type'] === 'VoteOption')
        ) {
          data.splice(key, 1);
        } else if (activity.data.type === 'Update' && Array.isArray(activity.data.result)) {
          let i = 0;
          const resultItems = <any>[];
          if (activity.data.origin['@type'] === 'Topic') {
            activity.data.origin.description = null;
          }
          const resultObject = Object.assign({}, activity.data.origin);
          activity.data.resultObject = jsonpatch.applyPatch(resultObject, activity.data.result).newDocument;
          activity.data.result.forEach((item: any) => {
            const field = item.path.split('/')[1];
            if (['deletedById', 'deletedByReportId', 'edits'].indexOf(field) > -1) {
              item = null;
            } else {
              const change = resultItems.find((resItem: any) => {
                return resItem.path.indexOf(field) > -1;
              });

              if (!change) {
                resultItems.push(item);
              } else if (item.value) {
                if (!Array.isArray(change.value)) {
                  change.value = [change.value];
                }
                change.value.push(item.value);
              }
            }
          });
          activity.data.result = resultItems;
          while (i < activity.data.result.length) {
            let act = Object.assign({}, activity);
            const change = activity.data.result[i];
            act.data.result = [change];
            if (act.data.target) {
              act.id = act.id + '_' + change.path; //this is to avoid weird grouping of update activities with multiple fields
            }
            act.id = act.id + '_' + change.path;
            this.buildActivityString(act);
            act = this.getActivityValues(act);
            parsedResult.push(act);
            i++;
          }
        } else {
          this.buildActivityString(activity);
          activity = this.getActivityValues(activity);
          parsedResult.push(activity)
        }
      } else {
        console.error('Activity data missing');
      }
    });
    const dataRows = this.activitiesToGroups(parsedResult);
    dataRows.forEach((activityGroups: any, groupKey: any) => {
      activityGroups.isNew = '';
      Object.keys(activityGroups.values).forEach((key) => {
        const activity = activityGroups.values[key];
        activity.isNew = '';
        if (activity.data.type === 'View' && activity.data.object && activity.data.object['@type'] === 'Activity') {
          if (!this.lastViewTime || activity.updatedAt > this.lastViewTime) {
            this.lastViewTime = activity.updatedAt;
          }
          dataRows.splice(groupKey, 1);
        } else if (!this.lastViewTime || activity.updatedAt > this.lastViewTime) {
          activity.isNew = '-new';
        }
      });
    });
    return { rows: dataRows };
  };

  query(params: any) {
    let rootPath = '';
    if (params.groupId) {
      rootPath += '/groups/:groupId'
    } else if (params.topicId) {
      rootPath += '/topics/:topicId'
    }
    let path = this.Location.getAbsoluteUrlApi(
      this.Auth.resolveAuthorizedPath(
        `${rootPath}/activities`
      ), params);

    return this.http.get(path, { params, withCredentials: true, responseType: 'json', observe: 'body' })
      .pipe(
        map(this.success)
      );
  };

  getUnreadActivities(params?: any) {
    let path = ''
    if (params && params.groupId) {
      path += this.Location.getAbsoluteUrlApi(
        this.Auth.resolveAuthorizedPath(
          '/groups/:groupId/activities/unread'
        ), params);
    }
    else if (params && params.topicId) {
      path += this.Location.getAbsoluteUrlApi(
        this.Auth.resolveAuthorizedPath(
          '/topics/:topicId/activities/unread'
        ), params);
    } else {
      path = this.Location.getAbsoluteUrlApi(`/api/users/self/activities/unread`, params);
    }
    return this.http.get(path, { withCredentials: true, responseType: 'json', observe: 'body' })
      .pipe(
        map((res: any) => {
          const data = res.data;
          return data.count;
        }));
  };

  buildActivityString = (activity: any) => {
    const stringparts = ['ACTIVITY'];
    const activityDataKeys = Object.keys(activity.data);
    // Object.entries<any>(this.activity.data).forEach(([key, value]) => {
    ['actor', 'type', 'object', 'origin', 'target', 'inReplyTo'].forEach((key) => {
      if (activityDataKeys.indexOf(key) === -1) return;
      const value = activity.data[key];
      switch (key) {
        case 'actor':
          stringparts.push(value.type);
          break;
        case 'type':
          stringparts.push(value);
          break;
        case 'target':
          stringparts.push(value['@type']);
          break;
        case 'inReplyTo':
          stringparts.push('IN_REPLY_TO');
          stringparts.push(value['@type']);
          break
        case 'object':
          if (Array.isArray(value)) {
            stringparts.push(value[0]['@type']);
          } else {
            stringparts.push(value['@type'] || value.type);
          }

          if (value.object) { // Originally created to support Accept activity - https://www.w3.org/TR/activitystreams-vocabulary/#dfn-accept
            stringparts.push(value.object['@type']);
          }
          break;
        case 'origin':
          if (stringparts.indexOf(value['@type']) > -1) { break; }
          if (Array.isArray(value)) {
            stringparts.push(value[0]['@type']);
          } else {
            stringparts.push(value['@type']);
          }
          if (activity.data.object && activity.data.object['@type'] && activity.data.result && activity.data.result[0].path.indexOf('level') > -1 && activity.data.result[0].value === 'none') {
            stringparts.push('none');
          }
          break;
      }
    });

    if (activity.data.object && activity.data.object['@type'] && activity.data.object['@type'] === 'CommentVote' && activity.data.type !== 'Delete') {
      let val = 'up';
      if ((activity.data.resultObject && activity.data.resultObject.value === -1) || (!activity.data.resultObject && activity.data.object.value === -1)) {
        val = 'down';
      }
      if (activity.data.resultObject && activity.data.resultObject.value === 0) {
        val = 'remove';
      }
      stringparts.push(val);
    }
    activity.string = 'ACTIVITY_FEED.' + stringparts.join('_').toUpperCase();
  }
  getActivityValues(activity: any) {
    const values: any = {};

    if (activity.data.object) {
      this.getActivityUsers(activity, values);
      values['topicTitle'] = this.getActivityTopicTitle(activity) || "";
      values['className'] = this.getActivityClassName(activity);
      values['description'] = this.getActivityDescription(activity);
      values['groupName'] = this.getActivityGroupName(activity);
      values['attachmentName'] = this.getActivityAttachmentName(activity);
      values['connectionName'] = this.getAactivityUserConnectionName(activity);
      this.getActivityUserLevel(activity, values);

      let dataobject = activity.data.object;
      if (Array.isArray(dataobject)) {
        dataobject = dataobject[0];
      }

      if (dataobject['@type'] === 'CommentVote' && activity.data.type === 'Create') {
        const str = 'ACTIVITY_FEED.ACTIVITY_COMMENTVOTE_FIELD_VALUE_';
        let val = 'UP';
        if (dataobject.value === -1) {
          val = 'DOWN';
        } else if (dataobject.value === 0) {
          val = 'REMOVE';
        }
        values['reaction'] = this.$translate.instant(str + val);
      }
    }
    activity.values = values;
    if (activity.data.type === 'Update') {
      this.getUpdatedTranslations(activity);
    }

    return activity;
  };

  getActivityTopicTitle = (activity: any) => {
    const dataobject = this.getActivityObject(activity);
    if (['Topic', 'VoteFinalContainer'].indexOf(dataobject['@type']) > -1) {
      return dataobject.title;
    } else if (dataobject.topicTitle) {
      return dataobject.topicTitle;
    } else if (activity.data.target && activity.data.target.title) {
      return activity.data.target.title;
    } else if (activity.data.target && activity.data.target.topicTitle) {
      return activity.data.target.topicTitle;
    } else if (activity.data.origin && activity.data.origin.title) {
      return activity.data.origin.title;
    } else if (activity.data.origin && activity.data.origin.topicTitle) {
      return activity.data.origin.topicTitle;
    }
  };

  getActivityClassName = (activity: any) => {
    const dataobject = this.getActivityObject(activity);
    const { type } = activity.data;
    const actorType = activity.data.actor?.type;
    const objectType = activity.data.object?.['@type'];
    const targetType = activity.data.target?.['@type'];

    return type === 'Accept' || type === 'Invite' || (type === 'Add' && actorType === 'User' && objectType === 'User' && targetType === 'Group') ? 'invite' :
           ['Topic', 'TopicMemberUser', 'Attachment', 'TopicFavourite'].includes(dataobject['@type']) || targetType === 'Topic' ? 'discussion' :
           ['Group'].includes(dataobject['@type']) || dataobject.groupName ? 'group' :
           ['Vote', 'VoteList', 'VoteUserContainer', 'VoteFinalContainer', 'VoteOption', 'VoteDelegation'].includes(dataobject['@type']) ? 'vote' :
           ['Comment', 'CommentVote'].includes(dataobject['@type']) ? 'comment' :
           ['User', 'UserConnection'].includes(dataobject['@type']) || dataobject.text ? 'personal' :
           'topic';
  };

  getActivityDescription = (activity: any) => {
    const dataobject = this.getActivityObject(activity);
    return dataobject['@type'] === 'Comment' || dataobject.text ? dataobject.text :
           activity.data.target?.['@type'] === 'Comment' ? activity.data.target.text :
           undefined;
  };

  getActivityGroupName = (activity: any) => {
    const dataobject = this.getActivityObject(activity);
    const target = activity.data.target;
    const origin = activity.data.origin;

    return dataobject['@type'] === 'Group' ? dataobject.name :
           dataobject.groupName ? dataobject.groupName :
           target?.['@type'] === 'Group' ? target.name :
           target?.groupName ? target.groupName :
           origin?.['@type'] === 'Group' ? origin.name :
           origin?.groupName ? origin.groupName :
           undefined;
  };

  getActivityAttachmentName = (activity: any) => {
    let dataobject = activity.data.object;
    if (Array.isArray(dataobject)) {
      dataobject = dataobject[0];
    }

    if (dataobject['@type'] === 'Attachment' || dataobject.name) {
      return dataobject.name;
    }
  };

  getAactivityUserConnectionName = (activity: any) => {
    let dataobject = activity.data.object;

    if (Array.isArray(dataobject)) {
      dataobject = dataobject[0];
    }

    if (dataobject['@type'] === 'UserConnection') {
      const key = 'ACTIVITY_FEED.ACTIVITY_USERCONNECTION_CONNECTION_NAME_:connectionId'
        .replace(':connectionId', dataobject.connectionId)
        .toUpperCase();
      const translation = this.$translate.instant(key);

      if (!translation || translation === key) { // No translation found
        return dataobject.connectionId.charAt(0).toUpperCase() + dataobject.connectionId.slice(1)
      } else {
        return translation;
      }
    }
  };

  getActivityUsers = (activity: any, values: any) => {
    let dataobject = activity.data.object;
    if (Array.isArray(dataobject)) {
      dataobject = dataobject[0];
    }
    if (activity.data.actor && activity.data.actor.name) {
      values.userName = activity.data.actor.name;
    }
    if (dataobject['@type'] === 'User') {
      values.userName2 = dataobject.name;
    } else if (dataobject.userName) {
      values.userName2 = dataobject.userName;
    } else if (activity.data.target && activity.data.target['@type'] === 'User') {
      values.userName2 = activity.data.target.name;
    } else if (activity.data.target && activity.data.target.userName) {
      values.userName2 = activity.data.target.userName;
    } else if (activity.data.actor && activity.data.actor.type==='Moderator') {
      values.userName = '';
    }
  };

  getActivityUserLevel = (activity: any, values: any) => {
    const levelKeyPrefix = 'ACTIVITY_FEED.ACTIVITY_TOPIC_LEVELS_';
    let levelKey;

    if (activity.data.actor && activity.data.actor.level) {
      levelKey = levelKeyPrefix + activity.data.actor.level;
    } else if (activity.data.target && activity.data.target.level) { // Invite to Topic has target User - https://github.com/citizenos/citizenos-fe/issues/112
      levelKey = levelKeyPrefix + activity.data.target.level;
    }

    if (levelKey && levelKey !== levelKeyPrefix) {
      values.accessLevel = this.$translate.instant(levelKey.toUpperCase());
    }
  };

  getActivityObject = (activity: any) => {
    let dataobject = activity.data.object && activity.data.object.object ? activity.data.object.object : activity.data.object;
    if (Array.isArray(dataobject)) {
      dataobject = dataobject[0];
    }
    return dataobject;
  }

  getCategoryTranslationKeys = (catInput: any) => {
    if (Array.isArray(catInput)) {
      const translationKeys: any = [];
      catInput.forEach((category) => {
        translationKeys.push('TXT_TOPIC_CATEGORY_' + category.toUpperCase());
      });

      return translationKeys;
    }

    return 'TXT_TOPIC_CATEGORY_' + catInput.toUpperCase();
  };
  getUpdatedTranslations(activity: any) {
    const fieldName = activity.data.result[0].path.split('/')[1];
    activity.values.fieldName = fieldName;
    let previousValue = activity.data.origin[fieldName];
    let newValue = activity.data.resultObject[fieldName];
    let previousValueKey = null;
    let newValueKey = null;
    let fieldNameKey = null;
    const originType = activity.data.origin['@type'];
    if (originType === 'Topic' || originType === 'Comment' || originType === 'Group' || originType === 'Idea') {
      fieldNameKey = 'ACTIVITY_FEED.ACTIVITY_' + originType.toUpperCase() + '_FIELD_' + fieldName.toUpperCase();
    }

    if (Array.isArray(previousValue) && previousValue.length === 0) {
      previousValue = '';
    }

    if (previousValue || newValue) {
      if (originType === 'Topic') {
        if (fieldName === 'status' || fieldName === 'visibility') {
          if (previousValue) {
            previousValueKey = 'ACTIVITY_FEED.ACTIVITY_TOPIC_FIELD_' + fieldName.toUpperCase() + '_' + previousValue.toUpperCase();
          }
          if (newValue) {
            newValueKey = 'ACTIVITY_FEED.ACTIVITY_TOPIC_FIELD_' + fieldName.toUpperCase() + '_' + newValue.toUpperCase();
          }
        }
        if (fieldName === 'categories') {
          if (previousValue) {
            previousValueKey = this.getCategoryTranslationKeys(previousValue);
          }
          if (newValue) {
            newValueKey = this.getCategoryTranslationKeys(newValue);
          }
        }
      }

      if (originType === 'CommentVote') {
        const handleValue = (value: any) => {
          if (value === 1) {
            value = 'up';
          } else if (value === -1) {
            value = 'down';
          } else if (value === 0) {
            value = 'remove';
          }
          return value;
        }
        if (fieldName === 'value') {
          if (previousValue === 0 || previousValue) {
            previousValue = handleValue(previousValue);
            previousValueKey = 'ACTIVITY_FEED.ACTIVITY_COMMENTVOTE_FIELD_VALUE_' + previousValue.toUpperCase();
          }
          if (newValue === 0 || previousValue) {
            newValue = handleValue(newValue);
            newValueKey = 'ACTIVITY_FEED.ACTIVITY_COMMENTVOTE_FIELD_VALUE_' + newValue.toUpperCase();
          }
        }
      }

      if (originType === 'Comment' || originType === 'Idea') {
        if (fieldName === 'deletedReasonType') {
          newValueKey = 'ACTIVITY_FEED.ACTIVITY_COMMENT_FIELD_DELETEDREASONTYPE_' + newValue.toUpperCase();
        }
        if (fieldName === 'type') {
          newValueKey = 'ACTIVITY_FEED.ACTIVITY_COMMENT_FIELD_VALUE_' + newValue.toUpperCase();
        }
      }
      if (fieldName === 'deletedReasonType') console.log('ORIGIN', originType, newValueKey)
    }
    if (previousValueKey) {
      const prev = this.$translate.instant(previousValueKey);
      activity.values.previousValue = prev;
      if (typeof prev === 'object') {
        activity.values.previousValue = Object.values(prev).join(';');
      }
    } else {
      activity.values.previousValue = previousValue;
    }
    if (fieldNameKey) {
      const translatedField = this.$translate.instant(fieldNameKey);
      activity.values.fieldName = translatedField;
    }
    if (newValueKey) {
      let newVal = this.$translate.instant(newValueKey);
      if (typeof newVal === 'object') {
        newVal = Object.values(newVal).join(';');
      }
      activity.values.newValue = newVal;
    } else {
      activity.values.newValue = newValue;
    }

  };

  activitiesToGroups = (activities: any) => {
    const userActivityGroups: any = {};
    const activityGroups: any = {};
    const grouped: any = {};
    const returnActivities: any = [];

    const addToGroup = (key: any, value: any) => {
      if (!grouped[key]) {
        grouped[key] = [value];
      } else {
        grouped[key].push(value);
      }
    }
    for (let i = 0; i < activities.length; i++) {
      const objectId = activities[i].data.object.id || activities[i].data.object.topicId || activities[i].data.object.groupId;

      if (activities[i].data.target) {
        const targetId = activities[i].data.target.id;
        addToGroup(activities[i].string + '_ACTIVITYGROUP:' + targetId, activities[i].id);
        addToGroup(activities[i].string + '_USERACTIVITYGROUP:' + targetId + '_' + activities[i].data.actor.id, activities[i].id);
      }

      const groupKey = activities[i].string + '_' + objectId;
      const userGroupKey = groupKey + '_' + activities[i].data.actor.id;

      addToGroup(activities[i].string + '_ACTIVITYGROUP:' + objectId, activities[i].id);
      addToGroup(activities[i].string + '_USERACTIVITYGROUP:' + objectId + '_' + activities[i].data.actor.id, activities[i].id);
      //Create group with id-s

      if (!activityGroups[groupKey]) {
        activityGroups[groupKey] = new Array(activities[i]);
      } else {
        activityGroups[groupKey].push(activities[i]);
      }

      //Create group with same actor
      if (!userActivityGroups[userGroupKey]) {
        userActivityGroups[userGroupKey] = new Array(activities[i]);
      } else {
        userActivityGroups[userGroupKey].push(activities[i]);
      }
    }
    // Filter out the final activities
    const final: any = {};
    activities.forEach((activity: any) => {
      final[activity.id] = [activity];
      /*COMMENTED OUT AS WE DON'T GROUP ACTIVITIES IN THE NEW FEED*/
      /*let groupKey: any;
      Object.keys(grouped).forEach((key) => {
        if (grouped[key].length > 1 && grouped[key].indexOf(activity.id) > -1) {
          groupKey = key;
        }
      });

      if (groupKey) {
        if (!final[groupKey]) {
          final[groupKey] = [activity];
        } else {
          final[groupKey].push(activity);
          final[groupKey].sort((a: any, b: any) => {
            if (!a || !b) return 0;
            const keyA = new Date(a.updatedAt),
              keyB = new Date(b.updatedAt);
            // Compare the 2 dates
            if (keyA < keyB) return 1;
            if (keyA > keyB) return -1;
            return 0;
          });
        }
        final[groupKey].sort((a: any, b: any) => {
          if (a['updatedAt'] < b['updatedAt']) return -1;
          else if (a['updatedAt'] > b['updatedAt']) return 1;
          return 0;
        });
      } else {
        final[activity.id] = [activity];
      }*/
    });
    Object.keys(final).forEach((key) => {
      returnActivities.push({ referer: key, values: final[key] });
    });
    returnActivities.sort((a: any, b: any) => {
      if (a['updatedAt'] < b['updatedAt']) return -1;
      else if (a['updatedAt'] > b['updatedAt']) return 1;
      return 0;
    });
    return returnActivities
  };

  showActivityUpdateVersions(activity: any) {
    if (activity.data.type === 'Update') {
      if (activity.data.result && (Array.isArray(activity.data.object) && activity.data.object[0]['@type'] === 'Topic' && activity.data.result[0].path.indexOf('description') > -1 || !Array.isArray(activity.data.object) && activity.data.object['@type'] === 'Topic' && activity.data.result[0].path.indexOf('description') > -1)) {
        return false;
      }
      if (activity.data.object['@type'] === 'UserNotificationSettings' && activity.data.type === 'Update') {
        return false;
      }

      if (activity.data.object['@type'] === 'CommentVote' && activity.data.type === 'Update' && activity.data.resultObject && activity.data.resultObject.value === 0) {
        return false;
      }

      if (activity.data.result && !Array.isArray(activity.data.object) && activity.data.object['@type'] === 'TopicMemberUser' && activity.data.result[0].path.indexOf('level') > -1 && activity.data.result[0].value === 'none') {
        return false;
      }

      return true;
    }
    return false;
  };

  showActivityDescription(activity: any) {
    if (activity.data && activity.data.object && (Array.isArray(activity.data.object) && activity.data.object[0]['@type'] === 'Comment' || activity.data.object['@type'] === 'Comment' || activity.data.object.text)) {
      return true;
    }

    if (activity.data && activity.data.target && activity.data.target['@type'] === 'Comment') {
      return true;
    }

    return false;
  };

  handleActivityRedirect(activity: any) {
    if (!activity.data) {
      return;
    }

    const activityType = activity.data.type;
    let state = [this.$translate.currentLang];
    let params = <any>{};
    let hash = '';
    const object = this.getActivityObject(activity);
    const target = activity.data.target;
    const origin = activity.data.origin;

    if (activityType === 'Invite' && target['@type'] === 'User' && object['@type'] === 'Topic') { // https://github.com/citizenos/citizenos-fe/issues/112
      // The invited user is viewing
      if (this.Auth.loggedIn$.value && this.Auth.user.value.id === target.id) {
        state = state.concat(['topics', object.id, 'invites', 'users', target.inviteId]);
      } else {
        // Creator of the invite or a person who has read permissions is viewing
        state = state.concat(['topics', object.id]);
      }
    } else if (activityType === 'Invite' && target['@type'] === 'User' && object['@type'] === 'Group') { // https://github.com/citizenos/citizenos-fe/issues/348
      // The invited user is viewing
      if (this.Auth.loggedIn$.value && this.Auth.user.value.id === target.id) {
        state = state.concat(['groups', object.id, 'invites', 'users', target.inviteId]);
      } else {
        // Creator of the invite or a person who has read permissions is viewing
        state = state.concat(['groups', object.id]);
      }
    } else if ((object && object['@type'] === 'Topic')) {
      state = state.concat(['topics', object.id]);
    } else if ((object && object['@type'] === 'TopicMemberUser')) {
      state = state.concat(['topics', object.topicId]);
    } else if (object['@type'] === 'Comment' || object['@type'] === 'CommentVote') {
      if (target && (target['@type'] === 'Topic' || object.topicId || target.topicId)) {
        state = state.concat(['topics', object.topicId || target.topicId || target.id]);
        params = { queryParams: { 'commentId': object.commentId || object.id } };
        // hash = object.commentId || object.id;
      }
    } else if (object['@type'] === 'Vote' || object['@type'] === 'VoteList' && target && target['@type'] === 'Topic') {
      state = state.concat(['topics', target.topicId || target.id, 'votes', object.voteId || object.id]);
    } else if (object['@type'] === 'Group' || object['@type'] === 'TopicMemberGroup') {
      state = state.concat(['groups', object.id || object.groupId])
    } else if (object['@type'] === 'Vote' || object['@type'] === 'VoteFinalContainer') {
      state = state.concat(['topics', object.topicId || object.id, 'votes', object.voteId || object.id]);
    } else if (target && (target['@type'] === 'Topic' || target.topicId)) {
      state = state.concat(['topics', target.topicId || target.id]);
    }

    if (target && target['@type'] === 'Group' && activityType !== 'Invite') {
      state = [this.$translate.currentLang, 'groups', target.id];
    }

    if (state[1] !== 'topics' && origin && origin['@type'] === 'Topic' && activityType !== 'Invite') {
      state = state.concat(['topics', origin.id]);
    }

    /**
     * @note Assume that the first item is always present and is lang param.
     * No action needed in this case.
     * 
     * @fix https://github.com/citizenos/citizenos-fe/issues/1737
     */
    if (state.length > 1) {
      if (hash) {
        params.fragment = hash;
      }
      if (state.length > 3 && activityType !== 'Invite') {
        state = state.slice(0, 3);
      }
      this.router.navigate(state, params);
    }
  }
}
