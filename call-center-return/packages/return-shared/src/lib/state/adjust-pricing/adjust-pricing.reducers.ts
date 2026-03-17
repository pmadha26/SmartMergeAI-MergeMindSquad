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

import { createReducer, on } from "@ngrx/store";
import * as AdjustPricingActions from './adjust-pricing.actions';
import { AdjustPricingState, INITIAL_ADJUST_PRICING_STATE } from "./adjust-pricing.interface";

export const adjustPricingStateReducers = createReducer(INITIAL_ADJUST_PRICING_STATE,
  on(AdjustPricingActions.setChargeNameAndCategory, (state: AdjustPricingState, action) => ({
    ...state,
    chargeCategoryList: action.chargeCategoryList,
    chargeNameList: action.chargeNameList
  })),
  on(AdjustPricingActions.setExchangeChargeNameAndCategory, (state: AdjustPricingState, action) => ({
    ...state,
    chargeExchangeCategoryList: action.chargeCategoryList,
    chargeExchangeNameList: action.chargeNameList
  })),
  on(AdjustPricingActions.updateAppliedCharges, (state: AdjustPricingState, action) => ({
    ...state,
    appliedCharges: action.charges
  })),
  on(AdjustPricingActions.addModifyCharges, (state: AdjustPricingState, action) => ({
    ...state,
    chargeErrorMessage: ''
  })),
  on(AdjustPricingActions.updateAppliedChargesFailure, (state: AdjustPricingState, action) => ({
    ...state,
    chargeErrorMessage: action.errorMsg
  })),
  on(AdjustPricingActions.onAdjustPricingCloseClick, (state: AdjustPricingState, action) => ({
    ...state,
    appliedCharges: null
  })),
  on(AdjustPricingActions.updateCouponList, (state: AdjustPricingState, action) => ({
    ...state,
    couponList: action.coupons
  })),
  on(AdjustPricingActions.updateChangeOrder, (state: AdjustPricingState, action) => ({
    ...state,
    changeOrder: action.order
  })),
);
