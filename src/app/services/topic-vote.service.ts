import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from 'src/app/interfaces/apiResponse';
import { LocationService } from './location.service';
import { Observable, switchMap, map, of, tap, take, BehaviorSubject, exhaustMap, shareReplay } from 'rxjs';
import { Topic } from 'src/app/interfaces/topic'; // Vote interface
import { Vote } from 'src/app/interfaces/vote'; // Vote interface
import { AuthService } from './auth.service';
import { TopicService } from './topic.service';

@Injectable({
  providedIn: 'root'
})
export class TopicVoteService {

  VOTE_TYPES = {
    regular: 'regular',
    multiple: 'multiple'
  };

  VOTE_AUTH_TYPES = {
    soft: 'soft',
    hard: 'hard'
  };

  STATUSES = this.TopicService.STATUSES;

  private loadVote$ = new BehaviorSubject<void>(undefined);

  constructor(private Location: LocationService, private http: HttpClient, private Auth: AuthService, private TopicService: TopicService) { }

  loadVote(params?: { [key: string]: string | boolean }) {
    return this.loadVote$.pipe(
      exhaustMap(() => this.get(params)),
      shareReplay()
    );
  }

  reloadVote(): void {
    this.loadVote$.next();
  }

  query(params: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('topics/:topicId/votes'), params);

    return this.http.get<ApiResponse>(path, { withCredentials: true, params, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  get<Vote>(params?: any) {
    if (!params.voteId) params.voteId = params.id;
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/votes/:voteId'), params);

    return this.http.get<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  save(data: any) {
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/votes'), data)

    return this.http.post<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  update(data: any) {
    if (!data.voteId) data.voteId = data.id;
    const path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/votes/:voteId'), data);
    return this.http.put<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  delete(data: any) {
    if (!data.voteId) data.voteId = data.id;
    const path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/votes/:voteId'), data)

    return this.http.delete<ApiResponse>(path, { withCredentials: true, observe: 'body', responseType: 'json' }).pipe(
      map(res => res.data)
    );
  }

  cast(data: any) {
    if (!data.voteId) data.voteId = data.id;
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/votes/:voteId'), data);

    return this.http.post<any>(path, data, { withCredentials: true, observe: 'response', responseType: 'json' })
      .pipe(
        tap((res) => {
          if (res.status === 205) {
            window.location.reload();
          }
          return res;
        }),
        map((res) => {
          return res?.body?.data || res.body;
        })
      );
  }

  status(params: any) {
    if (!params.voteId) params.voteId = params.id;
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/votes/:voteId/status'), params)

    return this.http.get<ApiResponse>(path, { params: { token: params.token }, withCredentials: true, observe: 'body', responseType: 'json' });
  };

  sign(data: any) {
    if (!data.voteId) data.voteId = data.id;
    let path = this.Location.getAbsoluteUrlApi(this.Auth.resolveAuthorizedPath('/topics/:topicId/votes/:voteId/sign'), data);

    return this.http.post<ApiResponse>(path, data, { withCredentials: true, observe: 'body', responseType: 'json' })
      .pipe(
        map(res => res.data)
      );
  }

  getVoteCountTotal(vote: any) { // create Interface to Vote
    let voteCountTotal = 0;
    if (vote.options) {
      const options = vote.options.rows;
      for (let i in options) {
        const voteCount = options[i].voteCount;
        if (voteCount) {
          voteCountTotal += voteCount;
        }
      }
    }
    return voteCountTotal;
  };

  hasVoteEnded(topic: Topic, vote: Vote) {
    if ([this.STATUSES.followUp, this.STATUSES.closed].indexOf(topic.status) > -1) {
      return true;
    }
    return vote && vote.endsAt && new Date() > new Date(vote.endsAt);
  };

  hasVoteEndedExpired(topic: Topic, vote: Vote) {
    return [this.STATUSES.followUp, this.STATUSES.closed].indexOf(topic.status) > -1 || vote.endsAt && (new Date() > new Date(vote.endsAt));
  };

  canVote(topic: Topic) {
    return topic.vote && ((topic.permission.level !== 'none' || (topic.visibility === this.TopicService.VISIBILITY.public)) && topic.status === this.STATUSES.voting);
  };

  canDelegate(topic: Topic) {
    return (this.canVote(topic) && topic.vote?.delegationIsAllowed === true);
  };
}
