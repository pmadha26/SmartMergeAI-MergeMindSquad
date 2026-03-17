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
import { ReturnLine } from '../state/types/return.interface';
import { PaginatedMashupResponseMapper } from './paginated-mashup.mapper';

export class ReturnLineMapper extends PaginatedMashupResponseMapper {

    mapResponseEntities(responseEntities: any[]): { entities: Entity[]; additionalEntities: Entity[]; } {
        const toReturn = {
            entities: [],
            additionalEntities: []
        };
        responseEntities.forEach(re => toReturn.entities.push(this.mapReturnLine(re)));
        return toReturn;
    }

    getOutputListType(): string {
        return 'OrderLineList';
    }

    getEntityPath(): string {
       return 'Output.OrderLineList.OrderLine';
    }
    
    mapReturnLine(re: any): ReturnLine {
        return {
            entity_type: Constants.ENTITY_TYPE_RETURN_LINE,
            id: re.OrderLineKey,
            rawData: re,
            itemId: re.ItemDetails.ItemID,
            itemDescription: re.ItemDetails.PrimaryInformation.ShortDescription,
            extendedDisplayDescription: re.ItemDetails.PrimaryInformation.ExtendedDisplayDescription,
            itemImageUrl:this._constructImageUrl(re.ItemDetails),
            isBundleParent: re.IsBundleParent,
            bundleParentOrderlineKey: re.BundleParentLine?.OrderLineKey,
            derivedFromBundleParentOrderlineKey: re.DerivedFromOrderLine?.BundleParentOrderLineKey,
            isLinePriceForInformationOnly: re.LinePriceInfo?.IsLinePriceForInformationOnly,
            allowedModifications: re.Modifications?.Modification?.map(mod => ({
                isAllowed: mod.ModificationAllowed === 'Y',
                type: mod.ModificationType
              })) || [],
            lineNo: re.PrimeLineNo,
            lineType: re.LineType,
            holdFlag: re.HoldFlag === 'Y',
            invoicedQty: re.InvoicedQuantity,
            quantity: re.OrderedQty,
            modificationQty: re.ModificationQty,
            availableQtyForCancelAndStopDelivery: re.AvailableQtyForCancelAndStopDelivery,
            uom: re.Item.UnitOfMeasure,
            reason: {
                id: re.ReturnReason,
                name: re.ReturnReasonShortDesc,
            },
            status: re.Status,
            maxLineStatus: re.MaxLineStatus,
            displayStatus: re.DisplayStatus,
            unitPrice: {
                currencyCode: re.Order[0].PriceInfo.Currency,
                value: re.LineOverallTotals.DisplayUnitPrice
            },
            returnId: re.Order[0].OrderHeaderKey,
            returnMethodId: re.DeliveryMethod,
            returnMethod: {
                id: re.DeliveryMethod,
                name: re.DeliveryMethodDesc,
                entity_type: 'return_method',
                type: re.DeliveryMethod
            },
            // Mapping the exact response for the below three properties because these values are used in common component - ReturnLinePricingSummaryModalComponent
            lineOverallTotals: re.LineOverallTotals,
            lineCharges: re.LineCharges,
            lineTaxes: re.LineTaxes,
            derivedFromOrderLineKey: re.DerivedFromOrderLineKey,
            kitCode: re.ItemDetails.PrimaryInformation.KitCode,
            orderLineTranQuantity: re.OrderLineTranQuantity,
            stopDeliveryRequestDetails: re.StopDeliveryRequestDetails
        };
    }

    private _constructImageUrl(itemDetails: any): string {
        const primaryInfo = get(itemDetails, 'PrimaryInformation');
        if (primaryInfo && primaryInfo.ImageLocation && primaryInfo.ImageID) {
            return `${primaryInfo.ImageLocation}/${primaryInfo.ImageID}`
        }
        return '';
    }

}
