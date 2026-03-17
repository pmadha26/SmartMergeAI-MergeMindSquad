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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ComboboxComponent, CommonBinaryOptionModalComponent } from '@buc/common-components';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep, isEmpty } from 'lodash';
import { Constants } from '../../common/return.constants';
import { BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { EntityStoreService } from '../../state/entities/entity-store.service';
import * as AdjustPricingActions from '../../state/adjust-pricing/adjust-pricing.actions';
import { SharedExtensionConstants } from '../../shared-extension.constants';
import { Subscription } from 'rxjs';
import { ModalService } from 'carbon-components-angular';

@Component({
    selector: 'call-center-promotion-box:not([extn])',
    templateUrl: './promotion-box.component.html',
    styleUrls: ['./promotion-box.component.scss']
})
export class PromotionBoxComponent implements OnInit, OnChanges, OnDestroy {
    EXTENSION = {
        TOP: SharedExtensionConstants.RETURN_PROMOTION_BOX_RS_TOP,
        BOTTOM: SharedExtensionConstants.RETURN_PROMOTION_BOX_RS_BOTTOM
    };

    @Input() appliedCouponPromo;
    @Input() orderHeaderKey;
    @Input() recordPendingChangesMode;
    @Input() isModal;
    @Input() isDraftOrder;
    @Input() showAdjustPricingWarning = false;
    @Input() returnOrderHeaderKey;
    @Input() isSaveAllChargesEnabled = false;

    @Output() callGetOrderDetails = new EventEmitter<any>();
    @Output() promoUpdated = new EventEmitter<any>();
    @Output() callSetFlags = new EventEmitter<any>();
    @Output() promoError = new EventEmitter<any>();

    @ViewChild('couponCombobox', { static: false }) private couponCombobox: ComboboxComponent;

    responseData: any;
    mapCouponList: any;
    couponList: any[];
    saveChargesEnabled = false;
    isAnyChangeAppliedOnModal = false;
    isCouponInvalid = false;
    couponInvalidText = '';
    applyEnabled = true;
    selectedCouponPromo: any;
    clearInput = false;
    readonly resourceIdsForActions = {
      ADD_REMOVE_PROMOTION : 'ICC000005'
    }
    componentId = 'promotion-box';
    subscriptions: Subscription[] = [];
    isResourcePermissionAvailable: boolean;

    constructor(
        public translate: TranslateService,
        private entityStoreSvc: EntityStoreService,
        public modalService: ModalService,
        private translateService: TranslateService,
        ) { }

    ngOnChanges(changes: SimpleChanges): void {
    }

    ngOnInit(): void {
        this.isResourcePermissionAvailable = this.hasResourcePermission();
        this.initialize();
    }

    initialize() {
        if(this.isResourcePermissionAvailable) {
          this.fetchCouponPromoList();
        }
        this.initializeSubscriptions();
    }

    initializeSubscriptions() {
        this.subscriptions.push(          
            this.entityStoreSvc.getStore().select(
            AdjustPricingActions.getCouponList
          ).subscribe((promoList) => {
            if (promoList) {
                this.couponList = promoList.map(element => ({
                    content: element.PricingRuleName,
                    id: element.PricingRuleName,
                    description: element.Description
                }));
                this.couponList.sort((a, b) =>
                  a.id > b.id ? 1: 
                  a.id < b.id ? -1 : 0
                );
            }
          }),
        this.entityStoreSvc.getStore().select(
            AdjustPricingActions.getChangeOrder
          ).subscribe(this.onCouponUpdate.bind(this))
        )
    }
    hasResourcePermission(){
      return BucSvcAngularStaticAppInfoFacadeUtil.canUserAccessResource(this.resourceIdsForActions.ADD_REMOVE_PROMOTION);
    }
    async fetchCouponPromoList() {
        const couponInput = {
            OrderHeaderKey: this.orderHeaderKey,
            GetCoupons: 'Y',
            GetOrderRules: 'Y'
        };
        this.entityStoreSvc.dispatchAction(
            AdjustPricingActions.fetchCouponPromoList({
                couponInput: couponInput
            })
        );
    }
    onGetCouponList(mashupOutput){
         this.mapCouponList = mashupOutput;
        if (this.mapCouponList) {
            const coupons = this.mapCouponList.PricingRuleList.PricingRule;
            if (coupons !== undefined) {
                this.couponList = coupons.map(element => ({
                    content: element.PricingRuleName,
                    id: element.PricingRuleName,
                    description: element.Description
                }));
            }
        }
    }
    selectCouponCode(event) {
        this.isCouponInvalid = false;
        if (event.item?.id) {
            this.selectedCouponPromo = event.item.id;
            this.applyEnabled = false;
        } else {
            this.selectedCouponPromo = null;
            this.applyEnabled = true;
        }
    }

    onSearch(value) {
        this.isCouponInvalid = false;
        if (value) {
            this.applyEnabled = false;
            this.selectedCouponPromo = value;
        } else {
            this.applyEnabled = true;
           // this.couponInvalidText = await this._getNls(`PAYMENT_SUMMARY.COUPON_ERRORS.${appliedCoupon.DenialReason}`);
        }
    }

    onApply() {
        (this.showAdjustPricingWarning && !this.isModal) ? this.onApplyPaymentWarning() :  this.applyCouponPromo()
    }

    onApplyPaymentWarning(){
        this.modalService.destroy();
        this.modalService.create({
        component: CommonBinaryOptionModalComponent,
        inputs: {
            modalText: {
            header: this.translateService.instant('SHARED.GENERAL.LABEL_CONFIRMATION'),
            label:  this.translateService.instant( 'PAYMENT_SUMMARY.SIDE_PANEL.LABEL_EXCHANGE_PAYMENT_CONFIRM_COUPON'),
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
                this.applyCouponPromo();
            }
            }
        },
        });
    }

    async applyCouponPromo() {
        this.clearInput = false;
        let input = {
            OrderHeaderKey: this.orderHeaderKey,
        };
        if ( this.selectedCouponPromo && ! this.appliedCouponPromo.find(coupon => coupon.PromotionId === this.selectedCouponPromo)){
            if (this.selectedCouponPromo) {
                const promotions = {
                    Promotions: {
                        Promotion: [{
                            PromotionId: this.selectedCouponPromo
                        }]
                    }
                };
                input = Object.assign(input, promotions);
            }
            if(this.isDraftOrder){
            this.recordPendingChangesMode = false;
            }
            
            this.entityStoreSvc.dispatchAction(
                AdjustPricingActions.applyRemoveCouponPromo({
                    couponInput: input,
                    recordPendingChangesMode: this.recordPendingChangesMode,
                    showAdjustPricingWarning: this.showAdjustPricingWarning,
                    returnOrderHeaderKey: this.returnOrderHeaderKey
                })
            );
        } else {
                const deniedCoupon = this.appliedCouponPromo.find(coupon => coupon.PromotionId === this.selectedCouponPromo && coupon.PromotionApplied === "N");
            if(!this.selectedCouponPromo){
                this.isCouponInvalid = true;
                this.couponInvalidText = await this._getNls('PAYMENT_SUMMARY.COUPON_ERRORS.SELECT_COUPON');
            } else if(deniedCoupon) {
                this.couponInvalidText = await this._getNls(`PAYMENT_SUMMARY.COUPON_ERRORS.${deniedCoupon.DenialReason}`);
                this.isCouponInvalid = true;
            } else{
                this.couponInvalidText = await this._getNls('PAYMENT_SUMMARY.COUPON_ERRORS.COUPON_ALREADY_APPLIED');
                this.isCouponInvalid = true;
            }
        }
    }

    async onCouponUpdate(responseData) {
        if(responseData) {
            this.responseData = responseData.Order;
            if (responseData.isActionRemove){
                if (this.isSaveAllChargesEnabled) {
                    // skip promo updated as the promotion box in pricing summary is also subscribed to this change and it will
                    // refresh the page
                } else {
                    this.callGetOrderDetails.emit({ responseData: this.responseData, isPromotionApplied: true });
                }
            }
            else{
                if (!isEmpty(this.responseData.Promotions)) {
                    this.appliedCouponPromo = (this.responseData.Promotions.Promotion);
                }
                const appliedCoupon =
                    this.responseData.Promotions.Promotion.find((coupon) => coupon.PromotionId === this.selectedCouponPromo);
                if (appliedCoupon?.PromotionApplied === 'Y') {
                    if (this.isSaveAllChargesEnabled) {
                        this.promoUpdated.emit();
                    } else {
                        this.callGetOrderDetails.emit({ responseData: this.responseData, isPromotionApplied: true });
                    }
                    this.saveChargesEnabled = true;
                    this.isAnyChangeAppliedOnModal = true;
                    this.clearInput = true;
                    this.couponCombobox.clearInput();
                    this.selectedCouponPromo = null;
                    this.applyEnabled = true;
                    this.callSetFlags.emit({
                        saveChargesEnabled: this.saveChargesEnabled, 
                        isAnyChangeAppliedOnModal: this.isAnyChangeAppliedOnModal,
                        numPromotionApplied: this.appliedCouponPromo.length,
                        removePromotionOperation: false
                    });
                } else {
                    this.couponInvalidText = await this._getNls(`PAYMENT_SUMMARY.COUPON_ERRORS.${appliedCoupon.DenialReason}`);
                    this.isCouponInvalid = true;
                }
            }
        }
    }

    private async _getNls(key, params?): Promise<any> {
        return this.translate.get(key, params).toPromise();
    }

    onClose(i?: number, item?) {
        (this.showAdjustPricingWarning && !this.isModal) ? this.onRemovePaymentWarning(i, item) : this.removeCouponPromo(item.PromotionId, i);
    }

    onRemovePaymentWarning(i?: number, item?){
        this.modalService.destroy();
        this.modalService.create({
          component: CommonBinaryOptionModalComponent,
          inputs: {
            modalText: {
              header: this.translateService.instant('SHARED.GENERAL.LABEL_CONFIRMATION'),
              label:  this.translateService.instant( 'PAYMENT_SUMMARY.SIDE_PANEL.LABEL_EXCHANGE_PAYMENT_CONFIRM_COUPON'),
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
                this.removeCouponPromo(item.PromotionId, i);
              }
            }
          },
        });
    }

    async removeCouponPromo(couponId, i) {
        let input = {
            OrderHeaderKey: this.orderHeaderKey,
        };
        const promotions = {
            Promotions: {
                Promotion: [
                    {
                        Action: 'REMOVE',
                        PromotionId: couponId
                    }
                ]
            }
        };
        input = Object.assign(input, promotions);
        
        this.entityStoreSvc.dispatchAction(
            AdjustPricingActions.applyRemoveCouponPromo({
                couponInput: input,
                isActionRemove:true,
                recordPendingChangesMode: this.recordPendingChangesMode,
                showAdjustPricingWarning: this.showAdjustPricingWarning,
                returnOrderHeaderKey: this.returnOrderHeaderKey
            })
        );
    
        let arr = (cloneDeep(this.appliedCouponPromo))
        arr.splice(i,1)
        this.appliedCouponPromo = arr;
        this.saveChargesEnabled = true;
        this.isAnyChangeAppliedOnModal = true;
        this.clearInput = true;
        this.couponCombobox.clearInput();
        this.selectedCouponPromo = null;
        this.callSetFlags.emit({
            saveChargesEnabled: this.saveChargesEnabled, 
            isAnyChangeAppliedOnModal: this.isAnyChangeAppliedOnModal,
            numPromotionApplied: this.appliedCouponPromo.length,
            removePromotionOperation: true
        });
    }

    ngOnDestroy(): void {
         this.subscriptions.forEach((s) => s.unsubscribe());
    }
}
