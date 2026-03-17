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
import { ExchangeLine } from '../state/types/order.interface';
import { PaginatedMashupResponseMapper } from './paginated-mashup.mapper'
import { MashupMapperResponseChain } from '../state/mashup/mashup-rsp-processor.service';

export class ExchangeLineMapper extends PaginatedMashupResponseMapper {
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

    const toReturn = {
      entities: [],
      additionalEntities: [],
    };

    responseEntities.forEach((re) =>
      toReturn.entities.push(this.mapOrderLine(re))
    );
    return toReturn;
  }

    mapOrderLine(re: any): ExchangeLine {
        const orderLine: ExchangeLine = {
            entity_type: Constants.ENTITY_TYPE_EXCHANGE_ORDER_LINE,
            id: re.OrderLineKey,
            enterpriseCode:re.Order[0].EnterpriseCode,
            rawData: re,
            itemId: re.ItemDetails.ItemID,
            itemKey: re.ItemDetails.ItemKey,
            itemDescription: re.ItemDetails.PrimaryInformation.ShortDescription,
            kitCode: re.ItemDetails.PrimaryInformation.KitCode,
            parentItemId: re.ItemDetails.ClassificationCodes?.Model,
            itemImageUrl: this._constructImageUrl(re.ItemDetails),
            lineNo: re.PrimeLineNo,
            quantity: re.OrderedQty,
            modificationQty: re.ModificationQty,
            availableQtyForCancelAndStopDelivery: re.AvailableQtyForCancelAndStopDelivery,
            variation: re.ItemDetails.Variation,
            productClass: re.Item?.ProductClass,
            uom: re.Item?.UnitOfMeasure,
            status: re.Status,
            maxLineStatus: re.MaxLineStatus,
            displayStatus: re.DisplayStatus,
            unitPrice: {
                currencyCode: re.Order[0].PriceInfo.Currency,
                value: re.LineOverallTotals.DisplayUnitPrice,
            },
            lineTotal: re.LineOverallTotals.LineTotal,
            lineAdjustments: re.LineOverallTotals?.LineAdjustments,
            orderId: re.Order[0].OrderHeaderKey,
            reshipParentLineKey: re.ReshipParentLineKey,
            isLinePriceForInformationOnly: re.LinePriceInfo?.IsLinePriceForInformationOnly,
            giftFlag: re.GiftFlag,
            holdFlag: re.HoldFlag,
            hasNotes: re.HasNotes,
            hasReturnLines: re.HasReturnLines,
            isBundleParent: re.IsBundleParent,
            bundleParentOrderlineKey: re.BundleParentLine?.OrderLineKey,
            reshippedQty: re.ReshippedQty,
            numberOfInstructions: re.Instructions?.NumberOfInstructions,
            earliestShipDate: re.EarliestShipDate,
            deliveryMethod: re.DeliveryMethod,
            deliveryMethodDesc: re.DeliveryMethodDesc,
            lineOverallTotals: re.LineOverallTotals,
            lineCharges: re.LineCharges,
            lineTaxes: re.LineTaxes,
            allowedModifications: re.Modifications?.Modification?.map(mod => ({
              isAllowed: mod.ModificationAllowed === 'Y',
              type: mod.ModificationType
            })) || [],
            orderLineTranQuantity: re.OrderLineTranQuantity,
            stopDeliveryRequestDetails: re.StopDeliveryRequestDetails
        };

        return orderLine;
    }


  private _constructImageUrl(itemDetails: any): string {
    const primaryInfo = get(itemDetails, 'PrimaryInformation');
    if (primaryInfo && primaryInfo.ImageLocation && primaryInfo.ImageID) {
      return `${primaryInfo.ImageLocation}/${primaryInfo.ImageID}`;
    }
    return '';
  }
}
