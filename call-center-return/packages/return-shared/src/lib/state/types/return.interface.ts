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

import { Amount, Entity } from "./base-types";

/**
 * Interface that represents a Return entity in the store
 */

export interface AlertCount extends Entity {
    alertCount: string;
}

export interface Return extends Entity {
    returnNo: string;
    documentType: string;
    enterpriseCode: string;
    enterpriseName: string;
    sellerOrganizationCode: string;
    processPaymentOnReturnOrder?: boolean;
    shipToId: string;
    channel: string;
    status: string;
    maxStatus: string;
    customerFirstName: string;
    customerLastName: string;
    customerPhoneNo: string;
    customerZipCode: string;
    customerId: string;
    customerEmailId: string;
    personInfoBillTo: any;
    personInfoShipTo: any;
    billToId: string;
    returnDate: string;
    returnTotal: Amount;
    isHistory: boolean;
    isDraft: boolean;
    exchangeAmount?: Amount;
    remainingRefundAmount: Amount;
    originalOrderNo?: string;
    originalOrderHeaderKey?: string;
    originalOrderDate: string;
    originalOrderTotal: string;
    pricingSummary?: PricingSummary;
    lines: string[];
    totalNumberOfLines: number;
    awards?: Award[];
    paymentMethods: any[];
    promotions?: Promotion[];
    overallTotals?: OverallTotals;
    headerCharges?: HeaderCharge[];
    headerTaxes?: HeaderTax[];
    holdFlag: boolean;
    allowedModifications?: Modification[];
    customerName: string;
    totalNumberOfExchangeOrders: Number;
    exchangeOrderIds: Array<string>;
    nonApprovalTransactionViolationList: Array<TransactionViolation>;
    transactionApproverList: Array<TransactionViolation>;
    chargeTransactionDetails: any;
    exchangeOrder?: any;
    paymentStatus: string;
    paymentStatusDescription: string;
    totalNumberOfInvoices: number;
    invoicedTotal?: string;
}
export interface PaymentDetails extends Entity {
    enterpriseCode: string;
    processedOrder: boolean
    paymentMethods: any[];
    chargeTransactionDetails: any;
    chargeDetails: any;
    transferToDetails: TransferToDetails;
    processPaymentOnReturnOrder?: boolean;
    currencyCode: string;
    personInfoBillTo: any;
    originalOrderNo?: string;
    originalOrderHeaderKey?: string;
    originalOrderDate: string;
    originalOrderTotal: string;
    totalNumberOfLines: number;
    bookAmount: number;
    paymentStatus: string;
    paymentStatusDescription: string;
}

export interface TransferToDetails {
    collectionDate: string;
    distributedAmount: string;
    pendingAmount: number;
    orderNo: string;
    exchangeType: string;
    orderHeaderKey: string;
}

export interface ReturnLine extends Entity {
    returnId: string;
    lineNo: string;
    lineType: string;
    holdFlag: boolean;
    itemId: string;
    itemDescription: string;
    extendedDisplayDescription: string;
    itemImageUrl: string;
    unitPrice: Amount;
    quantity: string;
    uom: string;
    returnMethodId: string;
    returnMethod: ReturnMethod;
    reason: ReturnReason;
    status: string;
    maxLineStatus: string;
    displayStatus: string;
    lineOverallTotals: any;
    lineCharges: any;
    lineTaxes: any;
    isBundleParent: string;
    bundleParentOrderlineKey: string;
    derivedFromBundleParentOrderlineKey: string;
    isLinePriceForInformationOnly: string;
    derivedFromOrderLineKey: string;
    modificationQty?: string;
    availableQtyForCancelAndStopDelivery?: string;
    kitCode?: string;
    allowedModifications?: Modification[];
    orderLineTranQuantity?: any;
    stopDeliveryRequestDetails?: any;
    invoicedQty?: string;
    relatedLines?: RelatedLine[],
    parentLine?: {lineNo: string, itemDesc: string};
}

export interface ReturnLineDetails extends Entity{
    itemId: string;
    itemDescription: string;
    description: string;
    extendedDisplayDescription: string;
    itemImageUrl: string;
    isBundleParent: string;
    uom: string;
    lineNo: string;
    quantity: string;
    status: string;
    maxLineStatus: string;
    displayStatus: string;
    returnMethodId: string;
    kitCode: string;
    importantEvents: any;
}

export interface RelatedLine {
    itemId: string;
    itemDescription: string;
    itemImageUrl: string;
    orderLineKey: string,
    primeLineNo: string,
}

export interface Payment extends Entity {
    id: string;
    paymentType: string;
    amount: Amount;
    description: string;
}

export interface ReturnMethod extends Entity {
    name: string;
    type: string | 'shipment';
}

export interface CustomerPaymentMethod extends Entity {
    [key: string]: any;
}
export interface PaymentType extends Entity {
    [key: string]: any;
}
export interface ShipmentReturnMethod extends ReturnMethod {
    trackingInfoIds: Array<string>;
    trackingNumber: string;
    fromAddressId: any;
    toAddressId: any;
    refundAddressId: any;
    shipNode: any;
    shipToKey: string;
    status: string;
    returnlines?: ReturnLine[];
}

export interface ShipmentTracking extends Entity {
    name: string;
    createdDate: string;
    lastModified: string;
    [key: string]: unknown;
}

export interface PricingSummary {
    refundSummary: RefundSummary;
    total: Amount;
    exchangeTotal?: Amount;
    exchangePayment?: Amount;
    payments: Array<String>;
    amountDue: Amount;
}

export interface RefundSummary {
    total: Amount;
    units: Number;
    adjustments: Amount;
    deliveryRefund: Amount;
    taxes: Amount;
}

export interface Award {
    amount: string;
    applied: string;
    id: string;
    key: string;
    quantity: string;
    type: string;
    chargeCategory: string;
    chargeName: string;
    denialReason: string;
    description: string;
    isFreeGiftAward: string;
    promotionId: string;
    promotionKey: string;
}

export interface Note extends Entity {
    notesKey: string;
    tableKey: string;
    contactReference: string,
    contactTime: string,
    contactType: string,
    contactUser: string,
    customerSatIndicator: string,
    noteText: string,
    priority: string,
    reasonCode: string,
    sequenceNo: string,
    user: string,
    visibleToAll: string,
    modifyts:string,
    createts:string,
    modifyuserid:string;
    createuserid: string,
    modifyUserName:string;
}
export interface LineNote extends Entity {
    notes: Partial<Note>[];
}
export interface Promotion {
    key: string;
    type: string;
    id: string;
    amount: string;
    applied: boolean;
    denialReason: string;
    description: string;
}

// TODO: restructure and move it under pricing / return summary entities
export interface OverallTotals {
    grandExchangeTotal: string,
    grandRefundTotal: string,
    pendingRefundAmount: string,
    refundedAmount: string,
    additionalLinePriceTotal: string,
    grandAdjustmentsWithoutTotalShipping: string,
    grandCharges: string,
    grandDiscount: string,
    grandShippingBaseCharge: string,
    grandShippingCharges: string,
    grandShippingDiscount: string,
    grandShippingTotal: string,
    grandTax: string,
    grandTotal: string,
    hdrShippingBaseCharge: string,
    hdrShippingCharges: string,
    hdrShippingDiscount: string,
    hdrShippingTotal: string,
    hdrTax: string,
    hdrTotal: string,
    lineSubTotal: string,
    manualDiscountPercentage: string,
    percentProfitMargin: string
}

export interface HeaderCharge {
    chargeAmount: string,
    chargeCategory: string,
    chargeName: string,
    chargeNameDetails: string,
    chargeCategoryDetails: string;
    chargeNameKey: string,
    invoicedChargeAmount: string,
    isBillable: boolean,
    isDiscount: boolean,
    isManual: boolean,
    isShippingCharge: boolean,
    reference: string,
    remainingChargeAmount: string,
}

export interface HeaderTax {
    chargeCategory: string;
    chargeName: string;
    reference1: string;
    reference2: string;
    reference3: string;
    tax: string;
    taxName: string;
    taxPercentage: string;
    taxableFlag: string;
}

export interface Modification {
    isAllowed: boolean;
    type: string;
}

export interface ReturnReason {
    id: string;
    name: string;
}

//export type ReturnOption = 'return' | 'exchange';
export interface DeleteNote {
  NotesKey: string;
  TableKey: string;
}

export interface NewNote {
    notesKey?: string,
    contactReference: string,
    contactType: string,
    noteText: string,
    priority: string,
    reasonCode: string,
    visibleToAll: string,
    // We do not update create user ID on edit
    createUserId?: string,
    modifyUserId: string
}

export interface TransactionViolation {
    approvalRuleID: string;
    messageCode: string,
    messageCodeDesc: string,
    status: string,
    validationID: string;
    organizationCode: string;
    transactionInfoID: string;
    transactionViolationKey: string;
    transactionViolationReferenceList: TransactionViolationReferenceList;
}

export interface TransactionViolationReferenceList {
    TotalNumberOfRecords: string;
    TransactionViolationReference: Array<TransactionViolationReference>;
}
export interface TransactionViolationReference {
    ReferenceName: string;
    ReferenceValue: string;
    RransactionViolationReferenceKey: string
}
export interface ExistingReturnLine {
  OrderHeaderKey: string;
  OrderLineKey: string;
  OrderedQty: string;
  ReturnReason: string;
  ReturnReasonShortDesc: string;
}

export interface PricingRule extends Entity{
    PricingRuleKey: string,
    [key: string]: any;
}

export interface PromoChangeOrder extends Entity{
    [key: string]: any;
}
