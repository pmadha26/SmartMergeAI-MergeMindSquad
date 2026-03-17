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

import { createAction, createSelector, props } from "@ngrx/store";
import { PaginationModel } from "../mashup/mashup.actions";
import { AppState, Entity } from "../types/base-types";

export type SortCriteriaType = {
    sortKey: string;
    sortOrder: string;
};

export type PaginationStoreType = Record<string, PaginationState>;

/**
 * This interface reprsents the Pagination state.
 */
export interface PaginationState {
    id: string;

    /**
     * The criteria used to fetch data from the mashup server
     */
    loadCriteria: any;

    /**
     * The sort criteria
     */
    sortCriteria: SortCriteriaType;

    /**
     * The page wise last record for the NEXTPAGE pagination strategy
     */
    lastRecord?: { [key: number]: any };

    /**
     * Page data
     */
    pages?: { [key:number]: Array<Entity> };

    /**
     * Pagination data returned in the api
     */
    pageModel?: PaginationModel;

    /**
     * The current page number
     */
    pageNumber: number;

    /**
     * The current page size
     */
    pageSize: number;

    error?: any;

}

export const startPagination = createAction('[Pagination] start pagination', 
    props<{
        id: string;
        loadCriteria: any,
        sortCriteria: SortCriteriaType,
        pageSize?: number
    }>()
);

export const refresh = createAction('[Pagination] refresh results',
    props<{
        id: string,
    }>()
);

export const clear = createAction('[Pagination] clear results',
    props<{
        id: string,
        pageSize?: number,
    }>()
);

export const updateLoadCriteria = createAction('[Pagination] update load criteria', 
    props<{
        id: string;
        loadCriteria: any,
        sortCriteria: SortCriteriaType
    }>()
);

export const updateSortCriteria = createAction('[Pagination] update sort criteria', 
    props<{
        id: string;
        sortCriteria: SortCriteriaType,
        pageSize?: number,
    }>()
);

export const gotoPage = createAction('[Pagination] goto page', 
    props<{
        id: string;
        pageNumber: number,
        pageSize: number,
    }>()
);

export const setPageSize = createAction('[Pagination] set page size',
    props<{
        id: string;
        pageSize: number
    }>()
);

export const pageLoadSuccess = createAction('[Pagination] page load success',
    props<{
        id: string,
        pageModel: PaginationModel,
        pageData: Array<Entity>
    }>()
);

export const pageLoadFailed = createAction('[Pagination] page load failed',
    props<{
        id: string,
        err?: any,
    }>()
);

/**
 * Selects the pagination
 * @param store The application state
 * @returns The pagination state
 */
const selectPagination = (store: AppState) => store.uiState?.pagination as PaginationStoreType;

export const getPaginationState = (id: string) => createSelector(
    selectPagination,
    (paginationStore: PaginationStoreType) => paginationStore[id] as PaginationState
);

export const selectCurrentPage = (id: string) => createSelector(
    selectPagination,
    (paginationStore: PaginationStoreType) => {
        const paginationState = paginationStore[id];
        if (paginationState && paginationState.pages) {
            return  {
                pageData: paginationState.pages[paginationState.pageNumber],
                pageModel: paginationState.pageModel
            };
        } else if (paginationState && paginationState.error) {
            return {
                pageData: undefined,
                pageModel: undefined,
                error: paginationState.error
            };
        }
    }
);
