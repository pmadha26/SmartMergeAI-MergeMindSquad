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
import { ShipmentReturnMethod } from '../state/types/return.interface';

export class ReturnShipmentMethodsMapper implements MashupResponseMapper {

private readonly SHIPMENTS_LINE_PATH = 'ShippingGroups.ShippingGroup';

    mapResponse(mashupResponse: Record<string, any> | Record<string, any>[], mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
            entities: [],
            actions: []
        };
        if (Array.isArray(mashupResponse)) {
            mashupResponse.forEach(mr => {
                const shiments = get(mr.response.Order, this.SHIPMENTS_LINE_PATH, []);
                shiments.forEach(sm => mapperResponse.entities.push(this.mapShipment(sm,mr.response.Order)))
            });
        }
        return mapperResponse;
    }

    public mapShipment(sm: Record<string, any>,order: Record<string, any>): ShipmentReturnMethod {
        return {
          entity_type: Constants.ENTITY_TYPE_SHIPMENT,
          rawData: sm,
          name:order.OrderName,
          type:order.OrderHeaderKey,
          id: order.OrderHeaderKey,
          trackingInfoIds: order.OrderHeaderKey,
          trackingNumber: order.ShipToKey,
          fromAddressId: order.PersonInfoShipTo,
          refundAddressId: order.PersonInfoBillTo,
          toAddressId: sm.ShipNode.ShipNodePersonInfo,
          shipNode: sm.ShipNode,
          shipToKey: order.ShipToKey,
          status: sm?.OrderLines?.OrderLine[0]?.MaxLineStatusDesc || "Shipment yet to be created",
          returnlines: sm.OrderLines?.OrderLine?.map(re=> ({
            id: re.OrderLineKey,
            itemId: re.ItemDetails.ItemID,
            itemDescription: re.ItemDetails.PrimaryInformation.ShortDescription,
            entity_type: Constants.ENTITY_TYPE_RETURN_LINE,
            itemImageUrl:"/",
            lineNo: re.PrimeLineNo,
            quantity: re.OrderedQty,
            uom: re.Item.UnitOfMeasure,
            reason: {
                id: re.ReturnReason,
                name: re.ReturnReasonShortDesc,
            },
            status: re.Status,
            displayStatus: re.Status,
            unitPrice: {
                currencyCode: order.PriceInfo.Currency,
                value: re.LineOverallTotals.DisplayUnitPrice
            },
            returnId: order.OrderHeaderKey,
            returnMethodId: 're.DeliveryMethod',
            returnMethod: {
                id: re.DeliveryMethod,
                name: this.getDeliveryStatus(re.DeliveryMethod),
                entity_type: 'return_method',
                type: re.DeliveryMethod
            }
          })) || [],
        }
    }

    getDeliveryStatus(input) {
      if (input === 'SHP') {
        return 'Shipping';
      }
      else if (input === 'DEL'){
        return 'Delivery';
      }
    }
}
