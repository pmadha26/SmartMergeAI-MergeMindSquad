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

import { BucConstants } from '@buc/svc-angular';

export class Constants {
    static readonly CREATE_RETURN_ROUTE: string = '/create-return';
    static readonly RETURN_SEARCH_ROUTE: string = '/return-search/return';
    static readonly RETURN_SEARCH_RESULT_ROUTE: string = '/return-search-result';
    static readonly RETURN_DETAILS_ROUTE: string = '/return-details';
    static readonly CREATE_ALERT_ROUTE: string = '/create-alert';
    static readonly ORDER_DETAILS_ROUTE: string = '/order-details';
    static readonly CUSTOMER_DETAILS_ROUTE: string = '/customer-details';
    static readonly VIEW_ALL_INVOICES_ROUTE: string = '/view-invoices';
    static readonly VIEW_ALL_INVOICE_DETAILS_ROUTE: string = '/view-invoices-details';
    static readonly RETURN_MODIFICATION_CHECKOUT_ROUTE: string = '/return-modification-checkout';
    static readonly MANAGE_RETURN_HOLDS_ROUTE: string = '/manage-return-holds';
    static readonly ALERT_DETAILS_ROUTE: string = '/alert-details';

    // child route paths - return and exchange
    static readonly CUSTOMER_DETAILS = 'customer-details';
    static readonly ADD_PRODUCTS = 'add-products';
    static readonly PRODUCTS_TO_RETURN_PATH = 'products-to-return';
    static readonly RETURN_METHOD_PATH = 'return-method';
    static readonly REFUND_PATH = 'refund';
    static readonly LINES_TO_RETURN_PATH = 'lines-to-return';
    static readonly EXCHANGE_PATH = 'exchange-products'
    static readonly EXCHANGE_FULFILLMENT_PATH = 'exchange-fulfillment'
    static readonly SUMMARY_PATH = 'summary';
    static readonly PAYMENT_PATH = 'payment'

    static readonly TABLE_PAGE_LENGTH_10 = 10;
    static readonly APP_NAME = 'cc-return';
    static readonly CHANNEL_APP_NAME = 'call-center';
    static readonly MODULE_NAME = 'call-center-return';
    static readonly GLOBAL_SESSION_KEY = 'global-return-search';
    static readonly SESSION = 'session';

    // CC home
    static readonly CC_HOME_SESSION_KEY = 'call-center-home';
    static readonly BREADCRUMB_ROOT = 'bcRoot';
    static readonly ALL_ENTERPRISES = 'ALL';

    // date-format (locale-specific in 'short-date' format)
    static readonly DATE_FORMAT = 'L';
    static readonly SHORT_DATE_FORMAT = 'll';
    static readonly LONG_DATE_FORMAT = 'll LT';
    static readonly LONG_DATETIME_FORMAT = 'LL LT';
    static readonly MOMENT_DATE_FORMAT = 'MM/DD/YYYY';
    static readonly MOMENT_DATETIME_FORMAT = 'MM/DD/YYYY hh:mm';
    static readonly ISO_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.sssZ';

    static readonly DATETIME_FORMAT = 'MMM DD, YYYY';

    // misc
    static readonly SEPARATOR_KEY = '_<(+)>_';
    static readonly DEFAULT_SEARCH_MAX_RECORDS = 500;
    static readonly DEFAULT_RETURN_ORDER_DOCUMENT_TYPE = '0003';
    static readonly ORDER_DOCUMENT_TYPE = '0001';
    static readonly DEFAULT_COUNTRY = 'US';
    static readonly COMMON_CODE_COUNTRY = 'COUNTRY';
    static readonly COMMON_CODE_RETURN_REASON = 'RETURN_REASON';
    static readonly COMMON_CODE_NOTES_REASON = 'NOTES_REASON';
    static readonly COMMON_CODE_CONTACT_TYPE = 'CONTACT_TYPE';
    static readonly COMMON_CODE_MODIFY = 'MODIFY';
    static readonly STATUS_VERIFIED = 'VERIFIED';
    static readonly STATUS_FAILED = 'FAILED';
    static readonly SHIPPING = 'Shipping';
    static readonly COUPON = 'Coupon';
    static readonly CC_TAB_NAVIGATION_EVENT = 'CC_TAB_NAVIGATION';
    static readonly SELECT_STORE = 'select store';
    static readonly OVERRIDE_PRICE = "override price"
    static readonly SELECT_CUSTOMER = "select customer";
    static readonly MODIFY_CUSTOMER_ADDRESS = "manage customer address";
    static readonly REAL_TIME_AUTH_REQUIRED = '02';
    static readonly RULE_REAL_TIME_AUTHORIZATION = 'YCD_REAL_TIME_AUTHORIZATION';
    static readonly RULE_ALLOW_EXCHANGE_ORDER = 'ICC_ALLOW_EXCHANGE_ORDER';
    static readonly RULE_ALLOW_RETURN_OF_BUNDLE_COMPONENTS = 'ICC_ALLOW_RETURN_OF_BUNDLE_COMPONENTS';
    static readonly RULE_ICC_SINGLE_ADJUST_PRICING_SAVE = 'ICC_SINGLE_ADJUST_PRICING_SAVE';
    static readonly CUSTOMER_TYPE = {
      BUSINESS: '01',
      CONSUMER: '02',
      ALL: '03'
    };


    // mashup Ids
    static readonly MASHUP_ID_FETCH_ORDER_HEADER_INFO = 'icc.return.create-return.getOrderHeaderInfo';
    static readonly MASHUP_ID_FETCH_RETURN_REASON_CODES = 'icc.return.common.getReasonReasonCodes';
    static readonly MASHUP_ID_FETCH_COMMON_CODE_LIST = 'icc.order.summary.getCommonCodeList';
    static readonly MASHUP_ID_ADD_NOTE = 'icc.return.details.addNote.changeOrder';
    static readonly MASHUP_ID_DELETE_NOTE = 'icc.return.details.deleteNote.changeOrder';
    static readonly MASHUP_ID_ADD_ORDERLINE_NOTE = 'icc.order.summary.addOrderLineNote.changeOrder';
    static readonly MASHUP_ID_DELETE_ORDERLINE_NOTE = 'icc.order.summary.deleteOrderLineNote.changeOrder';
    static readonly MASHUP_ID_FETCH_LINE_NOTES = 'icc.return.create-return.getAllLineNotes';
    static readonly MASHUP_ID_GET_PAGINATED_RETURN_LIST = 'icc.return.return-search-results.getPaginatedReturnList';
    static readonly MASHUP_ID_DELETE_DRAFT_RETURN = 'icc.return.create-return.deleteDraftReturn';
    static readonly MASHUP_ID_FETCH_ORDER_LINE_LIST = 'icc.return.create-return.getCompleteOrderLineList';
    static readonly MASHUP_ID_FETCH_RETURN_DETAILS = 'icc.return.return-details.getCompleteOrderDetails';
    static readonly MASHUP_ID_FETCH_RETURN_SHIPMENT_DETAILS = 'icc.return.return-details.getReturnFulfillmentSummaryDetails';
    static readonly MASHUP_ID_GET_ALERT_LIST = 'icc.alert.alert-search-results.getPaginatedAlertList';

    static readonly MASHUP_ID_FETCH_SALERS_ORDER_LINES = 'icc.return.create-return.getOrderLinesToReturn';
    static readonly MASHUP_ID_FETCH_SALERS_ORDER_LINES_BUNDLE = 'icc.return.create-return.getBundleComponentOrderLinesToReturn';

    static readonly MASHUP_ID_CREATE_RETURN_ORDER = 'icc.return.create-return.createReturnOrder';
    static readonly MASHUP_ID_PROCESS_RETURN_ORDER = 'icc.return.create-return.processReturnOrder';
    static readonly MASHUP_ID_CHANGE_RETURN_ORDER = 'icc.return.create-return.changeReturnOrder';
    static readonly MASHUP_ID_RECORD_APPROVAL = 'icc.return.create-return.recordApproval';
    static readonly MASHUP_ID_CONFIRM_DRAFT_RETURN_ORDER = 'icc.return.create-return.confirmDraftReturnOrder';
    static readonly MASHUP_ID_PROCESS_ORDER_PAYMENTS = 'icc.return.create-return.processOrderPayments';
    static readonly MASHUP_ID_REMOVE_PAYMENT_METHOD = 'icc.return.create-return.removePaymentMethod';
    static readonly MASHUP_ID_UPDATE_ADDRESS_MODIFY_FFM_OPTIONS = 'icc.return.create-return.updateAddress-modifyFulfillmentOptions';
    static readonly MASHUP_ID_GET_CUSTOMER_PAYMENT_METHOD_LIST = 'icc.order.summary.paymentMethods.getCustomerPaymentMethodList';
    static readonly MASHUP_ID_CAPTURE_REFUND_PAYMENT = 'icc.return.create-return.capturePayment';
    static readonly MASHUP_ID_CREATE_RETURN_FETCH_RETURN_DETAILS = 'icc.return.create-return.getCompleteReturnOrderDetails';
    static readonly MANAGE_CUSTOMER_PAYMENT = 'icc.order.summary.paymentMethods.manageCustomer';
    static readonly MASHUP_ID_GET_CHARGECATEGORY_LIST = 'icc.order.summary.adjustPricing.getChargeCategoryList';
    static readonly MASHUP_ID_GET_CHARGENAME_LIST = 'icc.order.summary.adjustPricing.getChargeNameList';
    static readonly MASHUP_ID_SUBMIT_ADJUSTPRICING_ADD_LINE_CHARGES = 'icc.order.summary.adjustPricing.addLineCharges.changeOrder';
    static readonly MASHUP_ID_SUBMIT_ADJUSTPRICING_ADD_HEADER_CHARGES = 'icc.order.summary.adjustPricing.addHeaderCharges.changeOrder';
    static readonly MASHUP_ID_SAVE_ALL_HEADER_CHARGES_OR_NOTE = 'icc.order.summary.adjustPricing.saveAllHeaderChargesOrNote.changeOrder';
    static readonly MASHUP_ID_SAVE_ALL_LINE_CHARGES_OR_NOTE = 'icc.order.summary.adjustPricing.saveAllLineChargesOrNote.changeOrder';
    static readonly MASHUP_ID_SAVE_PENDING_CHARGES_ADJUSTPRICING = 'icc.order.summary.adjustPricing.savePendingChangesOnOrder';
    static readonly MASHUP_ID_RESET_PENDING_CHANGES_ADJUSTPRICING = 'icc.order.summary.adjustPricing.resetPendingChangesOnOrder';

    static readonly MASHUP_ID_GET_PAYMENT_TYPE_LIST = 'icc.order.summary.getPaymentTypeList';
    static readonly MASHUP_ID_GET_PAYMENT_COMPLETE_ORDER_DETAILS = 'icc.create-return.paymentConfirmation_getCompleteOrderDetails';
    static readonly MASHUP_ID_COMPUTE_REFUND_PAYMENTS = 'icc.return.create-return.computeRefundPayments';
    static readonly MASHUP_ID_GET_PAYMENT_INQUIRY_DETAILS = 'icc.return.return-details.getPaymentInquiryDetails';
    static readonly MASHUP_ID_GET_ALL_INVOICES = 'icc.invoices.invoice-getOrderInvoiceList';
    static readonly MASHUP_ID_CREATE_ORDER_INVOICE = 'icc.return.return-details.createOrderInvoice';
    static readonly MASHUP_ID_PROCESS_REFUND = 'icc.return.return-details.processOrderPayments';
    static readonly MASHUP_ID_GET_REFUND_LINES = 'icc.return.return-details.refundOrderLineList';

    // Exchange order mashups
    static readonly MASHUP_ID_CREATE_EXCHANGE_ORDER = 'icc.return.create-return.createExchangeOrder';
    static readonly MASHUP_ID_UPDATE_EXCHANGE_ORDER = 'icc.return.create-return.updateExchangeOrder';
    static readonly MASHUP_ID_FETCH_EXCHANGE_ORDER_DETAILS = 'icc.create-return.getCompleteExchangeOrderDetails';
    static readonly MASHUP_ID_UPDATE_EXCHANGE_ORDER_LINE = 'icc.order.create-order.review-cart.updateOrderLine';
    static readonly MASHUP_ID_ICC_DELETE_ORDERLINE = 'icc.order.create-order.fulfillment-methods.deleteOrderLine';
    static readonly MASHUP_ID_FETCH_EXCHANGE_TYPES = 'icc.return.common.exchangeTypes';
    static readonly MASHUP_ID_FETCH_EXCHANGE_PRODUCTS = 'icc.create-return.exchange-products.getCompleteOrderLineList';
    static readonly MASHUP_ID_FETCH_EXCHANGE_FUFILLMENT_METHOD = 'icc.order.create-order.fulfillment-methods.getFulfillmentDetails';
    static readonly MASHUP_ID_FETCH_DEFAULT_SHIPPING_OPTIONS = 'icc.order.summary.shippingOption.getRuleDetails';
    static readonly MASHUP_ID_GET_PROMOTION_LIST = 'icc.order.summary.adjustPricing.getPromotionsForOrdering';
    static readonly MASHUP_ID_GET_CARRIER_SERVICE_OPTIONS = 'icc.order.change-fulfillment-method.getCarrierServiceOptions';
    static readonly MASHUP_ID_MODIFY_FULFILLMENT_METHOD_SHIP_TO_PICK = 'icc.order.create-order.fulfillment-methods.modifyFulfillmentFromShipToPick';
    static readonly MASHUP_ID_MODIFY_FULFILLMENT_METHOD_PICK_TO_SHIP = 'icc.order.create-order.fulfillment-methods.modifyFulfillmentFromPickToShip';
    static readonly MASHUP_ID_CHECK_FOR_AVAILABILITY_OF_LINES = 'icc.order.create-order.fulfillment-methods.checkForAvailabilityOfLines';
    static readonly MASHUP_ID_VALIDATE_AND_RESERVE_ORDER = "icc.order.create-order.review-order.validateItemAndReserve";
    static readonly MASHUP_ID_CONFIRM_DRAFT_RETURN_EXCHANGE_ORDER = 'icc.return.create-return.confirmDraftReturnAndExchangeOrder';
    static readonly MASHUP_ID_DELETE_DRAFT_EXCHANGE = 'icc.return.create-return.deleteDraftExchange';
    static readonly MASHUP_ID_PAYMENT_DETAILS = 'icc.create-return.paymentConfirmation_getCompleteOrderDetails';
    static readonly MASHUP_ID_REMOVE_EXCHANGE_PAYMENT_METHOD = 'icc.return.create-return.removeExchangePaymentMethod';
    static readonly MASHUP_ID_CHANGE_ORDER_PROMOTIONS = 'icc.order.summary.adjustPricing.couponPromo.changeOrderWithPendingChanges';
    static readonly MASHUP_ID_CHANGE_ORDER_PROMOTIONS_CHECKOUT = 'icc.order.summary.promotions.changeOrderWithoutPendingChanges';

    static readonly MASHUP_ID_GET_FUNDS_AVAILABLE = 'icc.order.ordermodificationcheckout.getFundsAvailableForPaymentMethod';
    static readonly MASHUP_ID_CAPTURE_PAYMENT_WITH_POP = 'icc.order.summary.paymentMethod.capturePaymentWithPOP';

    static readonly MASHUP_ID_GET_EXCHANGE_DETAILS_CANCEL = 'icc.exchange.cancel.getCompleteOrderDetails';
    static readonly MASHUP_ID_GET_EXCHANGE_LINE_CANCEL = 'icc.exchange.cancel.getCompleteOrderLineList';
    static readonly MASHUP_ID_GET_CANCEL_RETURN = 'icc.return.cancel.cancelOrder';

    static readonly MASHUP_ID_GET_HOLD_TYPE_LIST = 'icc.return.manageholds.getHoldTypeList';
    static readonly MASHUP_ID_APPLY_HOLD_ORDER = 'icc.return.manageholds.changeOrder';
    static readonly MASHUP_ID_APPLY_HOLD_ORDER_LINE = 'icc.return.manageholds.changeOrderLine';
    static readonly MASHUP_ID_GET_ORDER_HOLD_RESOLUTION_LIST = 'icc.return.manageholds.getOrderHoldResolutionList';
    static readonly MASHUP_ID_RESOLVE_HOLD= 'icc.return.manageholds.resolveHolds_changeOrder';

    static readonly ENTITY_TYPE_SHIPMENT = 'shipmentReturnMethod';
    static readonly ENTITY_TYPE_ALERT_ACOUNT = 'alert_count';

    static readonly MASHUP_ID_FETCH_RETURN_LINES = 'icc.return.return-details.getCompleteOrderLineList';
    static readonly MASHUP_ID_FETCH_RULE_DETAILS = 'icc.common.getRuleDetails';
    static readonly MASHUP_ID_FETCH_RETURN_LINE_DETAILS = 'icc.return.return-details.getCompleteOrderLineDetails';
    static readonly MASHUP_ID_UPDATE_RETURN_ORDER = 'icc.return.create-return.updateReturnOrderWithSelectedOrder';
    static readonly MASHUP_ID_RESTORE_ORDER = 'icc.return.summary.restoreReturn';

    static readonly ENTITY_TYPE_CUSTOMER_PAYMENT = 'customer_payment_method'
    static readonly ENTITY_TYPE_RETURN = 'return';
    static readonly ENTITY_TYPE_NOTE = 'note';
    static readonly ENTITY_TYPE_EXCHANGE_NOTES = 'exchange_note';
    static readonly ENTITY_TYPE_LINE_NOTES = 'lineNotes';
    static readonly ENTITY_TYPE_EXCHANGE_LINE_NOTES = 'lineNotes';
    static readonly ENTITY_TYPE_RETURN_LINE = 'return_line';
    static readonly ENTITY_TYPE_RETURN_LINE_DETAILS = 'return_line_details';
    static readonly ENTITY_TYPE_EXCHANGE_ORDER = 'exchange_order';
    static readonly ENTITY_TYPE_EXCHANGE_ORDER_LINE = 'exchange_order_line';
    static readonly ENTITY_TYPE_ORDER = 'order';
    static readonly ENTITY_TYPE_ORDER_LINE = 'order_line';
    static readonly ENTITY_TYPE_BUNDLE_ORDER_LINE = 'bundle_order_line';
    static readonly ENTITY_TYPE_ALL_ORDER_LINE = 'all_order_line';
    static readonly ENTITY_TYPE_CREATE_RETURN_METHODS = 'return_method';
    static readonly ENTITY_TYPE_RETURN_FULFILLMENT_SUMMARY = 'return_fulfillment_summary';
    static readonly ENTITY_TYPE_RETURN_PAYMENT_SUMMARY = 'return_payment_summary';
    static readonly ENTITY_TYPE_CHARGE_NAME = 'charge-name-list';
    static readonly ENTITY_TYPE_CATEGORY_LIST = 'category-list';
    static readonly ENTITY_TYPE_EXCHANGE_FULFILLMENT = 'exchange_fulfillment';
    static readonly ENTITY_TYPE_AVAILBILITY = 'exchange_availbility';
    static readonly ENTITY_TYPE_VALIDATED_ORDER = 'exchange_validated';
    static readonly ENTITY_TYPE_LINE_UPDATED = 'exchange_line_updated';
    static readonly ENTITY_TYPE_EXCHANGE_ITEM_DETAILS = 'exchange_item_details';
    static readonly ENTITY_TYPE_REFUND_LINES = 'refund-lines';

    static readonly RETURN_LINES_COMPONENT_ID = 'return-lines-component';
    static readonly CANCEL_RETURN_LINES_COMPONENT_ID = 'cancel-return-lines-table';
    static readonly CANCEL_EXCHANGE_LINES_COMPONENT_ID = 'cancel-exchange-lines-table';
    static readonly SALES_ORDER_LINES_COMPONENT_ID = 'products-to-return-lines-component';
    static readonly RETURN_TABLE_COMPONENT_ID = 'return-table-component';
    static readonly RETURN_METHOD_RETURN_TABLE_COMPONENT_ID = 'return-method-return-order-lines-component';
    static readonly EXCHANGE_PRODUCTS_COMPONENT_ID = 'exchange-products-component';
    static readonly SELECT_ORDER_SEARCH_TABLE_COMPONENT_ID = "select-order-search-table";
    


    // Payment types
    static readonly CREDIT_CARD = 'CREDIT_CARD';
    static readonly DEBIT_CARD = 'DEBIT_CARD';
    static readonly STORED_VALUE_CARD = 'STORED_VALUE_CARD';
    static readonly CUSTOMER_ACCOUNT = 'CUSTOMER_ACCOUNT';
    static readonly OTHER = 'OTHER';
    static readonly GIFT_CARD = 'GIFT_CARD';
    static readonly STR_EMPTY = '';

    // misc
    static readonly CHECK_YES = 'Y';
    static readonly CHECK_NO = 'N';
    static readonly EXCHANGE_CATEGORY = "EXCHANGE";
    static readonly RETURN_CATEGORY = "RETURN";

    // violations status
    static readonly APPROVED_CODE = '1200';
    static readonly SYSTEM_APPROVED_CODE = '1400';
    static readonly EXPIRED = '9000';

    static readonly CREATE_RETURN_EXISTING_LINES_MODAL_TABLE = 'return-lines-modal-table';
    static readonly CREATE_EXCHANGE_EXISTING_LINES_MODAL_TABLE = 'exchange-lines-modal-table';


    // adjust pricing
    static readonly ADJUST_PRICING = 'adjust pricing';
    static readonly KEY_HEADER_CHARGE = 'HeaderCharge';
    static readonly KEY_LINE_CHARGE = 'LineCharge';
    static readonly KEY_CHARGE_AMOUNT = 'ChargeAmount';
    static readonly KEY_CHARGE_NAME = 'ChargeName';
    static readonly KEY_CHARGE_CATEGORY = 'ChargeCategory';
    static readonly KEY_CHARGE_APPLYTO = 'ChargeApplyTo';
    static readonly KEY_ISMANUAL = 'IsManual';
    static readonly STR_DISCOUNT = 'Discount';
    static readonly BILLABLE_CODE = 'billable'
    static readonly DISCOUNT_CODE = 'discount';
    static readonly STR_PRICE = "PRICE";
    static readonly STR_CNG_PROMOTION = "CHANGE_PROMOTION";
    static readonly STR_RMV_PROMOTION = "REMOVE_PROMOTION";
    static readonly LINE_PRICING_SUMMARY = 'line pricing summary';
    static readonly INVOICE_LINE_PRICING_SUMMARY = 'invoice line pricing summary';
    static readonly VIEW_ALL_INVOICES = 'View all invoices';

    static readonly EXCHANGE_TYPE = 'EXCHANGE_TYPE';
    static readonly DEFAULT_EXCHANGE_TYPE = 'YCD_DEFAULT_EXCHANGE_TYPE';
    static readonly ALLOW_EXHCANGE_TYPE = 'YCD_ALLOW_EXCHANGE_TYPE_TO_CHANGE';
    static readonly SHIPMENT_OPTIMIZATION_RULE = 'YCD_SHIPMENT_OPTIMIZATION_RULE';
    static readonly CACHE_INVENTORY = 'YCD_USE_CACHE_INVENTORY_CHECK';
    static readonly PICKUP_STORE_ENABLED = 'YCD_STORE_ENABLED';
    static readonly YCD_ISSUE_REFUND_NOW = "YCD_ISSUE_REFUND_NOW";
    static readonly YCD_CANCEL_REASON = "YCD_CANCEL_REASON";
    static readonly YCD_CANCEL_INFO = "YCD_CANCEL_INFO";
    static readonly YCD_CANCEL_RETURN_ORDER = "YCD_CANCEL_RETURN_ORDER";


    //return details tabs
    static readonly TAB_ID_RETURN_LINES = 'ReturnLinesTab';
    static readonly TAB_ID_RETURN_METHODS = 'ReturnMethodsTab';
    static readonly TAB_ID_EXCHANGE_ORDERS = 'ExchangeOrdersTab';
    static readonly TAB_ID_PAYMENT_METHOD = 'PaymentMethodTab';
    static readonly TAB_ID_ALERT = 'AlertTab';


    // modification type
    static readonly MOD_TYPE_CANCEL = 'CANCEL';
    static readonly MOD_TYPE_STOP_DELIVERY_REQUEST = 'CHANGE_STOP_DELIVERY_REQUEST';
    static readonly MOD_TYPE_HOLD = 'HOLD';
    static readonly MOD_TYPE_HOLD_TYPE = 'HOLD_TYPE';
    
    // holds
    static readonly RESOLVE_HOLDS_STATUS = '1300';
    static readonly APPLY_HOLDS_STATUS = '1100';
    static readonly APPLY_HOLDS = 'apply holds';
    static readonly RESOLVE_HOLDS = 'resolve holds';
    static readonly HOLDS_STATUS_QRYTYPE = 'NE';
    static readonly HOLDS_STATUS_QRYTYPE_EQUAL = 'EQ';
    static readonly DC = 'DC';
    static readonly HOLDS_ACTION = 'MODIFY';
}

export const TenantFieldMap = {
    customer: 'showPersonalInfo'
};

export const ContactTypes = {
    email: 'EMAIL',
    phone: 'PHONE',
    inPerson: 'YCD_CTYPE_INPERSON'
};

export const Validation = {
    isNumber(str) {
        const pattern = /^[0-9]*$/;
        return pattern.test(str);  // returns a boolean
    }
};

export const Rules = {
    PricingRule: [
        'PRICING_RULE_DISCOUNT_CHARGE_CATEGORY_FOR_SHIPPING_SURCHARGE_TYPE',
        'PRICING_RULE_SURCHARGE_CHARGE_CATEGORY_FOR_SHIPPING_SURCHARGE_TYPE',
        'PRICING_RULE_DISCOUNT_CHARGE_CATEGORY_FOR_SHIP_ORDER_TOTAL_TYPE',
        'PRICING_RULE_SURCHARGE_CHARGE_CATEGORY_FOR_SHIP_ORDER_TOTAL_TYPE',
        'COUPON_DISCOUNT_CHARGE_CATEGORY_FOR_SHIP_ORDER_TOTAL_TYPE',
        'PRICING_RULE_DISCOUNT_CHARGE_CATEGORY_FOR_SHIP_ITEM_QTY_TYPE',
    ],
    OverrideNoteRule: ['YCD_OVERRIDE_RETURN_POLICY_NOTE_TYPE'],
    ExchangeTypeRule: [
        Constants.DEFAULT_EXCHANGE_TYPE,
        Constants.ALLOW_EXHCANGE_TYPE,
        Constants.PICKUP_STORE_ENABLED,
        Constants.CACHE_INVENTORY
    ],
    ReturnBundleRule : [
        Constants.RULE_ALLOW_RETURN_OF_BUNDLE_COMPONENTS
    ]
};

export const DelMethod = {
    SHIP: 'SHP',
    PICKUP: 'PICK',
    DELIVERY: 'DEL',
    CARRY: 'CARRY'
};

export const ExchangeLineErrorCodes = {
  MinQuantity: 'OMP85_0056',
  MaxQuantity: 'OMP85_0057',
  EffectivePeriod: 'OMP85_0053'
}
