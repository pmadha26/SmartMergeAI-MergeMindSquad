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

import { Inject, Injectable, InjectionToken } from "@angular/core";
import { ActionReducerMap } from "@ngrx/store";
import { AppState } from "./types/base-types";

export const UI_STATE_REDUCERS_TOKEN = new InjectionToken<ActionReducerMap<any>>('UI state feature Reducers');

export const CONSOLIDATED_UI_STATE_REDUCERS = new InjectionToken<ActionReducerMap<any>>('consolidated UI state feature Reducers');

@Injectable()
export class UiStateReducersService {

    private consolidatedReducerMap: ActionReducerMap<any> = {};

    constructor(@Inject(UI_STATE_REDUCERS_TOKEN) private uiStateReducers: Array<ActionReducerMap<any>>) {
        if (Array.isArray(this.uiStateReducers) && this.uiStateReducers.length > 0) {
            this.consolidatedReducerMap = this.uiStateReducers.reduce((prev, curr) => {
                Object.keys(curr).forEach(fKey => prev[fKey] = curr[fKey])
                return prev;
            }, {});
        }
    }

    public getActionReducerMap(): ActionReducerMap<any> {
        return this.consolidatedReducerMap;
    }

}
