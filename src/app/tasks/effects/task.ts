import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { Scheduler } from 'rxjs/Scheduler';
import { async } from 'rxjs/scheduler/async';
import { empty } from 'rxjs/observable/empty';
import { of } from 'rxjs/observable/of';

import { TodoistTasksService } from '../../core/services/todoist-tasks';
import {
  TaskActionTypes,
  TaskActions,
  SearchComplete,
  SearchError,
  Search,
} from '../actions/task';
import { Task } from '../models/task';
import {
  debounceTime,
  map,
  switchMap,
  skip,
  takeUntil,
  catchError,
} from 'rxjs/operators';

export const SEARCH_DEBOUNCE = new InjectionToken<number>('Search Debounce');
export const SEARCH_SCHEDULER = new InjectionToken<Scheduler>(
  'Search Scheduler'
);

/**
 * Effects offer a way to isolate and easily test side-effects within your
 * application.
 *
 * If you are unfamiliar with the operators being used in these examples, please
 * check out the sources below:
 *
 * Official Docs: http://reactivex.io/rxjs/manual/overview.html#categories-of-operators
 * RxJS 5 Operators By Example: https://gist.github.com/btroncone/d6cf141d6f2c00dc6b35
 */

@Injectable()
export class TaskEffects {
  @Effect()
  search$: Observable<Action> = this.actions$.pipe(
    ofType<Search>(TaskActionTypes.Search),
    debounceTime(this.debounce || 300, this.scheduler || async),
    map(action => action.payload),
    switchMap(query => {
      if (query === '') {
        return empty();
      }

      const nextSearch$ = this.actions$.pipe(
        ofType(TaskActionTypes.Search),
        skip(1)
      );
      return this.todoistTaskService
        .searchTasks(query)
        .pipe(
          takeUntil(nextSearch$),
          map((tasks: Task[]) => new SearchComplete(tasks)),
          catchError(err => of(new SearchError(err)))
        );
    })
  );

  constructor(
    private actions$: Actions,
    private todoistTaskService: TodoistTasksService,
    @Optional()
    @Inject(SEARCH_DEBOUNCE)
    private debounce: number,
    /**
     * You inject an optional Scheduler that will be undefined
     * in normal application usage, but its injected here so that you can mock out
     * during testing using the RxJS TestScheduler for simulating passages of time.
     */
    @Optional()
    @Inject(SEARCH_SCHEDULER)
    private scheduler: Scheduler
  ) {}
}
