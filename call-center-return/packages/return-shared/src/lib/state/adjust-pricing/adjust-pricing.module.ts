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

import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { AdjustPricingStateEffects } from './adjust-pricing.effects'
import { UI_STATE_REDUCERS_TOKEN } from '../ui-state-reducers.service';
import { adjustPricingStateReducers } from './adjust-pricing.reducers';

@NgModule({
    declarations: [],
    imports: [
        EffectsModule.forFeature([
            AdjustPricingStateEffects
        ]),

    ],
    providers: [
        {
            provide: UI_STATE_REDUCERS_TOKEN,
            useValue: {
                adjustPricing: adjustPricingStateReducers
            },
            multi: true
        }
    ]
})
export class AdjustPricingStateModule { }
