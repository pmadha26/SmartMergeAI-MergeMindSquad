/*
 * IBM Confidential
 * OCO Source Materials
 * 5737-D18, 5725-D10
 *
 * (C) Copyright International Business Machines Corp. 2022, 2023
 *
 * The source code for this program is not published or otherwise divested
 * of its trade secrets, irrespective of what has been deposited with the
 * U.S. Copyright Office.
 */

import { Injectable } from '@angular/core';
import { BucCommOmsMashupService } from '@buc/svc-angular';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import {
  catchError,
  switchMap,
  withLatestFrom,
  mergeMap
} from 'rxjs/operators';
import {
  MashupMapperResponse,
  MashupResponseProcessorService,
} from './mashup-rsp-processor.service';
import * as MashupActions from './mashup.actions';
import { AppState } from '../types/base-types';
import { get } from 'lodash';

type InvokeMashupInput = {
  mashups: Array<MashupActions.MashupActionPayload>;
} & {
  options?: any;
};

@Injectable()
export class MashupEffects {
  invokeMashup$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(MashupActions.invokeMashup),
        withLatestFrom(this.store$),
        mergeMap((actionAndCurrentState) => {
          const action = actionAndCurrentState[0];
          const appState = actionAndCurrentState[1];
          const onFailureAction: Action = this._getOnFailureAction(action);
          return this._invokeMashups(
            {
              mashups: [
                {
                  mashupId: action.mashupId,
                  mashupInput: action.mashupInput,
                },
              ],
              options: action.options,
            },
            appState
          ).pipe(
            catchError((err) =>
              of(onFailureAction ? { ...onFailureAction, input: action, err } : MashupActions.mashupInvocationFailed({ input: action, err }))
            )
          );
        })
      ),
    {
      dispatch: true,
    }
  );

  invokeMultipleMashups$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MashupActions.invokeMultipleMashups),
      withLatestFrom(this.store$),
      mergeMap((actionAndCurrentState) => {
        const action = actionAndCurrentState[0];
        const state = actionAndCurrentState[1];
        const onFailureAction: Action = this._getOnFailureAction(action);
        return this._invokeMashups(action, state).pipe(
          catchError((err) =>
            of(onFailureAction ? { ...onFailureAction, input: action, err } : MashupActions.mashupInvocationFailed({ input: action, err }))
          )
        );
      })
    ),
    {
        dispatch: true
    }
  );

  invokePaginatedMashup$ = createEffect(() =>
    this.actions$.pipe(
        ofType(MashupActions.invokePaginatedMashup),
        withLatestFrom(this.store$),
        mergeMap((actionAndCurrentState) => {
            const action = actionAndCurrentState[0];
            const state = actionAndCurrentState[1];
            const onFailureAction = this._getOnFailureAction(action);
            const pageModel = {
                LastRecord: action.LastRecord,
                PageNumber: action.PageNumber,
                IsValidPage: action.IsValidPage,
                IsLastPage: action.IsLastPage,
                IsFirstPage: action.IsFirstPage,
            };
            return this.mashupService.callPaginatedMashups(action.input, action.pageAction, action.pageSize, pageModel, action.options)
                .pipe(
                    switchMap((response) => this._mapResponseAndPublish(response, { mashups: action.input, options: {...action.options, pageModel} }, state)),
                    catchError((err) =>
                        of(onFailureAction ? { ...onFailureAction, input: action, err } : MashupActions.mashupInvocationFailed({ input: action, err }))
                    )
                );
        })
    )
  );

  constructor(
    private actions$: Actions,
    private mashupService: BucCommOmsMashupService,
    private mashupMapperSvc: MashupResponseProcessorService,
    private store$: Store<AppState>
  ) {}

  private _invokeMashups(
    input: InvokeMashupInput,
    appState: AppState
  ): Observable<Action> {
    return this.mashupService
      .callMashups(input.mashups, input.options)
      .pipe(
        switchMap((mashupResponse) =>
          this._mapResponseAndPublish(mashupResponse, input, appState)
        )
      );
  }

  private _mapResponseAndPublish(
    response: Record<string, any>,
    input: InvokeMashupInput,
    appState: AppState
  ) {
    const mapperResponse: MashupMapperResponse = this._mapMashupResponse(
      response,
      input,
      appState
    );
    return this._publishActions(mapperResponse, response, input);
  }

  private _mapMashupResponse(
    mashupResponse,
    input: InvokeMashupInput,
    appState: AppState
  ): MashupMapperResponse {
    // there is a mashup invocation reference Id. This Id will be used to pickup 
    // the mashup mapper. This provides an option to parse the api response in a single mapper
    // instead of breaking it up into separate mappers.
    let mapperInput: Record<string, any>;
    const mashupRefId = get(input, 'options.mashupRefId');
    if (mashupRefId === undefined) {
      // we map response by grouping the api output and invoking a mapper specific to the mashupId
      mapperInput = input.mashups.reduce(
        (prev, curr) => {
          const currMashupId = curr.mashupId;
          const mashupOutput = this.mashupService.getMashupOutput(
            mashupResponse,
            currMashupId
          );
          if (prev[currMashupId]) {
            prev[currMashupId].push({input: curr, response: mashupOutput});
          } else {
            prev[currMashupId] = [{input: curr, response: mashupOutput}];
          }
          return prev;
        },
        {}
      );
    } else {
      mapperInput = { [mashupRefId]: { input: input.mashups, response: mashupResponse }};
    }

    return this.mashupMapperSvc.processMashupResponse(
      mapperInput,
      appState,
      input.mashups,
      mashupResponse,
      input.options
    );
  }

  private _publishActions(
    response: MashupMapperResponse,
    apiOutput: any,
    input: any
  ): Observable<Action> {
    const onSuccessAction = this._getOnSuccessAction(input);
    if (onSuccessAction !== undefined) {
      // notify success of mashup invocation
      this.store$.dispatch(MashupActions.mashupInvocationSuccessful({
        apiOutput,
        input,
      }))

      // the action specified a custom successAction, publish that
      return of({
        ...onSuccessAction,
        mapperResponse: response,
        apiOutput,
        input
      });
    } else {
      return of(MashupActions.publishActions(this.store$, apiOutput, input, response));
    }
  }

  private _getOnFailureAction(action) {
    return get(action, 'options.onFailureAction.type') ? action.options.onFailureAction : undefined;
  }

  private _getOnSuccessAction(options) {
    return get(options, 'options.onSuccessAction.type') ? options.options.onSuccessAction : undefined;
  }
}
