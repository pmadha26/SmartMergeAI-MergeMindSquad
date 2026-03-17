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
import {
    MashupMapperResponse,
    MashupMapperResponseChain,
    MashupResponseMapper,
} from '../state/mashup/mashup-rsp-processor.service';
import { AlertCount } from '../state/types/return.interface';
import { Entity } from '../state/types/base-types';

export class AlertMapper implements MashupResponseMapper {

    constructor(
    ){ }

    mapResponse(
        mashupResponse: Record<string, any> | Record<string, any>[],
        mashupMapperChain: MashupMapperResponseChain
    ): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
        entities: [],
        actions: [],
        };
        if (Array.isArray(mashupResponse)) {
            mashupResponse.forEach(mr => {
                this.mapAlertCount({
                    ...mr.response.Page, 
                    OrderHeaderKey: mashupMapperChain.options?.returnId
                }, mapperResponse.entities);
            });
        }
        return mapperResponse;
    }

    public mapAlertCount(page: any, entities: Entity[]) {
        const entity = {
        entity_type: Constants.ENTITY_TYPE_ALERT_ACOUNT,
        id: page.OrderHeaderKey,
        alertCount: page.Output.InboxList.TotalNumberOfRecords
        } as AlertCount;
        entities.push(entity);
    }
}
