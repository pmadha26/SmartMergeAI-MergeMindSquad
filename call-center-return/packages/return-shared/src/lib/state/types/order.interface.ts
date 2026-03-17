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

import { Amount, Entity } from './base-types';
import { ExistingReturnLine, HeaderCharge, HeaderTax, Modification, OverallTotals, PricingSummary, Promotion, RelatedLine, ReturnReason, TransactionViolation } from './return.interface';

export interface Order extends Entity {
    customerEmailId: string,
    customerPhoneNo: string,
    customerFirstName: string,
    customerLastName: string,
    enterpriseCode: string,
    customerId: string,
    billToId: string,
    billToKey: string,
    documentType: string,
    orderDate: string,
    orderNo: string,
    grandTotal: Amount,
    priceInfo: Amount,
    totalLinesInCart: number,
    displayStatus: string,
    status: string,
    multipleStatusesExist: boolean;
    maxOrderStatusDesc: string;
    personInfoBillTo: Record<string, string>,
    personInfoShipTo: Record<string, string>
};

export interface ExchangeOrder extends Order {
    sellerOrganizationCode: string;
    customerName: string;
    exchangeType: string;
    exchangeTypeDesc: string;
    pricingSummary?: PricingSummary;
    promotions?: Promotion[];
    overallTotals?: OverallTotals;
    headerCharges?: HeaderCharge[];
    headerTaxes?: HeaderTax[];
    chargeTransactionDetails: any;
    allowedModifications?: Modification[];
    totalNumberOfLines: number;
    paymentMethods: any[];
}

export interface OrderLine extends Entity {
    orderId: string;
    orderNo: string;
    orderDate: string;
    lineNo: string;
    itemId: string;
    itemDescription: string;
    isShippingAllowed: string;
    isPickupAllowed: string;
    itemImageUrl: string;
    unitPrice: Amount;
    lineTotal: string;
    productClass: string;
    quantity: string;
    kitQty: string;
    uom: string;
    returnableQuantity: string;
    returnQuantity?: string;
    reason?: ReturnReason;
    status: string;
    displayStatus: string;
    reshipParentLineKey: string;
    isLinePriceForInformationOnly: string,
    listPrice: string;
    giftFlag: string;
    hasNotes: string;
    hasReturnLines: string;
    reshippedQty: number;
    numberOfInstructions: string;
    stopDeliveryRequestDetails: StopDeliveryRequestDetails;
    nonApprovalTransactionViolations: Array<TransactionViolation>;
    transactionApproverList: Array<TransactionViolation>;
    returnLines: Array<ExistingReturnLine>;
    isBundleParent: string;
    bundleParentOrderlineKey: string ;
    overrideNote?: string;
    addedToExchange?: boolean;
    relatedLines?: RelatedLine[],
    parentLine?: {lineNo: string, itemDesc: string};
    kitCode: string;
    lineAdjustments?: string;
    hasReturnedComponent?: boolean;
    hasReturnedParent?: boolean
}

export interface ExchangeLine extends Entity {
    orderId: string;
    enterpriseCode: string;
    lineNo: string;
    itemId: string;
    itemKey: string;
    itemDescription: string;
    kitCode: string;
    parentItemId: string;
    itemImageUrl: string;
    unitPrice: Amount;
    lineTotal: string;
    productClass: string;
    quantity: string;
    uom: string;
    variation: string;
    giftFlag: string;
    holdFlag: string;
    hasNotes: string;
    hasReturnLines: string;
    reshippedQty: number;
    numberOfInstructions: string;
    isBundleParent: string;
    bundleParentOrderlineKey: string;
    reshipParentLineKey: string;
    isLinePriceForInformationOnly: string;
    status: string;
    maxLineStatus: string;
    displayStatus: string;
    earliestShipDate: string;
    deliveryMethod: string;
    lineOverallTotals: any;
    lineCharges: any;
    lineTaxes: any;
    modificationQty?: string;
    availableQtyForCancelAndStopDelivery?: string;
    allowedModifications?: Modification[];
    orderLineTranQuantity?: any;
    stopDeliveryRequestDetails?: any;
    deliveryMethodDesc?: string;
    lineAdjustments?: string;
}

export interface StopDeliveryRequestDetails {
    stopDeliveryRequestDetail: Array<StopDeliveryRequestDetail>;
    totalNumberOfRecords: string;
}
export interface StopDeliveryRequestDetail {
    requestedQty: string;
    successfulQty: string
}
