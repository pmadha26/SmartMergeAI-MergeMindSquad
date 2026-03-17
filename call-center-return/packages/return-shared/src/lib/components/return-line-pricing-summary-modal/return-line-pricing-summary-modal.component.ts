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

import { Component, Inject, OnInit } from '@angular/core';
import { BucBaseUtil, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { BaseModal } from 'carbon-components-angular';
import { EntityStoreService } from '../../state/entities/entity-store.service';
import * as AdjustPricingActions from '../../state/adjust-pricing/adjust-pricing.actions';
import { SharedExtensionConstants } from '../../shared-extension.constants';

@Component({
  selector: 'call-center-line-pricing-summary-modal',
  templateUrl: './return-line-pricing-summary-modal.component.html',
  styleUrls: ['./return-line-pricing-summary-modal.component.scss']
})
export class ReturnLinePricingSummaryModalComponent extends BaseModal implements OnInit {
  EXTENSION = {
    TOP: SharedExtensionConstants.RETURN_LINE_PRICING_SUMMARY_MODAL_RS_TOP,
    BOTTOM: SharedExtensionConstants.RETURN_LINE_PRICING_SUMMARY_MODAL_RS_BOTTOM
  };

  constructor(
    @Inject('modalData') public modalData,
    public entityStoreSvc: EntityStoreService
  ) {
    super();
  }
  componentId = 'return-line-pricing-summary';
  returnLineDetails: any;
  summaryInfo = {
    shippingChargesList: [],
    headerAdjustmentList: [],
    promotionList: []
  };;
  ruleSetValues = [];
  promotionAmountTotal = 0.0;
  headerAmount: any;
  currency: any;
  lineTaxes: any;
  itemDesc: any;
  orderCurrency: '';
  ADJUST_PRICING_RETURN_LINE_RESOURCE_ID;
  showAdjustPricing : boolean;
  isAdjustPricingResourceAllowed : boolean;
  adjustPricingMode : 'VIEW' | 'EDIT' = 'EDIT';
  ngOnInit(): void {
    this.initialize();
  }

  async initialize() {
    if (this.modalData) {
      this.returnLineDetails = this.modalData.returnLineDetails;
      this.ruleSetValues = this.modalData.ruleSetValues;
      this.currency = this.returnLineDetails.Currency || this.returnLineDetails.Order[0].PriceInfo.Currency;
      if (this.returnLineDetails.LineOverallTotals.Tax !== 0) {
        this.lineTaxes = this.returnLineDetails?.LineTaxes?.LineTax;
      }
      this.showAdjustPricing = !BucBaseUtil.isVoid(this.modalData.showAdjustPricing) ? this.modalData.showAdjustPricing : true;
      this.adjustPricingMode = this.modalData.adjustPricingMode || 'EDIT';
      this.ADJUST_PRICING_RETURN_LINE_RESOURCE_ID = this.modalData.summaryDetails.isDraft ? 'ICC000075' : 'ICC000096';
      this.isAdjustPricingResourceAllowed = BucSvcAngularStaticAppInfoFacadeUtil.canUserAccessResource(this.ADJUST_PRICING_RETURN_LINE_RESOURCE_ID) && this.adjustPricingMode === 'EDIT' ;
      this.calcultePricingSummaryInfo();
      this.itemDesc = this.alignTitle(this.returnLineDetails?.ItemDetails?.PrimaryInformation?.ExtendedDisplayDescription);
    }
  }


  openAdjustPricingModal() {
    this.entityStoreSvc.dispatchAction(
      AdjustPricingActions.openAdjustPricingModal({
        AdjustPricing: {
          modalText: '',
          modalData: {
            summaryDetails: this.modalData.summaryDetails.rawData,
            skipModificationPermissionCheck: true,
            size: 'lg',
            component: this.componentId,
            lineDetails: {line:this.returnLineDetails},
            isLineLevel: true,
            refreshActions: this.modalData.refreshActions,
            isAdjustPricingResourceAllowed: this.isAdjustPricingResourceAllowed,
          }
        }
      })
    );
  }

  alignTitle(title: string): any {
    return title.split('(').join('<div class="padding-top--0_25rem" >(');
  }
  calcultePricingSummaryInfo() {
    this.summaryInfo = this.getReturnPricingSummaryDetails(this.returnLineDetails);
    if (this.summaryInfo?.promotionList.length > 0) {
      this.promotionAmountTotal = this.summaryInfo?.promotionList
      .map(charge => charge.IsDiscount ? { ...charge, ChargeAmount : - Math.abs(charge.ChargeAmount) } : charge)
      .reduce((a, b) => a + Number(b.ChargeAmount), 0.00);
    } else {
      this.promotionAmountTotal = 0;
    }
    this.headerAmount = Number(this.returnLineDetails.LineOverallTotals?.Charges) - Number(this.returnLineDetails.LineOverallTotals?.Discount) -
      Number(this.returnLineDetails.LineOverallTotals.ShippingTotal) - this.promotionAmountTotal;
  }

  getReturnPricingSummaryDetails(returnSummary: any) {
    let charges = [];
    charges = returnSummary?.LineCharges?.LineCharge ? returnSummary.LineCharges.LineCharge : returnSummary?.LineOverallTotals?.LineCharges?.LineCharge;
    charges?.forEach(charge => {
      if (charge.ChargeAmount > 0) {
        if (charge.IsShippingCharge === 'Y' || this.ruleSetValues.includes(charge.ChargeCategory)) {
          this.summaryInfo.shippingChargesList.push(charge);
        } else if (charge.IsManual === 'N') {
          this.summaryInfo.promotionList.push(charge);
        } else {
          this.summaryInfo.headerAdjustmentList.push(charge);
        }
      }
    });
    return this.summaryInfo;
  }

  isOrderCancelled() {
    return (this.returnLineDetails?.MaxLineStatus?.indexOf('9000') > -1);
  }

  onCloseModalClick() {
    this.closeModal();
  }
}
