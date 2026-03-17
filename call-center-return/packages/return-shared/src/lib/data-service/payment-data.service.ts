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

import { Injectable } from '@angular/core';
import {
  BucCommOmsMashupService, BucSvcAngularStaticAppInfoFacadeUtil,
} from '@buc/svc-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CustomerPaymentMethod, Return } from '../state/types/return.interface';
import { getArray } from '@buc/common-components';
import { get } from 'lodash';
import { Constants } from '../common/return.constants';
import { ExchangeOrder } from '../state/types/order.interface';

@Injectable()
export class PaymentDataService {
  constructor(private bucCommOmsMashupService: BucCommOmsMashupService) {}

  public calculatePendingRefundAmount(returnDetails: Return, exchangeOrder: ExchangeOrder) {
    let fundsRequiredOnOrder = parseFloat(returnDetails.returnTotal.value);
    if (exchangeOrder?.id) {
      fundsRequiredOnOrder = parseFloat(returnDetails.overallTotals.grandRefundTotal);
      if (exchangeOrder.exchangeType === 'ADVANCED_PP') {
        fundsRequiredOnOrder = parseFloat(returnDetails.returnTotal.value);
      }
    }
    const totalEnteredAmount = getArray(returnDetails.paymentMethods)
      .map((pm) => parseFloat(pm.RequestedAmount))
      .filter((a) => !Number.isNaN(a))
      .reduce((a, b) => a + b, 0);
    return (fundsRequiredOnOrder - totalEnteredAmount).toFixed(2);
  }

  public calculatePendingChargeAmount(exchangeOrder: ExchangeOrder, useAuthAmount? : boolean) {
    let fundsRequiredOnOrder;
    if(useAuthAmount) {
      fundsRequiredOnOrder =  parseFloat(exchangeOrder.chargeTransactionDetails.RemainingAmountToAuth)
      if (exchangeOrder.exchangeType === 'ADVANCED_PP') {
        fundsRequiredOnOrder = Number(exchangeOrder.overallTotals.grandTotal);
      }
    } else {
      fundsRequiredOnOrder = parseFloat(exchangeOrder.chargeTransactionDetails.FundsRequiredOnOrder);
    }
    const paymentMethods = getArray(exchangeOrder.paymentMethods);
    const totalEnteredAmount = getArray(paymentMethods)
      .map((pm) => parseFloat(pm.MaxChargeLimit))
      .filter((a) => !Number.isNaN(a))
      .reduce((a, b) => a + b, 0);
    return (fundsRequiredOnOrder - totalEnteredAmount).toFixed(2);
  }

  public getCustomerPaymentMethodsAndPaymentTypes(
    customerPayment,
    paymentTypes,
    isExchange,
    returnHeaderKey?, 
    exchangeHeaderKey?
  ): Observable<{ customerPaymentMethods: any; isExchange: boolean, paymentTypes: any }> {
    const mashupArray = [];
    mashupArray.push({
      mashupId: Constants.MASHUP_ID_GET_CUSTOMER_PAYMENT_METHOD_LIST,
      mashupInput: customerPayment,
    });
    mashupArray.push({
      mashupId: Constants.MASHUP_ID_GET_PAYMENT_TYPE_LIST,
      mashupInput: paymentTypes,
    });
    return this.bucCommOmsMashupService.callMashups(mashupArray, {}).pipe(
      map((apiResponse) => ({
        customerPaymentMethods: this.bucCommOmsMashupService.getMashupOutput(
          apiResponse,
          Constants.MASHUP_ID_GET_CUSTOMER_PAYMENT_METHOD_LIST
        ),
        isExchange,
        returnOrderHeaderKey: returnHeaderKey,
        exchangeOrderHeaderKey: exchangeHeaderKey,
        paymentTypes: this.bucCommOmsMashupService.getMashupOutput(
          apiResponse,
          Constants.MASHUP_ID_GET_PAYMENT_TYPE_LIST
        ),
      }))
    );
  }

  public processCapturePaymentResponse(mashupResponse: any): any {
    const order = this.bucCommOmsMashupService.getMashupOutput(
      mashupResponse,
      Constants.MASHUP_ID_CAPTURE_REFUND_PAYMENT
    );
    const chargeTransactionDetails = getArray(
      get(order, 'Order.ChargeTransactionDetails.ChargeTransactionDetail')
    );
    const errors = chargeTransactionDetails.filter(
      (ctd) =>
        getArray(
          get(ctd, 'PaymentTransactionErrorList.PaymentTransactionError')
        ).length > 0
    );
    return errors.length > 0
      ? { errors }
      : {
          paymentMethods: getArray(
            get(order, 'Order.PaymentMethods.PaymentMethod')
          ),
        };
  }

  public getMashupOutput(apiOutput: any, mashupId: string) {
    return this.bucCommOmsMashupService.getMashupOutput(apiOutput, mashupId);
  }

  public getCustomPaymentType(paymentType: string) {
    const paymentTypes = getArray(get(BucSvcAngularStaticAppInfoFacadeUtil.getProductMeta(), 'bootstrapConfig.paymentTypes'));
    return paymentTypes.find(p => p.id === paymentType);
  }

  public getDisplayPrimaryAccountNo(pm: CustomerPaymentMethod): any {
    return pm.DisplayPrimaryAccountNo || pm.DisplayCustomerAccountNo
      || pm.DisplayPaymentReference1 || pm.DisplayCreditCardNo || pm.DisplayDebitCardNo || pm.DisplaySvcNo;
  }
}
