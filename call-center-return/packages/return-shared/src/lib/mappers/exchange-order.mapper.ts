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

import { BucBaseUtil } from '@buc/svc-angular';
import { Constants } from '../common/return.constants';
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from '../state/mashup/mashup-rsp-processor.service';
import { ExchangeOrder } from '../state/types/order.interface';
import { OverallTotals } from '../state/types/return.interface';

export class ExchangeOrderMapper implements MashupResponseMapper {

    mapResponse(mashupResponse: Record<string, any> | Record<string, any>[], mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
            entities: [],
            actions: []
        };

        if (Array.isArray(mashupResponse)) {
            mapperResponse.entities.push(...mashupResponse.map(mr => this.mapExchangeOrder(mr.response.Order)));
        }

        return mapperResponse;
    }

    public mapExchangeOrder(order): ExchangeOrder {
        return {
            entity_type: Constants.ENTITY_TYPE_EXCHANGE_ORDER,
            exchangeTypeDesc: order.ExchangeTypeDesc,
            exchangeType: order.ExchangeType,
            id: order.OrderHeaderKey,
            rawData: order,
            orderNo: order.OrderNo,
            enterpriseCode: order.EnterpriseCode,
            billToId: order.BillToID,
            billToKey: order.BillToKey,
            customerEmailId: order.CustomerEMailID,
            sellerOrganizationCode: order.SellerOrganizationCode,
            customerPhoneNo: order.CustomerPhoneNo,
            customerFirstName: order.CustomerFirstName,
            customerLastName: order.CustomerLastName,
            customerId: order.CustomerContactID,
            customerName: order.CustomerFirstName && order.CustomerLastName ?
            order.CustomerFirstName + ' ' + order.CustomerLastName : order.BillToID,
            documentType: order.DocumentType,
            orderDate: order.OrderDate,
            status: order.Status,
            displayStatus: order.DisplayStatus,
            multipleStatusesExist: order.MultipleStatusesExist === 'Y',
            maxOrderStatusDesc: order.MaxOrderStatusDesc,
            totalLinesInCart: order.TotalNumberOfLinesInCart,
            priceInfo: {
                value: order.PriceInfo.TotalAmount,
                currencyCode: order.PriceInfo.Currency
            },
            grandTotal: {
                value: order.OverallTotals?.GrandTotal,
                currencyCode: order.PriceInfo.Currency
            },
            personInfoBillTo: order.PersonInfoBillTo,
            personInfoShipTo: order.PersonInfoShipTo,
            totalNumberOfLines: order.OrderLines?.TotalNumberOfRecords,
            chargeTransactionDetails: this._mapChargeTransactionDetails(order),
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
            } : {}) as OverallTotals,
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
                isDiscount: ht.IsDiscount === 'Y',
                taxNameDescription: ht.TaxNameDescription,
                taxPercentage: ht.TaxPercentage,
                taxableFlag: ht.TaxableFlag,
            })) || [],
            allowedModifications: order.Modifications?.Modification?.map(mod => ({
                isAllowed: mod.ModificationAllowed === 'Y',
                type: mod.ModificationType
            })) || [],
            paymentMethods: order.PaymentMethods?.PaymentMethod?.map(paymentMethod => ({...paymentMethod})) || [],
        };
    }

    private _mapChargeTransactionDetails(order) {
        const chargeTransactionDetails = order.ChargeTransactionDetails;
        if (chargeTransactionDetails && chargeTransactionDetails.ChargeTransactionDetail) {
            return chargeTransactionDetails;
        } else if (chargeTransactionDetails) {
            return { ChargeTransactionDetail: [chargeTransactionDetails] };
        }
    }
}
