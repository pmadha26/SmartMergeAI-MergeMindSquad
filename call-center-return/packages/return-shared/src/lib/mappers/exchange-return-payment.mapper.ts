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
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from '../state/mashup/mashup-rsp-processor.service';
import { ExchangeOrder } from '../state/types/order.interface';
import { Return } from '../state/types/return.interface';
import { ExchangeOrderMapper } from './exchange-order.mapper';
import { ReturnOrderMapper } from './return.mapper';

export class ExchangeReturnPaymentMapper implements MashupResponseMapper {
    constructor(
        private exchangeOrderMapper: ExchangeOrderMapper = new ExchangeOrderMapper(),
        private returnOrderMapper: ReturnOrderMapper = new ReturnOrderMapper()
      ){ }

    mapResponse(mashupResponse: Record<string, any> | Record<string, any>[], mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
            entities: [],
            actions: []
        };

        if (Array.isArray(mashupResponse)) {
            mapperResponse.entities.push(...mashupResponse.map(mr => this._mapExchangeOrder(mr.response.Order)));
            mapperResponse.entities.push(...mashupResponse.map(mr => this._mapReturnOrder(mr.response.Order.Return.Order)));
        }

        return mapperResponse;
    }

    private _mapExchangeOrder(exchangeOrder: Record<string, any>): ExchangeOrder {
        return this.exchangeOrderMapper.mapExchangeOrder(exchangeOrder);
    }

    private _mapReturnOrder(returnOrder: Record<string, any>): Return {
        return this.returnOrderMapper.mapReturn(returnOrder);
    }

}
