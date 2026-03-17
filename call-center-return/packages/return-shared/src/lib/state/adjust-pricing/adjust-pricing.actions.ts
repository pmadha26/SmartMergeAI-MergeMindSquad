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
import { AppState } from "../types/base-types";
import { AdjustPricingState } from "./adjust-pricing.interface";

export const openAdjustPricingModal = createAction(
  '[AdjustSummaryStateActions]-openAdjustPricingModal',
  props<{ AdjustPricing: Record<string, any> }>()
);

export const fetchChargeNameAndCategoryList = createAction(
  '[AdjustSummaryStateActions]-getChargeNameAndCategoryList',
  props<{ categoryListInput: Record<string, any>, chargeNameListInput: Record<string, any>, isExchange?: boolean }>()
);

export const fetchCouponPromoList = createAction(
  '[AdjustSummaryStateActions]-getCouponPromoList',
  props<{  couponInput: Record<string, any> }>()
);

export const fetchCouponPromoListSuccess  = createAction(
  '[AdjustSummaryStateActions]-fetchCouponPromoListSuccess',
  props<{ apiOutput?: any}>()
)

export const fetchCouponPromoListFailure = createAction(
  '[AdjustSummaryStateActions]-fetchCouponPromoListFailure',
  props<{  err?: any }>()
)

export const applyRemoveCouponPromo = createAction(
  '[AdjustSummaryStateActions]-applyRemoveCouponPromo',
  props<{ recordPendingChangesMode: boolean, isActionRemove?: boolean, couponInput: Record<string, any>, showAdjustPricingWarning?: boolean, returnOrderHeaderKey?: any }>()
);

export const applyRemoveCouponPromoSuccess = createAction(
  '[AdjustSummaryStateActions]-applyRemoveCouponPromoSuccess',
  props<{ recordPendingChangesMode?: any, isActionRemove?: any ,apiOutput?: any, showAdjustPricingWarning?: boolean, returnOrderHeaderKey?: any}>()
)
export const applyRemoveCouponPromoFailure = createAction(
  '[AdjustSummaryStateActions]-applyRemoveCouponPromoFailure',
  props<{ err?: any }>()
)

export const refreshOrderPayment = createAction(
  '[AdjustSummaryStateActions]-refreshOrderPayment',
  props<{ exchangeOrderHeaderKey?: any, returnOrderHeaderKey?: any }>()
)

export const onGetChargeNameAndCategoryListSuccess = createAction(
  '[AdjustSummaryStateActions]-onGetChargeNameAndCategoryListSuccess',
  props<{
    apiOutput?: any,
    isExchangeChargeCategory?: boolean
  }>()
);

export const setChargeNameAndCategory = createAction(
  '[AdjustSummaryStateActions]-setChargeNameAndCategory',
  props<{ chargeCategoryList?: Array<any>, chargeNameList?: Array<any> }>()
);

export const setExchangeChargeNameAndCategory = createAction(
  '[AdjustSummaryStateActions]-setExchangeChargeNameAndCategory',
  props<{ chargeCategoryList?: Array<any>, chargeNameList?: Array<any> }>()
);

export const saveAllCharges = createAction(
  '[AdjustSummaryStateActions]-saveAllCharges',
  props<{ isLineLevel: boolean, returnDetails: any, orderHeaderKey: string, orderLineKey: string, summaryChargeArray: any, noteText: string, closeModal?: () => void, refreshActions }>()
)
export const saveAllChargesSuccess = createAction(
  '[AdjustSummaryStateActions]-saveAllChargesSuccess',
  props<{ isLineLevel: boolean, refreshActions, closeModal?: () => void }>()
)
export const saveAllChargesFailure = createAction(
  '[AdjustSummaryStateActions]-saveAllChargesFailure',
  props<{ err?: any }>()
)


export const addModifyCharges = createAction(
  '[AdjustSummaryStateActions]-addModifyCharges',
  props<{ isLineLevel: boolean, returnDetails: any, orderHeaderKey: string, orderLineKey: string, summaryChargeArray: any}>()
)
export const addModifyChargesSuccess = createAction(
  '[AdjustSummaryStateActions]-addModifyChargesSuccess',
  props<{ apiOutput?: any, isLineLevel: boolean}>()
)
export const addModifyChargesFailure = createAction(
  '[AdjustSummaryStateActions]-addModifyChargesFailure',
  props<{ returnDetails: any, err?: any }>()
)
export const updateAppliedCharges = createAction(
  '[AdjustSummaryStateActions]- updateAppliedCharges',
  props<{ charges?: any, isLineLevel: boolean }>()
)
export const updateAppliedChargesFailure = createAction(
  '[AdjustSummaryStateActions]- updateAppliedChargesFailure',
  props<{ errorMsg: string }>()
)
export const updateCouponList = createAction(
  '[AdjustSummaryStateActions]- updateCouponList',
  props<{ coupons?: any }>()
)
export const updateChangeOrder = createAction(
  '[AdjustSummaryStateActions]- updateChangeOrder',
  props<{ order?: any }>()
)


export const addNote = createAction(
  '[AdjustSummaryStateActions]- addNote',
  props<{ noteText: string, isLineLevel: boolean, orderHeaderKey: string, orderLineKey: string }>()
)

export const onAdjustPricingCloseClick = createAction(
  '[AdjustSummaryStateActions]- onAdjustPricingCloseClick',
  props<{ isLineLevel: boolean, refreshActions }>()
)

const adjustPricing = (store: AppState) => (store.uiState.adjustPricing) as AdjustPricingState;

export const getChargeNameList = createSelector(adjustPricing,
  (adjustPricing: AdjustPricingState) => adjustPricing.chargeNameList);

export const getCategoryNameList = createSelector(adjustPricing,
  (adjustPricing: AdjustPricingState) => adjustPricing.chargeCategoryList);

export const getExchangeChargeNameList = createSelector(adjustPricing,
  (adjustPricing: AdjustPricingState) => adjustPricing.chargeExchangeNameList);

export const getExchangeCategoryNameList = createSelector(adjustPricing,
  (adjustPricing: AdjustPricingState) => adjustPricing.chargeExchangeCategoryList);
  
export const getAppliedCharges = createSelector(adjustPricing,
  (adjustPricing: AdjustPricingState) => adjustPricing.appliedCharges);

export const getChargeErrorMessage = createSelector(adjustPricing,
  (adjustPricing: AdjustPricingState) => adjustPricing.chargeErrorMessage);

export const getCouponList = createSelector(adjustPricing,
  (adjustPricing: AdjustPricingState) => adjustPricing.couponList);
  
export const getChangeOrder = createSelector(adjustPricing,
  (adjustPricing: AdjustPricingState) => adjustPricing.changeOrder);
