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

import { get } from 'lodash';
import { Constants } from '../common/return.constants';
import {
  MashupMapperResponse,
  MashupMapperResponseChain,
  MashupResponseMapper,
} from '../state/mashup/mashup-rsp-processor.service';
import { PaymentDetails } from '../state/types/return.interface';

export class PaymentOrderMapper implements MashupResponseMapper {

  mapResponse(
    mashupResponse: Record<string, any> | Record<string, any>[],
    mashupMapperChain: MashupMapperResponseChain
  ): MashupMapperResponse {
    const mapperResponse: MashupMapperResponse = {
      entities: [],
      actions: [],
    };
    if (Array.isArray(mashupResponse)) {
      mapperResponse.entities.push(...mashupResponse.map(mr => this.mapPaymentOrder(mr.response.Order)));
    }
    return mapperResponse;
  }


  public mapPaymentOrder(order: any): PaymentDetails {
    return {
      entity_type: Constants.ENTITY_TYPE_RETURN_PAYMENT_SUMMARY,
      id: order.OrderHeaderKey,
      enterpriseCode: order.EnterpriseCode,
      processedOrder: order.ProcessedOrder === 'Y',
      rawData: order,
      paymentStatus: order.PaymentStatus,
      bookAmount: order.OpenBookAmount,
      paymentStatusDescription: order.PaymentStatusDescription,
      currencyCode: order.PriceInfo.Currency,
      personInfoBillTo: order.PersonInfoBillTo,
      processPaymentOnReturnOrder: get(order, 'ProcessPaymentOnReturnOrder', 'Y') === 'Y',
      paymentMethods: order.PaymentMethods?.PaymentMethod?.map(paymentMethod => ({...paymentMethod})) || [],
      chargeTransactionDetails: this._mapChargeTransactionDetails(order),
      chargeDetails: this._mapChargeDetails(order),
      transferToDetails: {
        collectionDate: get(order, 'TransferToDetails.ChargeTransactionDetail.CollectionDate', ''),
        distributedAmount: get(order, 'TransferToDetails.ChargeTransactionDetail.DistributedAmount', ''),
        pendingAmount: Math.abs(get(order, 'TransferToDetails.ChargeTransactionDetail.RequestAmount', '')),
        orderNo: get(order, 'TransferToDetails.ChargeTransactionDetail.TransferToOrder.OrderNo', ''),
        orderHeaderKey: get(order, 'TransferToDetails.ChargeTransactionDetail.TransferToOrder.OrderHeaderKey', ''),
        exchangeType: get(order, 'TransferToDetails.ChargeTransactionDetail.TransferToOrder.ExchangeType', ''),
      },
      totalNumberOfLines: order.OrderLines?.TotalNumberOfRecords,
      originalOrderNo: get(order, 'OrderLines.OrderLine[0].DerivedFromOrder.OrderNo'),
      originalOrderHeaderKey: get(order, 'OrderLines.OrderLine[0].DerivedFromOrderHeaderKey'),
      originalOrderDate: get(order, 'OrderLines.OrderLine[0].DerivedFromOrder.OrderDate'),
      originalOrderTotal: get(order, 'OrderLines.OrderLine[0].DerivedFromOrder.OverallTotals.GrandTotal'),
    };
  }

  private _mapChargeDetails(order) {
    const chargeDetails = order.ChargeDetails;
    if (chargeDetails.ChargeTransactionDetail && !Array.isArray(chargeDetails.ChargeTransactionDetail)) {
      return { ChargeTransactionDetail: [chargeDetails.ChargeTransactionDetail] }
    } else {
      return chargeDetails;
    }
  }

  private _mapChargeTransactionDetails(order) {
    const chargeTransactionDetails = order.ChargeTransactionDetails;
    if (chargeTransactionDetails && chargeTransactionDetails.ChargeTransactionDetail) {
      return chargeTransactionDetails;
    } else if (chargeTransactionDetails) {
      return { ChargeTransactionDetail: [chargeTransactionDetails]};
    }
  }
}
