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

import { Action, Store } from '@ngrx/store';
import { PaginationState } from './pagination.actions';
import * as PaginationActions from './pagination.actions'
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, withLatestFrom } from 'rxjs/operators';
import { get } from 'lodash';
import { NO_OP_ACTION } from '../entities/entity.actions';

export function paginationEffectCreator (
    id: string, 
    actions$: Actions,
    store$: Store,
    handler: (payload: any, paginationState: PaginationState) => Action) {
    return createEffect(
        () => actions$.pipe(
            ofType(
              PaginationActions.startPagination,
              PaginationActions.gotoPage,
              PaginationActions.updateLoadCriteria,
              PaginationActions.updateSortCriteria,
              PaginationActions.refresh
            ),
            filter((p: any) => p.id === id),
            withLatestFrom(
              store$.select(PaginationActions.getPaginationState(id))
            ),
            map((actionAndState) => {
                const action: any = actionAndState[0];
                const pageState: PaginationState = actionAndState[1];
                if (action.type === PaginationActions.gotoPage.type) {
                    // check if data already exists
                    const currentPage = get(pageState, ['pages', action.pageNumber]);
                    return (currentPage === undefined) ? handler(action, pageState) : NO_OP_ACTION()
                }
                return handler(action, pageState);
            })
        )
    )
};
