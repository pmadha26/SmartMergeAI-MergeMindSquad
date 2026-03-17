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

import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { ModalService } from "carbon-components-angular";
import { tap } from "rxjs/operators";
import * as LineSummaryActions from './line-summary.actions';
import { ReturnLinePricingSummaryModalComponent } from "../../components/return-line-pricing-summary-modal/return-line-pricing-summary-modal.component";

@Injectable()
export class LineSummaryStateEffects {

    openLineSummaryModalEffect$ = createEffect(
        () => this.actions$.pipe(
            ofType(LineSummaryActions.openLineSummaryModal),
            tap((action) => {
                if(!action.keepExistingModalOpen) {
                    this.modalService.destroy();
                }
                this.modalService.create({
                    component: ReturnLinePricingSummaryModalComponent,
                    inputs: {
                        modalText: action.linesummary.modalText,
                        modalData: {
                            ...action.linesummary.modalData
                        }
                    }
                });
            })
        ), { dispatch: false }
    );

    constructor(
        private actions$: Actions,
        private modalService: ModalService,
    ) { }

}
