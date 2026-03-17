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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChange, SimpleChanges } from '@angular/core';
import { Action } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { Constants } from '../../common/return.constants';
import { Modification, OverallTotals, Return } from '../../state/types/return.interface';
import { BucBaseUtil, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import * as AdjustPricingActions from '../../state/adjust-pricing/adjust-pricing.actions';
import { EntityStoreService } from '../../state/entities/entity-store.service';
import { skipWhile } from 'rxjs/operators';
import { ExchangeOrder } from '../../state/types/order.interface';
import { SharedExtensionConstants } from '../../shared-extension.constants';

@Component({
  selector: 'call-center-return-pricing-summary:not([extn])',
  templateUrl: './return-pricing-summary.component.html',
  styleUrls: ['./return-pricing-summary.component.scss']
})
export class ReturnPricingSummaryComponent implements OnInit, OnChanges {
  EXTENSION = {
      TOP: SharedExtensionConstants.RETURN_PRICING_SUMMARY_RS_TOP,
      BOTTOM: SharedExtensionConstants.RETURN_PRICING_SUMMARY_RS_BOTTOM
  };

  public readonly componentId = 'ReturnPricingSummaryComponent';
  @Input() returnDetails: Return;
  @Input() ruleSetValues = [];
  @Input() showAdjustPricing = true;
  @Input() refreshActions = [];
  @Input() adjustPricingMode : 'VIEW' | 'EDIT' = 'EDIT';
  @Input() showAdjustPricingWarning = false
  @Input() isRefund

  @Output() afterPricingChange: EventEmitter<any> = new EventEmitter();
  headerAmount: number;
  promotionAmountTotal: number;
  enableAdjustPricingLink = false;
  appliedCouponPromos = [];
  allowedModifications: Modification[];
  pricingSummaryDetails = {
    shippingChargesList: [],
    headerAdjustmentList: [],
    promotionList: []
  };
  overallTotals: OverallTotals;
  overallTotalsExchange:  OverallTotals;
  currencyCode: string;
  showPricing = true;
  headerTaxes=  [];
  returnLinesCount = 0;
  isAdjustPricingResourceAllowed;
  ADJUST_PRICING_RETURN_RESOURCE_ID;
  totalPlannedRefundAmount: any;
  totalAmountRefunded: any;
  remainingRefundAmount: any;
  showRefundDetails: boolean;
  exchangeOrder: ExchangeOrder;
  pricingSummaryDetailsExchange: { shippingChargesList: any[]; headerAdjustmentList: any[]; promotionList: any[]; headerTaxes: any[] };
  promotionAmountTotalExchange: any;
  headerAmountExchange: number;
  ctxReturn: any;
  ctxExchange: any;
  isAdjustPricingExchangeResourceAllowed: any;
  isCancelled: boolean;

  constructor(
    private translateService: TranslateService,
    private entityStoreSvc: EntityStoreService
  ) {}

  ngOnInit(): void {
    this.initialize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const returnEntityChange: SimpleChange = changes.returnDetails;
    if (returnEntityChange && !returnEntityChange.isFirstChange()) {
      if ( returnEntityChange.currentValue === undefined) {
        this.reset();
      } else {
        this.initialize();
      }
    }

    if(changes.ruleSetValues?.currentValue !== changes.ruleSetValues?.previousValue ) {
      this.initialize();
    }

  }

  initialize() {
    this.initializeSubscriptions()
    this.allowedModifications = this.returnDetails.allowedModifications;
    this.overallTotals = this.returnDetails.overallTotals;
    this.currencyCode = this.returnDetails.returnTotal?.currencyCode;
    this.calculateSummaryCharges();
    this.returnLinesCount = this.returnDetails.totalNumberOfLines.valueOf();
    this.showRefundDetails = false //TODO: refunded amount when the price is adjusted for a created return in incorrect, hence hiding it for now.
    this.calculateRefundDetails();
    this.ADJUST_PRICING_RETURN_RESOURCE_ID = this.returnDetails.isDraft ? 'ICC000074' : 'ICC000095';
    this.isAdjustPricingResourceAllowed = BucSvcAngularStaticAppInfoFacadeUtil.canUserAccessResource(this.ADJUST_PRICING_RETURN_RESOURCE_ID) && this.adjustPricingMode === 'EDIT';
    this.isAdjustPricingExchangeResourceAllowed = this.returnDetails.isDraft ? BucSvcAngularStaticAppInfoFacadeUtil.canUserAccessResource('ICC000003') && this.adjustPricingMode === 'EDIT' : false;
    this.isCancelled = this.isReturnCancelled();
  }

  isReturnCancelled() {
    return this.returnDetails?.maxStatus?.indexOf('9000') > -1;
  }

  initializeSubscriptions() {
    this.entityStoreSvc.getEntityById(this.returnDetails.exchangeOrder.orderHeaderKey, Constants.ENTITY_TYPE_EXCHANGE_ORDER)
    .pipe(skipWhile(BucBaseUtil.isVoid))
    .subscribe(exchange => {
      this.exchangeOrder = exchange 
      this.overallTotalsExchange = this.exchangeOrder?.overallTotals
      this.appliedCouponPromos = this.exchangeOrder.rawData.Promotions?.Promotion || [];
      this.initializeExchangeAccordianContext()
    })
  }

  reset() {
    this.overallTotals = {
      lineSubTotal: '0.00',
      grandShippingTotal: '0',
      grandTax: '0.00',
      grandTotal: '0.00',
      grandShippingCharges: '0.00',
    } as OverallTotals;
    this.allowedModifications = [];
    this.returnLinesCount = 0.00;
    this.pricingSummaryDetails = {
      shippingChargesList: [],
      headerAdjustmentList: [],
      promotionList: []
    };
    this.headerTaxes = [];
    this.headerAmount = 0.00;
  }

  refreshAfterPromotionApplied() {
    if (this.refreshActions.length > 0 && !this.showAdjustPricingWarning) {
      this.refreshActions.forEach(a => this.entityStoreSvc.getStore().dispatch(a))
    }
  }

  openAdjustPricingModal() {
    this.entityStoreSvc.dispatchAction(
      AdjustPricingActions.openAdjustPricingModal({
        AdjustPricing: {
          modalText: '',
          modalData: {
            summaryDetails: this.returnDetails.rawData,
            skipModificationPermissionCheck: this.returnDetails.isDraft,
            size: 'lg',
            component: this.componentId,
            refreshActions: this.refreshActions,
            isAdjustPricingResourceAllowed: this.isAdjustPricingResourceAllowed,
            showAdjustPricingWarning: this.showAdjustPricingWarning,
            isRefund: this.isRefund
          }
        }
      })
    );
  }

  private getReturnPricingSummaryDetails(returnSummary: any){
    const pricingSummaryDetails = {
      shippingChargesList: [],
      headerAdjustmentList: [],
      promotionList: [],
      headerTaxes: []
    };
    returnSummary.headerCharges.forEach(charge => {
      if (Number.parseFloat(charge.chargeAmount) > 0) {
        if (charge.isShippingCharge || this.ruleSetValues.includes(charge.chargeCategory)) {
          pricingSummaryDetails.shippingChargesList.push(charge);
        } else if (!charge.isManual) {
          pricingSummaryDetails.promotionList.push(charge);
        } else {
          pricingSummaryDetails.headerAdjustmentList.push(charge);
        }
      }
    });
    return pricingSummaryDetails;
  }

  private calculateSummaryCharges() {
    this.headerTaxes = [];
    this.pricingSummaryDetails = this.getReturnPricingSummaryDetails(this.returnDetails);
    this.promotionAmountTotal = this.calculatePromotionAmountTotal(this.pricingSummaryDetails);
    this.headerAmount = this.calculateHeaderAmount(this.overallTotals, this.promotionAmountTotal);
    this.initializeAccordianContext()

    //overall line adjustments
    const hearderCharges= this.pricingSummaryDetails.headerAdjustmentList
      .map(hdrAdj => hdrAdj.isDiscount ? { ...hdrAdj, chargeAmount : -Math.abs(hdrAdj.chargeAmount) } : hdrAdj)
      .reduce((a,b) => a + Number(b.chargeAmount) , 0.00);

    if ((this.headerAmount - hearderCharges) !== 0){
      const overallLineCharge = {
        chargeNameDetails : this.translateService.instant('PAYMENT_SUMMARY.SIDE_PANEL.LABEL_RETURN_LINE_ADJUSTMENTS'),
        isOrderlineAdjustments: true,
        chargeAmount: this.headerAmount - hearderCharges
      }
      this.pricingSummaryDetails.headerAdjustmentList.push(overallLineCharge);
    }

    if (!BucBaseUtil.isVoid(this.overallTotals)) {
      const chargeAmount =  Number(this.overallTotals.grandShippingTotal) - Number(this.overallTotals.hdrShippingTotal);
      if ( chargeAmount !== 0 ) {
        // overall line shipments
        const overallLineShipments = {
          chargeNameDetails: this.translateService.instant('PAYMENT_SUMMARY.SIDE_PANEL.LABEL_RETURN_LINE_SHIPPING_CHARGES'),
          chargeAmount
        }
        this.pricingSummaryDetails.shippingChargesList.push(overallLineShipments);
      }

      if (this.returnDetails.headerTaxes?.length > 0) {
        this.headerTaxes = [ ... this.returnDetails.headerTaxes ];
      }

      const tax = (Number(this.overallTotals.grandTax) - Number(this.overallTotals.hdrTax));
      if ( tax !== 0 ){
        const overallLineTaxes = {
          taxName :this.translateService.instant('PAYMENT_SUMMARY.SIDE_PANEL.LABEL_RETURN_LINE_TAXES'),
          tax
        }
        this.headerTaxes.push(overallLineTaxes);
      }
    }
  }
  
  initializeAccordianContext() {
    this.ctxReturn = {data: {
      type:"RETURN",
      pricingSummaryDetails: this.pricingSummaryDetails,
      promotionAmountTotal: this.promotionAmountTotal,
      headerAmount: this.headerAmount
    }}
  }
  initializeExchangeAccordianContext() {
    if(this.exchangeOrder) {
      this.pricingSummaryDetailsExchange = this.getReturnPricingSummaryDetails(this.exchangeOrder);
      this.promotionAmountTotalExchange = this.calculatePromotionAmountTotal(this.pricingSummaryDetailsExchange);
      this.headerAmountExchange = this.calculateHeaderAmount(this.exchangeOrder.overallTotals, this.promotionAmountTotalExchange);
    }
    this.ctxExchange = {data: {
      type:"EXCHANGE",
      totalExchangeLines: Number(this.exchangeOrder.totalNumberOfLines),
      pricingSummaryDetails: this.pricingSummaryDetailsExchange,
      promotionAmountTotal: this.promotionAmountTotalExchange,
      headerAmount: this.headerAmountExchange
    }}


    //overall line adjustments
    const hearderCharges= this.pricingSummaryDetailsExchange.headerAdjustmentList
      .map(hdrAdj => hdrAdj.isDiscount ? { ...hdrAdj, chargeAmount : -Math.abs(hdrAdj.chargeAmount) } : hdrAdj)
      .reduce((a,b) => a + Number(b.chargeAmount) , 0.00);

    if ((this.headerAmountExchange - hearderCharges) !== 0){
      const overallLineCharge = {
        chargeNameDetails : this.translateService.instant('PAYMENT_SUMMARY.SIDE_PANEL.LABEL_EXCHANGE_LINE_ADJUSTMENTS'),
        isOrderlineAdjustments: true,
        chargeAmount: this.headerAmountExchange - hearderCharges
      }
      this.pricingSummaryDetailsExchange.headerAdjustmentList.push(overallLineCharge);
    }

    if (!BucBaseUtil.isVoid(this.exchangeOrder.overallTotals)) {
      const chargeAmount =  Number(this.exchangeOrder.overallTotals.grandShippingTotal) - Number(this.exchangeOrder.overallTotals.hdrShippingTotal);
      if ( chargeAmount !== 0 ) {
        // overall line shipments
        const overallLineShipments = {
          chargeNameDetails: this.translateService.instant('PAYMENT_SUMMARY.SIDE_PANEL.LABEL_EXCHANGE_LINE_SHIPPING_CHARGES'),
          chargeAmount
        }
        this.pricingSummaryDetailsExchange.shippingChargesList.push(overallLineShipments);
      }

      if (this.exchangeOrder.headerTaxes?.length> 0) {
        this.pricingSummaryDetailsExchange.headerTaxes = [ ... this.exchangeOrder.headerTaxes ];
      }

      const tax = (Number(this.exchangeOrder.overallTotals.grandTax) - Number(this.exchangeOrder.overallTotals.hdrTax));
      if ( tax !== 0 ){
        const overallLineTaxes = {
          taxName :this.translateService.instant('PAYMENT_SUMMARY.SIDE_PANEL.LABEL_EXCHANGE_LINE_TAXES'),
          tax
        }
        this.pricingSummaryDetailsExchange.headerTaxes.push(overallLineTaxes);
      }
    }
  }

  private calculatePromotionAmountTotal(pricingSummary: any) {
    if (pricingSummary.promotionList.length > 0) {
      return pricingSummary.promotionList
      .map(charge => charge.isDiscount ? { ...charge, chargeAmount : - Math.abs(charge.chargeAmount) } : charge)
      .reduce((a, b) => a + Number(b.chargeAmount), 0.00);
    } else {
      return 0;
    }
  }

  private calculateHeaderAmount(overallTotals, promotionAmountTotal) {
    let grandChargesWithoutShipping;
    if (!overallTotals.grandAdjustmentsWithoutTotalShipping) {
      grandChargesWithoutShipping =
        Number(overallTotals.grandCharges) -
        Number(overallTotals.grandDiscount) -
        Number(overallTotals.grandShippingTotal);
    } else {
      grandChargesWithoutShipping = overallTotals.grandAdjustmentsWithoutTotalShipping;
    }
    const hdrChargesWithoutShipping = Number(grandChargesWithoutShipping);
    return parseFloat((hdrChargesWithoutShipping - promotionAmountTotal).toFixed(2))
  }

  private calculateRefundDetails() {
    if (this.showRefundDetails) {
      this.totalPlannedRefundAmount = this.returnDetails.overallTotals.grandRefundTotal || '0';
      this.totalAmountRefunded = this.returnDetails.overallTotals.refundedAmount || '0';
      this.remainingRefundAmount = this.returnDetails.overallTotals.pendingRefundAmount || '0';
    }
  }

  openAdjustExchangePricingModal() {
    this.entityStoreSvc.dispatchAction(
      AdjustPricingActions.openAdjustPricingModal({
        AdjustPricing: {
          modalText: '',
          modalData: {
            summaryDetails: this.exchangeOrder.rawData,
            skipModificationPermissionCheck: true,
            size: 'lg',
            component: this.componentId,
            refreshActions: this.refreshActions,
            isAdjustPricingResourceAllowed: this.isAdjustPricingExchangeResourceAllowed,
            isExchange: true,
            showAdjustPricingWarning: this.showAdjustPricingWarning,
            returnOrderHeaderKey: this.returnDetails.id
          }
        }
      })
    );
  }
}
