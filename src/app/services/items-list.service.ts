import { Injectable } from '@angular/core';
import { BehaviorSubject, shareReplay, switchMap, map, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export abstract class ItemsListService {
  defaultParams = {
    page: <number>1,
    offset: <number>0,
    limit: <number>10,
    order: <string | null | undefined>null,
    orderBy: <string | null | undefined>null,
    sourcePartnerId: <string | null | undefined>null,
    search: <string | null | undefined>null
  };
  abstract params?: any;
  items$ = this.loadItems();
  hasMore$ = new BehaviorSubject(false);
  countTotal$ = new BehaviorSubject(0);
  totalPages$ = new BehaviorSubject(1);
  page$ = new BehaviorSubject(1);
  reload$ = new BehaviorSubject<void>(undefined);
  abstract params$: BehaviorSubject<any>;
  constructor() {
  }

  reload () {
    this.reload$.next();
  }

  doOrder(orderBy: string, order?: string) {
    order = order || 'asc';
    this.page$.next(1);
    const orderparams = this.params$.value;
    orderparams.orderBy = orderBy;
    if (order) {
      orderparams.order = order.toUpperCase();
    }
    this.params$.next(orderparams);
  };

  reset() {
    this.page$.next(1);
    this.params$.next(Object.assign({}, this.params || this.defaultParams));
  }

  loadPage(page: number) {
    this.page$.next(page);
  };

  loadMore() {
    if (this.hasMore$.value === true) {
      const page = this.page$.value;
      this.loadPage(page + 1);
    }
  }

  loadItems() {
    return combineLatest([this.page$, this.params$]).pipe(
      shareReplay(),
      switchMap(([page, paramsValue]) => {
        paramsValue.offset = (page - 1) * paramsValue.limit;
        return this.getItems(paramsValue);
      }),
      map((res: any) => {
        this.countTotal$.next(res.countTotal || res.count || 0);
        this.totalPages$.next(Math.ceil(this.countTotal$.value / this.params$.value.limit));
        this.hasMore$.next(true);
        if (this.totalPages$.value === 0 || this.totalPages$.value === this.page$.value) {
          this.hasMore$.next(false);
        }
        return Array.from<any>(res.rows);
      })
    );
  }

  abstract getItems(params?: any): any;

  setParam(param: string, value: any) {
    const curparams = this.params$.value;
    if (Object.keys(curparams).indexOf(param) > -1) {

      curparams[param] = value;
      this.params$.next(curparams);
    }
  }

}
