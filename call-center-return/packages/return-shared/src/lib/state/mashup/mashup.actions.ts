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

import { Action, Store, createAction, props } from "@ngrx/store";
import { MashupMapperResponse } from "./mashup-rsp-processor.service";
import { upsertEntities } from "../entities/entity.actions";
import { BucBaseUtil } from "@buc/svc-angular";

/**
 * The payload for triggering a invokeMashup action
 */
export interface MashupActionPayload {
    /**
     * The unique id of the mashup
     */
    mashupId: string;
    /**
     * Mashup input
     */
    mashupInput: any;
};

export interface PaginationModel {
    pageSize?: number;
    pageAction?: 'START' | 'NEXT' | 'PREVIOUS' | string;
    PageNumber?: number;
    TotalNumberOfPages?: number;
    TotalNumberOfRecords?: number;
    LastRecord?: any;
    IsLastPage?: 'Y' | 'N' | string;
    IsValidPage?: 'Y' | 'N' | string;
    IsFirstPage?: 'Y' | 'N' | string;
}

/**
 * The payload for triggering a invokePaginatedMashup action
 */
export interface PaginagedMashupPayload extends PaginationModel {
    input: Array<MashupActionPayload>;
};

/**
 * Action to invoke a single mashup
 */
export const invokeMashup = createAction('[mashup]-invokeMashup', 
    props<MashupActionPayload & { options?: any }>()
);

/**
 * Action to invoke multiple mashups
 */
export const invokeMultipleMashups = createAction('[mashup]-invokeMultipleMashups',
    props<{mashups: Array<MashupActionPayload>, options?: any }>()
);

/**
 * Action to invoke paginated mashup
 */
export const invokePaginatedMashup = createAction('[mashup]-invokePaginatedMashup',
    props<PaginagedMashupPayload & { options?: any }>()
);

/**
 * Action which indicates a mashup invocation failure
 */
export const mashupInvocationFailed = createAction('[mashup]-invocationFailed', props<{input: any, err: any}>());

/**
 * Generic action which indicates that mashup invocation was a success
 */
export const mashupInvocationSuccessful = createAction('[mashup]-invocationSuccessful', props<{apiOutput: any, input: any}>());

export function publishActions(
  store$: Store,
  apiOutput: any,
  input: any,
  response: MashupMapperResponse
): Action {
  let actionToDispatch: Action;
  if (Array.isArray(response.entities) && response.entities.length > 0) {
    actionToDispatch = upsertEntities({
      entities: response.entities,
    });

    if (Array.isArray(response.actions)) {
      response.actions.forEach((a) => store$.dispatch(a));
    }
  } else {
    if (Array.isArray(response.actions)) {
      if (response.actions.length === 1) {
        actionToDispatch = response.actions[0];
      } else {
        response.actions.forEach((a) => store$.dispatch(a));
      }
    }
  }
  if (BucBaseUtil.isVoid(actionToDispatch)) {
    actionToDispatch = mashupInvocationSuccessful({
      apiOutput,
      input,
    });
  } else {
    // notify success of mashup invocation
    store$.dispatch(mashupInvocationSuccessful({
      apiOutput,
      input,
    }))
  }
  return actionToDispatch;
}
