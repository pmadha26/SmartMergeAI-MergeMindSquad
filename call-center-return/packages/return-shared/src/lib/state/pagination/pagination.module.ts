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

import { NgModule } from "@angular/core";
import { UI_STATE_REDUCERS_TOKEN } from "../ui-state-reducers.service";
import { paginationReducer } from "./pagination.reducer";

@NgModule({
    providers: [
        {
            provide: UI_STATE_REDUCERS_TOKEN,
            useValue: { pagination: paginationReducer},
            multi: true
        }
    ]
})
export class PaginationModule { }
