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
import { Entity } from '../state/types/base-types';
import { OrderLine, StopDeliveryRequestDetail, StopDeliveryRequestDetails } from '../state/types/order.interface';
import { PaginatedMashupResponseMapper } from './paginated-mashup.mapper';
import { getArray } from '@buc/common-components';
import { TransactionViolation } from '../state/types/return.interface';
import { MashupMapperResponseChain } from '../state/mashup/mashup-rsp-processor.service';

export class OrderLineMapper extends PaginatedMashupResponseMapper {

  constructor(private entityName = Constants.ENTITY_TYPE_ORDER_LINE) {
    super()
  }

  getOutputListType(): string {
    return 'OrderLineList';
  }

  getEntityPath(): string {
    return 'Output.OrderLineList.OrderLine';
  }

  mapResponseEntities(responseEntities: any[], mapperChain?: MashupMapperResponseChain): {
    entities: Entity[];
    additionalEntities: Entity[];
  } {

    const returnOrderKey: string = get(mapperChain, 'options.returnOrderKey');
    const toReturn = {
      entities: [],
      additionalEntities: [],
    };

    responseEntities.forEach((re) =>
      toReturn.entities.push(this.mapOrderLine(re, returnOrderKey))
    );
    return toReturn;
  }

  mapOrderLine(re: any, returnOrderKey: string): OrderLine {
    const orderLine: OrderLine = {
      entity_type: this.entityName,
      id: re.OrderLineKey,
      rawData: re,
      itemId: re.ItemDetails.ItemID,
      itemDescription: re.ItemDetails.PrimaryInformation.ShortDescription,
      isShippingAllowed: re.ItemDetails.PrimaryInformation.IsShippingAllowed,
      isPickupAllowed: re.ItemDetails.PrimaryInformation.IsPickupAllowed,
      itemImageUrl: this._constructImageUrl(re.ItemDetails),
      lineNo: re.PrimeLineNo,
      quantity: re.OrderedQty,
      kitQty: re.KitQty,
      productClass: re.Item.ProductClass,
      uom: re.Item.UnitOfMeasure,
      status: re.Status,
      displayStatus: re.DisplayStatus,
      unitPrice: {
        currencyCode: get(re, 'Order[0].PriceInfo.Currency') ?? get(re, 'Order.PriceInfo.Currency'),
        value: re.LineOverallTotals?.DisplayUnitPrice,
      },
      lineTotal: re.LineOverallTotals?.LineTotal,
      reason: {
        id: re?.ReturnReason,
        name: undefined,
      },
      lineAdjustments: re.LineOverallTotals?.LineAdjustments,
      orderId:  get(re, 'Order[0].OrderHeaderKey') ?? get(re, 'Order.OrderHeaderKey'),
      orderNo: get(re, 'Order[0].OrderNo') ?? get(re, 'Order.OrderNo'),
      orderDate: get(re, 'Order[0].OrderDate') ?? get(re, 'Order.OrderDate'),
      reshipParentLineKey: re.ReshipParentLineKey,
      isLinePriceForInformationOnly: re.LinePriceInfo?.IsLinePriceForInformationOnly,
      listPrice: re.LinePriceInfo?.ListPrice,
      giftFlag: re.GiftFlag,
      hasNotes: re.HasNotes,
      hasReturnLines: re.HasReturnLines,
      isBundleParent: re.IsBundleParent,
      bundleParentOrderlineKey: re.BundleParentLine?.OrderLineKey,
      kitCode: re.ItemDetails.PrimaryInformation.KitCode,
      reshippedQty: re.ReshippedQty,
      numberOfInstructions: re.Instructions?.NumberOfInstructions,
      stopDeliveryRequestDetails: this._mapStopDeliveryRequestDetails(re.StopDeliveryRequestDetails),
      returnableQuantity: re.ReturnableQty,
      nonApprovalTransactionViolations: this._mapNonApprovalTransactionViolations(re.ReturnPolicyViolations),
      transactionApproverList: this._mapTransactionApproverList(re.ReturnPolicyViolations),
      returnLines: getArray(get(re, 'ReturnOrderLines.OrderLine')),
      relatedLines: getArray(get(re, 'ChildOrderLineRelationships.OrderLineRelationship')).map(i => ({
        itemId: i.ChildLine.ItemDetails.ItemID,
        itemDescription: i.ChildLine.ItemDetails.PrimaryInformation.ShortDescription,
        itemImageUrl: this._constructImageUrl(i.ChildLine.ItemDetails),
        itemDetails: i.ChildLine.ItemDetails,
        orderLineKey: i.ChildOrderLineKey,
        primeLineNo: i.ChildLine.PrimeLineNo,
    })),
    parentLine: {
        lineNo: get(re, 'ParentOrderLineRelationships.OrderLineRelationship.ParentLine.PrimeLineNo', ''),
        itemDesc: get(re, 'ParentOrderLineRelationships.OrderLineRelationship.ParentLine.ItemDetails.PrimaryInformation.ShortDescription', '')
    }
    };
    const existingReturnLine = orderLine.returnLines.find(r => r.OrderHeaderKey === returnOrderKey);
    if (existingReturnLine) {
      // for existing return lines, the returnable quantity is sum of existing + returnable
      orderLine.returnableQuantity = parseFloat((Number(orderLine.returnableQuantity.valueOf()) + Number(existingReturnLine.OrderedQty).valueOf()).toString()).toFixed(2);
    }
    return orderLine;
  }

  private _mapStopDeliveryRequestDetails(sdrDetails): StopDeliveryRequestDetails {
    const stopDeliveryRequestDetail: StopDeliveryRequestDetail[] = [];
    if (sdrDetails) {
      sdrDetails.StopDeliveryRequestDetail?.forEach(i =>
        stopDeliveryRequestDetail.push({ requestedQty: i.RequestedQty, successfulQty: i.SuccessfulQty })
      );
    }
    return {
      stopDeliveryRequestDetail,
      totalNumberOfRecords: sdrDetails?.TotalNumberOfRecords
    }
  }

  private _mapNonApprovalTransactionViolations(returnPolicyViolations: any): Array<TransactionViolation> {
    if (returnPolicyViolations !== undefined && returnPolicyViolations.NonApprovalTransactionViolationList !== undefined) {
      return getArray(returnPolicyViolations.NonApprovalTransactionViolationList.TransactionViolation).map(v => ({
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

  private _mapTransactionApproverList(returnPolicyViolations: any): Array<TransactionViolation> {
    if (returnPolicyViolations !== undefined && returnPolicyViolations.TransactionApproverList?.TransactionApprover !== undefined) {
      const violations = [];
      getArray(returnPolicyViolations.TransactionApproverList.TransactionApprover).forEach(approver =>
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

  private _constructImageUrl(itemDetails: any): string {
    const primaryInfo = get(itemDetails, 'PrimaryInformation');
    if (primaryInfo && primaryInfo.ImageLocation && primaryInfo.ImageID) {
      return `${primaryInfo.ImageLocation}/${primaryInfo.ImageID}`;
    }
    return '';
  }
}
