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

import { get, map } from 'lodash';
import { Constants } from '../common/return.constants';
import {
  MashupMapperResponse,
  MashupMapperResponseChain,
  MashupResponseMapper,
} from '../state/mashup/mashup-rsp-processor.service';
import { Return, AlertCount, TransactionViolation, OverallTotals } from '../state/types/return.interface';
import { NoteMapper } from './note.mapper';
import { OrderMapper } from './order.mapper';
import { ExchangeOrder, Order } from '../state/types/order.interface';
import { BucBaseUtil } from '@buc/svc-angular';
import { Entity } from '../state/types/base-types';
import { getArray } from '@buc/common-components';
import { ExchangeOrderMapper } from './exchange-order.mapper';

export class ReturnOrderMapper implements MashupResponseMapper {

  constructor(
    private mapExchanges = false,
    private exchangeOrderMapper: ExchangeOrderMapper = new ExchangeOrderMapper(),
    private noteMapper: NoteMapper = new NoteMapper()
  ){ }

  private readonly EXCHANGE_ORDER_PATH = 'ExchangeOrders.ExchangeOrder';
  private readonly NOTES_PATH = 'Notes.Note';

  mapResponse(
    mashupResponse: Record<string, any> | Record<string, any>[],
    mashupMapperChain: MashupMapperResponseChain
  ): MashupMapperResponse {
    const mapperResponse: MashupMapperResponse = {
      entities: [],
      actions: [],
    };
    if (Array.isArray(mashupResponse)) {
      mashupResponse.forEach(mr => {
        // map different entities according to the mashup
        if (mr.input.mashupId == Constants.MASHUP_ID_GET_ALERT_LIST) {
          this.mapAlertCount({...mr.response.Page, OrderHeaderKey: mashupMapperChain.options?.returnId}, mapperResponse.entities);
        } else {
          this.mapReturnOrder(mr.response.Order, mapperResponse.entities)
        }
      });
    }
    return mapperResponse;
  }

  public mapAlertCount(page: any, entities: Entity[]) {
    const entity = {
      entity_type: Constants.ENTITY_TYPE_ALERT_ACOUNT,
      id: page.OrderHeaderKey,
      alertCount: page.Output.InboxList.TotalNumberOfRecords
    } as AlertCount;
    entities.push(entity);
  }

  public mapReturnOrder(Order: any, entities: Entity[]) {
    const returnEntity = this.mapReturn(Order);

    const exchangeOrders = get(Order, this.EXCHANGE_ORDER_PATH, []);
    exchangeOrders.forEach(eo => {
      // map notes at exchange order level
      const exchangeNotes = get(eo, this.NOTES_PATH, []);
      exchangeNotes.forEach(exchangeNote => entities.push(this.noteMapper.mapNote(exchangeNote, "EXCHANGE")));
      if (this.mapExchanges) {
        entities.push(this._mapExchangeOrder(eo))
      }
    });

    const notes = get(Order, this.NOTES_PATH, []);
    notes.forEach(note => entities.push(this.noteMapper.mapNote(note)));

    entities.push(returnEntity);
  }

  public mapReturn(order: Record<string, any>): Return {
    return {
      entity_type: Constants.ENTITY_TYPE_RETURN,
      id: order.OrderHeaderKey,
      rawData: order,
      returnNo: order.OrderNo,
      channel: order.EntryType,
      status: order.Status,
      maxStatus: order.MaxOrderStatus,
      name: order.OrderName,
      sellerOrganizationCode: order.SellerOrganizationCode,
      processPaymentOnReturnOrder: get(order, 'ProcessPaymentOnReturnOrder', 'Y') === 'Y',
      shipToId: order.ShipToKey,
      customerFirstName: order.CustomerFirstName,
      customerLastName: order.CustomerLastName,
      customerPhoneNo: order.CustomerPhoneNo,
      customerId: order.CustomerContactID,
      customerEmailId: order.CustomerEMailID,
      customerZipCode: order.CustomerZipCode,
      customerName: order.CustomerFirstName && order.CustomerLastName ?
      order.CustomerFirstName + ' ' + order.CustomerLastName : order.BillToID,
      personInfoBillTo: order.PersonInfoBillTo,
      personInfoShipTo: order.PersonInfoShipTo,
      documentType: order.DocumentType,
      enterpriseCode: order.EnterpriseCode,
      enterpriseName: order.EnterpriseName,
      isHistory: order.isHistory === 'Y',
      isDraft: order.DraftOrderFlag === 'Y',
      holdFlag: order.HoldFlag === 'Y',
      returnDate: order.OrderDate,
      billToId: order.BillToID,
      paymentStatus: order.PaymentStatus,
      paymentStatusDescription: order.PaymentStatusDescription,
      returnTotal: {
        currencyCode: order.PriceInfo.Currency,
        value: order.PriceInfo.TotalAmount
      },
      totalNumberOfLines: order.OrderLines?.TotalNumberOfRecords,
      originalOrderNo: get(order, 'OrderLines.OrderLine[0].DerivedFromOrder.OrderNo'),
      originalOrderHeaderKey: get(order, 'OrderLines.OrderLine[0].DerivedFromOrderHeaderKey'),
      originalOrderDate: get(order, 'OrderLines.OrderLine[0].DerivedFromOrder.OrderDate'),
      originalOrderTotal: get(order, 'OrderLines.OrderLine[0].DerivedFromOrder.OverallTotals.GrandTotal'),
      lines: [],
      remainingRefundAmount: {
        currencyCode: order.PriceInfo.Currency,
        value: order.OverallTotals?.PendingRefundAmount
      },
      awards: order.Awards?.Award?.map(award=> ({
        amount: award.AwardAmount,
        applied: award.AwardApplied === 'Y',
        id: award.AwardId,
        key: award.AwardKey,
        quantity: award.AwardQuantity,
        type: award.AwardType,
        chargeCategory: award.ChargeCategory,
        chargeName: award.ChargeName,
        denialReason: award.DenialReason,
        description: award.Description,
        isFreeGiftAward: award.IsFreeGiftAward,
        promotionId: award.PromotionId,
        promotionKey: award.PromotionKey,
      })) || [],
      promotions: order.Promotions?.Promotion?.map(promotion => ({
        key: promotion.PromotionKey,
        type: promotion.PromotionType,
        id: promotion.PromotionId,
        amount: promotion.PromotionAmount,
        applied: promotion.PromotionApplied === 'Y',
        denialReason: promotion.DenialReason,
        description: promotion.description
      })) || [],
      // TODO: restructure and move it under pricing / return summary entities
      overallTotals: (!BucBaseUtil.isVoid(order.OverallTotals) ? {
        grandExchangeTotal: order.OverallTotals.GrandExchangeTotal,
        grandRefundTotal: order.OverallTotals.GrandRefundTotal,
        pendingRefundAmount: order.OverallTotals.PendingRefundAmount,
        refundedAmount: order.OverallTotals.RefundedAmount,
        additionalLinePriceTotal: order.OverallTotals.AdditionalLinePriceTotal,
        grandAdjustmentsWithoutTotalShipping: order.OverallTotals.GrandAdjustmentsWithoutTotalShipping,
        grandCharges: order.OverallTotals.GrandCharges,
        grandDiscount: order.OverallTotals.GrandDiscount,
        grandShippingBaseCharge: order.OverallTotals.GrandShippingBaseCharge,
        grandShippingCharges: order.OverallTotals.GrandShippingCharges,
        grandShippingDiscount: order.OverallTotals.GrandShippingDiscount,
        grandShippingTotal: order.OverallTotals.GrandShippingTotal,
        grandTax: order.OverallTotals.GrandTax,
        grandTotal: order.OverallTotals.GrandTotal,
        hdrShippingBaseCharge: order.OverallTotals.HdrShippingBaseCharge,
        hdrShippingCharges: order.OverallTotals.HdrShippingCharges,
        hdrShippingDiscount: order.OverallTotals.HdrShippingDiscount,
        hdrShippingTotal: order.OverallTotals.HdrShippingTotal,
        hdrTax: order.OverallTotals.HdrTax,
        hdrTotal: order.OverallTotals.HdrTotal,
        lineSubTotal: order.OverallTotals.LineSubTotal,
        manualDiscountPercentage: order.OverallTotals.ManualDiscountPercentage,
        percentProfitMargin: order.OverallTotals.PercentProfitMargin
      } : {}),
      headerCharges: order.HeaderCharges?.HeaderCharge?.map(hc => ({
        chargeAmount: hc.ChargeAmount,
        chargeCategory: hc.ChargeCategory,
        chargeName: hc.ChargeName,
        chargeNameDetails: hc.ChargeNameDetails.Description,
        chargeCategoryDetails: hc.ChargeCategoryDetails?.Description,
        chargeNameKey: hc.ChargeNameKey,
        invoicedChargeAmount: hc.InvoicedChargeAmount,
        isBillable: hc.IsBillable === 'Y',
        isDiscount: hc.IsDiscount === 'Y',
        isManual: hc.IsManual === 'Y',
        isShippingCharge: hc.IsShippingCharge === 'Y',
        reference: hc.Reference,
        remainingChargeAmount: hc.RemainingChargeAmount,
      })) || [],
      headerTaxes: order.HeaderTaxes?.HeaderTax?.map(ht => ({
        chargeCategory: ht.ChargeCategory,
        chargeName: ht.ChargeName,
        reference1: ht.Reference1,
        reference2: ht.Reference2,
        reference3: ht.Reference3,
        tax: ht.Tax,
        taxName: ht.TaxName,
        taxNameDescription: ht.TaxNameDescription,
        isDiscount: ht.IsDiscount === 'Y',
        taxPercentage: ht.TaxPercentage,
        taxableFlag: ht.TaxableFlag,
      })) || [],
      allowedModifications: order.Modifications?.Modification?.map(mod => ({
        isAllowed: mod.ModificationAllowed === 'Y',
        type: mod.ModificationType
      })) || [],
      paymentMethods: order.PaymentMethods?.PaymentMethod?.map(paymentMethod => ({...paymentMethod})) || [],
      chargeTransactionDetails: this._mapChargeTransactionDetails(order),
      totalNumberOfExchangeOrders: get(order, `${this.EXCHANGE_ORDER_PATH}.length`, 0),
      exchangeOrderIds: map(get(order, this.EXCHANGE_ORDER_PATH, []), 'OrderHeaderKey'),
      nonApprovalTransactionViolationList: this._mapNonApprovalTransactionViolations(order.NonApprovalTransactionViolationList),
      transactionApproverList: this._mapTransactionApproverList(order.TransactionApproverList),
      exchangeOrder: {
        orderHeaderKey: map(get(order, this.EXCHANGE_ORDER_PATH, []), 'OrderHeaderKey')[0],
        orderNo: map(get(order, this.EXCHANGE_ORDER_PATH, []), 'OrderNo')[0],
        enterpriseCode: map(get(order, this.EXCHANGE_ORDER_PATH, []), 'EnterpriseCode')[0],
        exchangeType: map(get(order, this.EXCHANGE_ORDER_PATH, []), 'ExchangeType')[0],
      },
      totalNumberOfInvoices: order.OrderInvoiceList?.TotalNumberOfRecords,
      invoicedTotal: order.InvoicedTotals?.GrandTotal
    } as Return;
  }

  private _mapChargeTransactionDetails(order) {
    const chargeTransactionDetails = order.ChargeTransactionDetails;
    if (chargeTransactionDetails && chargeTransactionDetails.ChargeTransactionDetail) {
      return chargeTransactionDetails;
    } else if (chargeTransactionDetails) {
      return { ChargeTransactionDetail: [chargeTransactionDetails]};
    }
  }

  private _mapExchangeOrder(exchangeOrder: Record<string, any>): ExchangeOrder {
    return this.exchangeOrderMapper.mapExchangeOrder(exchangeOrder);
  }

  private _mapNonApprovalTransactionViolations(nonApprovalTransactionViolationList: any): Array<TransactionViolation> {
    if (nonApprovalTransactionViolationList !== undefined && parseInt(nonApprovalTransactionViolationList.TotalNumberOfRecords) > 0) {
      return getArray(nonApprovalTransactionViolationList.TransactionViolation).map(v => ({
        approvalRuleID: v.ApprovalRuleID,
        messageCode: v.MessageCode,
        messageCodeDesc: v.MessageCodeDesc,
        status: v.Status,
        validationID: v.ValidationID,
        transactionInfoID: v.TransactionInfoID,
        transactionViolationKey: v.TransactionViolationKey,
        organizationCode: v.OrganizationCode,
        transactionViolationReferenceList: v.TransactionViolationReferenceList
      }));
    }
    return [];
  }

  private _mapTransactionApproverList(transactionApproverList: any): Array<TransactionViolation> {
    if (transactionApproverList !== undefined && transactionApproverList?.TransactionApprover !== undefined) {
      const violations = [];
      getArray(transactionApproverList.TransactionApprover).forEach(approver =>
        violations.push(...this.getTransactionViolation(approver.TransactionApprovalStatusList.TransactionApprovalStatus))
      );
      return violations;
    }
    return [];
  }

  getTransactionViolation(transactionApprovalStatus): Array<TransactionViolation> {
    return getArray(transactionApprovalStatus).map(v => ({
      approvalRuleID: v.TransactionViolation.ApprovalRuleID,
      messageCode: v.TransactionViolation.MessageCode,
      messageCodeDesc: v.TransactionViolation.MessageCodeDesc,
      status: v.TransactionViolation.Status,
      validationID: v.TransactionViolation.ValidationID,
      transactionInfoID: v.TransactionViolation.TransactionInfoID,
      transactionViolationKey: v.TransactionViolation.TransactionViolationKey,
      organizationCode: v.TransactionViolation.OrganizationCode,
      transactionViolationReferenceList: v.TransactionViolation.TransactionViolationReferenceList

    }));
  }
}
