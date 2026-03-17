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
import { concatLatestFrom} from "@ngrx/operators"
import { ModalService } from "carbon-components-angular";
import { map, tap } from "rxjs/operators";
import * as AdjustPricingActions from './adjust-pricing.actions';
import { AdjustPricingModalComponent } from "../../components/adjust-pricing-modal/adjust-pricing-modal.component";
import * as MashupActions from "../mashup/mashup.actions";
import *  as EntityActions from '../entities/entity.actions';
import { Constants } from "../../common/return.constants";
import { BucCommOmsMashupService, BucSvcAngularStaticAppInfoFacadeUtil } from "@buc/svc-angular";
import { Store } from "@ngrx/store";
import { TranslateService } from "@ngx-translate/core";
import { get } from "lodash";
import { CCNotificationService } from "@buc/common-components";
import { CommonBinaryOptionModalComponent } from "@buc/common-components";


@Injectable()
export class AdjustPricingStateEffects {

    openAdjustSummaryModalEffect$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.openAdjustPricingModal),
            tap((action) => {
                if (action.AdjustPricing.modalData.showAdjustPricingWarning) {
                    this.modalService.destroy();
                    this.modalService.create({
                      component: CommonBinaryOptionModalComponent,
                      inputs: {
                        modalText: {
                          header: this.translateService.instant('SHARED.GENERAL.LABEL_CONFIRMATION'),
                          label:  action.AdjustPricing.modalData.isExchange ? this.translateService.instant( 'PAYMENT_SUMMARY.SIDE_PANEL.LABEL_EXCHANGE_PAYMENT_CONFIRM_ADJUST')
                                    : this.translateService.instant( 'PAYMENT_SUMMARY.SIDE_PANEL.LABEL_RETURN_PAYMENT_CONFIRM_ADJUST'),
                          size: 'sm'
                        },
                        optionOne: {
                          primary: '',
                          text: this.translateService.instant('SHARED.GENERAL.LABEL_N'),
                          tid: 'dismiss-cancel',
                          callback: () => {
                            return false;
                          },
                          callOnClose: true
                        },
                        optionTwo: {
                          class: {
                            primary: true
                          },
                          text: this.translateService.instant('SHARED.GENERAL.LABEL_Y'),
                          tid: 'confirm-cancel',
                          callback: () => {
                            this.openAdjustModal(action)
                          }
                        }
                      },
                    });
                    return EntityActions.NO_OP_ACTION();
                  } else {
                    this.openAdjustModal(action)
                  }
            })
        ), { dispatch: false }
    );

    private openAdjustModal(action){
        this.modalService.destroy();
        this.modalService.create({
            component: AdjustPricingModalComponent,
            inputs: {
                modalText: action.AdjustPricing.modalText,
                modalData: {
                    ...action.AdjustPricing.modalData
                }
            }
        });
    }

    applyRemoveCouponPromoEffect$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.applyRemoveCouponPromo),
            map((action) => {
                return MashupActions.invokeMashup(
                    {
                        mashupId: action.recordPendingChangesMode ? Constants.MASHUP_ID_CHANGE_ORDER_PROMOTIONS : Constants.MASHUP_ID_CHANGE_ORDER_PROMOTIONS_CHECKOUT,
                        mashupInput: {
                            Order: action.couponInput  
                        },
                        options: {
                            onSuccessAction: AdjustPricingActions.applyRemoveCouponPromoSuccess({ recordPendingChangesMode: action.recordPendingChangesMode, isActionRemove: action.isActionRemove, showAdjustPricingWarning: action.showAdjustPricingWarning, returnOrderHeaderKey: action.returnOrderHeaderKey }),
                            onFailureAction: AdjustPricingActions.applyRemoveCouponPromoFailure({}),
                            handleMashupError: true
                        }
                    }
                )
            })   
        )
    )

    applyRemoveCouponPromoSuccess$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.applyRemoveCouponPromoSuccess),
            map((action) => {
                const output = this.mashupService.getMashupOutput(action.apiOutput, action.recordPendingChangesMode ? Constants.MASHUP_ID_CHANGE_ORDER_PROMOTIONS : Constants.MASHUP_ID_CHANGE_ORDER_PROMOTIONS_CHECKOUT)
                const order = { isActionRemove: action.isActionRemove,
                                Order: get(output, 'Order')}
                    if (action.showAdjustPricingWarning){
                        this.store$.dispatch( AdjustPricingActions.refreshOrderPayment({ exchangeOrderHeaderKey:order.Order.OrderHeaderKey, returnOrderHeaderKey: action.returnOrderHeaderKey }));
                    }
                return AdjustPricingActions.updateChangeOrder({ order: order })
            })
        )
    )

    applyRemoveCouponPromoFailure$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.applyRemoveCouponPromoFailure),
            map((action) => {
                const errorMsg = this.handleMashupError(action.err);
                return AdjustPricingActions.updateAppliedChargesFailure({ errorMsg })
            })
        )
    )

    fetchChargeNameAndCategoryList$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.fetchChargeNameAndCategoryList),
            concatLatestFrom(() => [
                this.store$.select(AdjustPricingActions.getChargeNameList),
                this.store$.select(AdjustPricingActions.getCategoryNameList), 
                this.store$.select(AdjustPricingActions.getExchangeChargeNameList),
                this.store$.select(AdjustPricingActions.getExchangeCategoryNameList)
            ]),
            map(([action, chargeNameList, categoryList, chargeExchangeNameList, chargeExchangeCategoryList]) => {
                const mashupArray = [];
                if ((!action.isExchange && categoryList?.length === 0) || 
                (action.isExchange && chargeExchangeCategoryList?.length === 0)) {
                    mashupArray.push({
                        mashupId: Constants.MASHUP_ID_GET_CHARGECATEGORY_LIST,
                        mashupInput: {
                            ChargeCategory: action.categoryListInput
                        }
                    });
                }
                if ( (!action.isExchange && chargeNameList?.length === 0) || 
                (action.isExchange && (chargeExchangeNameList?.length === 0))) {
                    mashupArray.push({
                        mashupId: Constants.MASHUP_ID_GET_CHARGENAME_LIST,
                        mashupInput: {
                            ChargeName: action.chargeNameListInput
                        }
                    });
                }
                if (mashupArray.length) {
                    return MashupActions.invokeMultipleMashups({
                        mashups: mashupArray,
                        options: {
                            onSuccessAction: AdjustPricingActions.onGetChargeNameAndCategoryListSuccess({isExchangeChargeCategory: action.isExchange})
                        }
                    })
                } else {
                    return EntityActions.NO_OP_ACTION();
                }
            }
            )
        )
    )

    getCouponPromoList$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.fetchCouponPromoList),
            map((action) => {
                return MashupActions.invokeMashup(
                    {
                        mashupId: Constants.MASHUP_ID_GET_PROMOTION_LIST,
                        mashupInput: {
                            DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
                            Order: action.couponInput  
                        },
                        options: {
                            onSuccessAction: AdjustPricingActions.fetchCouponPromoListSuccess({}),
                            onFailureAction: AdjustPricingActions.fetchCouponPromoListFailure({}),
                            handleMashupError: true
                        }
                    }
                )
            })   
        )
    )

    fetchCouponPromoListSuccess$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.fetchCouponPromoListSuccess),
            map((action) => {
                const output = this.mashupService.getMashupOutput(action.apiOutput, Constants.MASHUP_ID_GET_PROMOTION_LIST)
                const coupons = get(output, 'PricingRuleList.PricingRule');
                return AdjustPricingActions.updateCouponList({ coupons: coupons })
            })
        )
    )

    fetchCouponPromoListFailure$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.fetchCouponPromoListFailure),
            map((action) => {
                const errorMsg = this.handleMashupError(action.err);
                return AdjustPricingActions.updateAppliedChargesFailure({ errorMsg })
            })
        )
    )

    onGetChargeNameAndCategoryListSuccess$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.onGetChargeNameAndCategoryListSuccess),
            map(({ apiOutput, isExchangeChargeCategory }) => {
                const chargeCategoryOutput = this.mashupService.getMashupOutput(apiOutput, Constants.MASHUP_ID_GET_CHARGECATEGORY_LIST);
                const chargeCategory = get(chargeCategoryOutput, 'ChargeCategoryList.ChargeCategory', []);
                const chargeNameOutput = this.mashupService.getMashupOutput(apiOutput, Constants.MASHUP_ID_GET_CHARGENAME_LIST);
                const chargeName = get(chargeNameOutput, 'ChargeNameList.ChargeName', [])
                return isExchangeChargeCategory ? AdjustPricingActions.setExchangeChargeNameAndCategory({ chargeCategoryList: chargeCategory, chargeNameList: chargeName })
                : AdjustPricingActions.setChargeNameAndCategory({ chargeCategoryList: chargeCategory, chargeNameList: chargeName })
            }
            )
        )
    )

    saveAllCharges$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.saveAllCharges),
            map((action) => {
                const loginUserId = BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLoginId();
                let noteDetail = {};
                let input = {
                    OrderHeaderKey: action.orderHeaderKey,
                    Action: action.noteText ? 'MODIFY' : ''
                };
                if (action.isLineLevel) {
                    if(action.noteText){
                        noteDetail = {
                            Note: {
                                NoteText: action.noteText,
                                Createuserid: loginUserId,
                                Modifyuserid: loginUserId
                            }
                        }
                    }
                    const lineCharges = {
                        OrderLines: {
                            OrderLine: [
                                {
                                    OrderLineKey: action.orderLineKey,
                                    LineCharges: {
                                        LineCharge: action.summaryChargeArray
                                    },
                                    Notes: noteDetail
                                }
                            ]
                        }
                    };
                    input = Object.assign(input, lineCharges);
                    return MashupActions.invokeMashup({
                        mashupId: Constants.MASHUP_ID_SAVE_ALL_LINE_CHARGES_OR_NOTE,
                        mashupInput: {
                            Order: input
                        },
                        options: {
                            onSuccessAction: AdjustPricingActions.saveAllChargesSuccess({ isLineLevel: action.isLineLevel, refreshActions: action.refreshActions, closeModal: action.closeModal }),
                            onFailureAction: AdjustPricingActions.saveAllChargesFailure({}),
                            handleMashupError: true
                        }
                    })
                } else {
                    if(action.noteText){
                        noteDetail = {
                            Note: {
                                NoteText: action.noteText,
                                Createuserid: loginUserId,
                                Modifyuserid: loginUserId
                            }
                        }
                    }
                    const headercharges = {
                        HeaderCharges: {
                            HeaderCharge: action.summaryChargeArray,
                        },
                        Notes: noteDetail
                    };
                    input = Object.assign(input, headercharges);
                    return MashupActions.invokeMashup({
                        mashupId: Constants.MASHUP_ID_SAVE_ALL_HEADER_CHARGES_OR_NOTE,
                        mashupInput: {
                            Order: input
                        },
                        options: {
                            onSuccessAction: AdjustPricingActions.saveAllChargesSuccess({isLineLevel: action.isLineLevel, refreshActions: action.refreshActions, closeModal: action.closeModal}),
                            onFailureAction: AdjustPricingActions.saveAllChargesFailure({}),
                            handleMashupError: true
                        }
                    })
                }
            })
        )
    )

    saveAllChargesSuccess$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.saveAllChargesSuccess),
            map(({isLineLevel, refreshActions, closeModal}) => {
                this.notificationService.notify({
                    type: "success",
                    title: this.translateService.instant('ADJUST_PRICING_MODAL.LABEL_ADJUSTMENT_SAVED_MSG')
                });
                if(closeModal){
                    closeModal();
                }
                return AdjustPricingActions.onAdjustPricingCloseClick({isLineLevel, refreshActions});
            })
        )
    )

   saveAllChargesFailure$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.saveAllChargesFailure),
            map(({err}) => {
                const errorMsg = this.handleMashupError(err);
                this.notificationService.notify({
                    type: "error",
                    title: errorMsg
                });
                return EntityActions.NO_OP_ACTION();
            })
        )
    )

    addModifyCharges$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.addModifyCharges),
            map((action) => {
                let input = {
                    OrderHeaderKey: action.orderHeaderKey,
                };
                const pendingChanges = { PendingChanges: { RecordPendingChanges: 'N' } };
                if (action.isLineLevel) {
                    const lineCharges = {
                        OrderLines: {
                            OrderLine: [
                                {
                                    OrderLineKey: action.orderLineKey,
                                    LineCharges: {
                                        LineCharge: action.summaryChargeArray
                                    }
                                }
                            ]
                        }
                    };
                    input = Object.assign(input, lineCharges, pendingChanges);
                    return MashupActions.invokeMashup({
                        mashupId: Constants.MASHUP_ID_SUBMIT_ADJUSTPRICING_ADD_LINE_CHARGES,
                        mashupInput: {
                            Order: input
                        },
                        options: {
                            onSuccessAction: AdjustPricingActions.addModifyChargesSuccess({ isLineLevel: action.isLineLevel }),
                            onFailureAction: AdjustPricingActions.addModifyChargesFailure({ returnDetails: action.returnDetails }),
                            handleMashupError: true
                        }
                    })
                } else {
                    const headercharges = {
                        HeaderCharges: {
                            HeaderCharge: action.summaryChargeArray
                        }
                    };
                    input = Object.assign(input, headercharges, pendingChanges);
                    return MashupActions.invokeMashup({
                        mashupId: Constants.MASHUP_ID_SUBMIT_ADJUSTPRICING_ADD_HEADER_CHARGES,
                        mashupInput: {
                            Order: input
                        },
                        options: {
                            onSuccessAction: AdjustPricingActions.addModifyChargesSuccess({ isLineLevel: action.isLineLevel }),
                            onFailureAction: AdjustPricingActions.addModifyChargesFailure({ returnDetails: action.returnDetails }),
                            handleMashupError: true
                        }
                    })
                }
            })
        )
    )


    addModifyChargesSuccess$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.addModifyChargesSuccess),
            map((action) => {
                const output = this.mashupService.getMashupOutput(action.apiOutput, action.isLineLevel ? Constants.MASHUP_ID_SUBMIT_ADJUSTPRICING_ADD_LINE_CHARGES : Constants.MASHUP_ID_SUBMIT_ADJUSTPRICING_ADD_HEADER_CHARGES)
                const charges = action.isLineLevel ? get(output, 'Order.OrderLines') : get(output, 'Order');
                return AdjustPricingActions.updateAppliedCharges({ charges, isLineLevel: action.isLineLevel })
            })
        )
    )

    addModifyChargesFailure$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.addModifyChargesFailure),
            map((action) => {
                const errorMsg = this.handleMashupError(action.err);
                return AdjustPricingActions.updateAppliedChargesFailure({ errorMsg })
            })
        )
    )

    onAdjustPricingCloseClick$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.onAdjustPricingCloseClick),
            map((action) => {
                if (action.refreshActions.length > 0) {
                    action.refreshActions.forEach(a => this.store$.dispatch(a))
                }
                return EntityActions.NO_OP_ACTION();
            })
        )
    )

    addNote$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.addNote),
            map((action) => {
                const loginUserId = BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLoginId();
                if (action.isLineLevel) {
                    const input = {
                        Order: {
                            OrderHeaderKey: action.orderHeaderKey,
                            OrderLines: {
                                OrderLine: [
                                    {
                                        OrderLineKey: action.orderLineKey,
                                        Notes: {
                                            Note: {
                                                NoteText: action.noteText,
                                                Createuserid: loginUserId,
                                                Modifyuserid: loginUserId
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    };
                    return MashupActions.invokeMashup({
                        mashupId: Constants.MASHUP_ID_ADD_ORDERLINE_NOTE,
                        mashupInput: input
                    })
                } else {
                    const input = {
                        Order: {
                            OrderHeaderKey: action.orderHeaderKey,
                            Notes: {
                                Note: {
                                    NoteText: action.noteText,
                                    Createuserid: loginUserId,
                                    Modifyuserid: loginUserId
                                }
                            }
                        }
                    };
                    return MashupActions.invokeMashup({
                        mashupId: Constants.MASHUP_ID_ADD_NOTE,
                        mashupInput: input
                    })
                }

            })
        )
    )

    refreshOrderPayment$ = createEffect(
        () => this.actions$.pipe(
            ofType(AdjustPricingActions.refreshOrderPayment),
            map((action) => {
                const mashupArray = [];
                mashupArray.push({
                    mashupId: Constants.MASHUP_ID_COMPUTE_REFUND_PAYMENTS,
                    mashupInput: {
                        Order: {
                            DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
                            OrderHeaderKey: action.returnOrderHeaderKey
                        },
                    },
                });
                if (action.exchangeOrderHeaderKey) {
                    mashupArray.push({
                        mashupId: Constants.MASHUP_ID_GET_PAYMENT_COMPLETE_ORDER_DETAILS,
                        mashupInput: {
                            Order: {
                                DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
                                OrderHeaderKey: action.exchangeOrderHeaderKey
                            },
                        }
                    });
                }
                
                if (mashupArray.length) {
                    return MashupActions.invokeMultipleMashups({
                        mashups: mashupArray,
                    })
                } else {
                    return EntityActions.NO_OP_ACTION();
                }
            })
        )
    )

    constructor(
        private actions$: Actions,
        private modalService: ModalService,
        private store$: Store,
        private mashupService: BucCommOmsMashupService,
        private translateService: TranslateService,
        private notificationService: CCNotificationService

    ) {
    }

    handleMashupError(error) {
        let errorMsg = '';
        if (error && error.mashupResponse) {
            const { Errors } = error.mashupResponse;
            if (Errors?.Error) {
                Errors.Error.forEach((error) => {
                    errorMsg = error.ErrorDescription;
                    const errorCode = error.ErrorCode;

                    switch (errorCode) {
                        case 'OMP921_MO10':
                            errorMsg = this.translateService.instant('ADJUST_PRICING_MODAL.MGR_APPROVAL_MANUAL_DISCOUNT_ERROR');
                            break;
                        case 'OMP921_MO05':
                            errorMsg = this.translateService.instant('ADJUST_PRICING_MODAL.APPROVER_CANNOT_OVERRIDE_ERROR');
                            break;
                        case 'OMP921_MO11':
                            errorMsg = this.translateService.instant('ADJUST_PRICING_MODAL.MGR_APPROVAL_NEGATIVE_ORDER_ERROR');
                            break;
                        case 'OMP921_MO12':
                            errorMsg = this.translateService.instant('ADJUST_PRICING_MODAL.MGR_APPROVAL_NEGATIVE_LINE_ERROR');
                            break;
                        case 'OMP921_MO100':
                            errorMsg = this.translateService.instant('ADJUST_PRICING_MODAL.MGR_APPROVAL_MULTIPLE_VIOLATIONS');
                            break;
                    }
                });
            }
        }
        return errorMsg;
    }

}
