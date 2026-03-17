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

import { createReducer, on } from '@ngrx/store';
import * as PaginationActions from './pagination.actions';
import { PaginationState } from './pagination.actions';
import { get } from 'lodash';
import { PaginationModel } from '../mashup/mashup.actions';
import { PaginationStoreType } from './pagination.actions';
import { Entity } from '../types/base-types';
import { Pagination } from 'carbon-components-angular';

export const paginationReducer = createReducer({} as PaginationStoreType, 
    on(PaginationActions.startPagination, (state: PaginationStoreType, action) => _startPagination(state, action)),
    on(PaginationActions.updateLoadCriteria, (state: PaginationStoreType, action) => _updateLoadCriteria(state, action)),
    on(PaginationActions.updateSortCriteria, (state: PaginationStoreType, action) => _updateSortCriteria(state, action)),
    on(PaginationActions.setPageSize, (state: PaginationStoreType, action) => _setPageSize(state, action)),
    on(PaginationActions.gotoPage, (state: PaginationStoreType, action) => _gotoPage(state, action)),
    on(PaginationActions.refresh, (state: PaginationStoreType, action) => _refresh(state, action)),
    on(PaginationActions.clear, (state: PaginationStoreType, action) => _clear(state, action)),
    on(PaginationActions.pageLoadSuccess, (state: PaginationStoreType, action) => _pageLoadSuccess(state, action)),
    on(PaginationActions.pageLoadFailed, (state: PaginationStoreType, action) => _pageLoadFailed(state, action))
);

function _startPagination(state: PaginationStoreType, action: any): PaginationStoreType {
    const id = action.id;
    return { ...state, 
        [id]: {
            id,
            loadCriteria: action.loadCriteria,
            sortCriteria: action.sortCriteria,
            pageNumber: 1,
            pageSize: action.pageSize,
        }
    };
}

function _updateLoadCriteria(state: PaginationStoreType, action: any): PaginationStoreType {
    const id = action.id;
    const existing: PaginationState = get(state, id, { id }) as PaginationState;
    return { 
        ...state, 
        [id]: {
            ...existing,
            loadCriteria: action.loadCriteria,
            sortCriteria: action.sortCriteria ? action.sortCriteria : existing.sortCriteria,
            pageNumber: 1,
            lastRecord: undefined,
            pages: undefined,
            pageModel: undefined,
            error: undefined
        } 
    };
}

function _updateSortCriteria(state: PaginationStoreType, action: any): PaginationStoreType {
    const id = action.id;
    const existing: PaginationState = get(state, id, { id }) as PaginationState;
    return { 
        ...state, 
        [id]: {
            ...existing,
            sortCriteria: action.sortCriteria,
            pageNumber: 1,
            pageSize: action.pageSize || existing.pageSize,
            lastRecord: undefined,
            pages: undefined,
            pageModel: undefined,
            error: undefined
        } 
    };
}

function _setPageSize(state: PaginationStoreType, action: any): PaginationStoreType {
    const id = action.id;
    const existing: PaginationState = get(state, id, { id }) as PaginationState;
    return { 
        ...state, 
        [id]: {
            ...existing,
            pageSize: action.pageSize,
            pageNumber: 1,
            lastRecord: undefined,
            pages: undefined,
            pageModel: undefined,
            error: undefined
        } 
    };
}

function _gotoPage(state: PaginationStoreType, action: any): PaginationStoreType {
    const id = action.id;
    const existing: PaginationState = get(state, id, { id }) as PaginationState;
    const updates = existing.pageSize !== action.pageSize ? {
        pageNumber: 1,
        pageSize: action.pageSize,
        lastRecord: undefined,
        pages: undefined,
        pageModel: undefined,
        error: undefined
    } : {
        pageNumber: action.pageNumber
    }
    return { 
        ...state, 
        [id]: {
            ...existing,
            ...updates
        } 
    };
}

function _refresh(state: PaginationStoreType, action: any): PaginationStoreType {
    const id = action.id;
    const existing: PaginationState = get(state, id, { id }) as PaginationState;
    // reset page number to 1 and clear the previous pagination data
    const updates = {
        pageNumber: 1,
        pageSize: existing.pageSize,
        lastRecord: undefined,
        pages: undefined,
        pageModel: undefined,
        error: undefined
    };
    return {
        ...state,
        [id]: {
            ...existing,
            ...updates
        }
    };
}

function _clear(state: PaginationStoreType, action: any): PaginationStoreType {
    const id = action.id;
    const updates = {
        pageNumber: 1,
        pageSize: action.pageSize,
        lastRecord: undefined,
        pages: {},
        pageModel: undefined,
        error: undefined
    };
    return Object.assign({}, state, { [id]: {
        ...updates
    }});
}

function _pageLoadSuccess(state: PaginationStoreType, action: { id: string, pageModel: PaginationModel, pageData: Entity[]}): PaginationStoreType {
    const id = action.id;
    const existing: PaginationState = get(state, id, { id }) as PaginationState;
    const pageModel: PaginationModel = action.pageModel;
    return {
        ...state,
        [id]: {
            id,
            loadCriteria: existing.loadCriteria,
            sortCriteria: existing.sortCriteria,
            pageSize: existing.pageSize,
            pageNumber: pageModel.PageNumber,
            lastRecord: {
                ...existing.lastRecord,
                [pageModel.PageNumber]: pageModel.LastRecord
            },
            pages: {
                ...existing.pages,
                [pageModel.PageNumber]: action.pageData
            },
            pageModel,
            error: undefined
        }
    }
}

function _pageLoadFailed(state: PaginationStoreType, action: {id: string, err?: any}): PaginationStoreType {
    const id = action.id;
    const existing: PaginationState = get(state, id, { id }) as PaginationState;
    return {
        ...state,
        [id]: {
            ...existing,
            lastRecord: undefined,
            pageModel: undefined,
            pages: undefined,
            error: action.err
        }
    };
}
