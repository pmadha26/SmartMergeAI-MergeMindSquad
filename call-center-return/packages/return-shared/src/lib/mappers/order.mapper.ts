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

import { Constants } from '../common/return.constants';
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from '../state/mashup/mashup-rsp-processor.service';
import { Order } from '../state/types/order.interface';

export class OrderMapper implements MashupResponseMapper {

    mapResponse(mashupResponse: Record<string, any> | Record<string, any>[], mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
            entities: [],
            actions: []
        };

        if (Array.isArray(mashupResponse)) {
            mapperResponse.entities.push(...mashupResponse.map(mr => this.mapOrder(mr.response.Order)));
        }

        return mapperResponse;
    }

    public mapOrder(order): Order {
        return {
            entity_type: Constants.ENTITY_TYPE_ORDER,
            id: order.OrderHeaderKey,
            rawData: order,
            orderNo: order.OrderNo,
            enterpriseCode: order.EnterpriseCode,
            billToId: order.BillToID,
            billToKey: order.BillToKey,
            customerEmailId: order.CustomerEMailID,
            customerPhoneNo: order.CustomerPhoneNo,
            customerFirstName: order.CustomerFirstName,
            customerLastName: order.CustomerLastName,
            customerId: order.CustomerContactID,
            documentType: order.DocumentType,
            orderDate: order.OrderDate,
            status: order.Status,
            displayStatus: order.DisplayStatus,
            multipleStatusesExist: order.MultipleStatusesExist === 'Y',
            maxOrderStatusDesc: order.MaxOrderStatusDesc,
            totalLinesInCart: order.TotalNumberOfLinesInCart, // includes lines that are non cancelled parent lines 
            priceInfo: {
                value: order.PriceInfo.TotalAmount,
                currencyCode: order.PriceInfo.Currency
            },
            grandTotal: {
                value: order.OverallTotals.GrandTotal,
                currencyCode: order.PriceInfo.Currency
            },
            personInfoBillTo: order.PersonInfoBillTo,
            personInfoShipTo: order.PersonInfoShipTo,
        };
    }
}
