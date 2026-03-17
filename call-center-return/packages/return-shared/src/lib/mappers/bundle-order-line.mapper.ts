/*
 * IBM Confidential
 * OCO Source Materials
 * 5737-D18, 5725-D10
 *
 * (C) Copyright International Business Machines Corp. 2022, 2025
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
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from '../state/mashup/mashup-rsp-processor.service';
import { OrderLineMapper } from './order-line.mapper';


export class BundleOrderLineMapper implements MashupResponseMapper {

  constructor(private entityName = Constants.ENTITY_TYPE_BUNDLE_ORDER_LINE) {
  }

  getOutputListType(): string {
    return 'OrderLineList';
  }

  getEntityPath(): string {
    return 'Output.OrderLineList.OrderLine';
  }

  mapResponse(mashupResponse: Record<string, any> | Record<string, any>[],
    mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {

    const returnOrderKey: string = get(mashupMapperChain, 'options.returnOrderKey');
    const toReturn = {
      entities: [],
      additionalEntities: [],
    };

    const orderLineMapper = new OrderLineMapper(Constants.ENTITY_TYPE_BUNDLE_ORDER_LINE)

    const orderlinesResponse = get(mashupResponse, '0.response.OrderLineList.OrderLine', []);
    orderlinesResponse.forEach((re) =>
      toReturn.entities.push(orderLineMapper.mapOrderLine(re, returnOrderKey))
    );
    return toReturn;
  }

}
