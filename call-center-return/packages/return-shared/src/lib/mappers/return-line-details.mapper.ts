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
import { ReturnLineDetails } from '../state/types/return.interface';
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from '../state/mashup/mashup-rsp-processor.service';

export class ReturnLineDetailsMapper implements MashupResponseMapper {

    mapResponse(mashupResponse: Record<string, any> | Record<string, any>[], mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
            entities: [],
            actions: []
        };
        if (Array.isArray(mashupResponse)) {
            mapperResponse.entities.push(...mashupResponse.map(mr => this.mapReturnLineDetails(mr.response.OrderLine)));
        }
        return mapperResponse;
    }
    

    mapReturnLineDetails(re: any): ReturnLineDetails {
        return {
            entity_type: Constants.ENTITY_TYPE_RETURN_LINE_DETAILS,
            id: re.OrderLineKey,
            rawData: re,
            itemId: re.ItemDetails.ItemID,
            itemDescription: re.ItemDetails.PrimaryInformation.ShortDescription,
            description: re.ItemDetails.PrimaryInformation.Description,
            extendedDisplayDescription: re.ItemDetails.PrimaryInformation.ExtendedDisplayDescription,
            itemImageUrl:this._constructImageUrl(re.ItemDetails),
            isBundleParent: re.IsBundleParent,
            uom: re.ItemDetails.UnitOfMeasure,
            lineNo: re.PrimeLineNo,
            quantity: re.OrderedQty,
            status: re.Status,
            maxLineStatus: re.MaxLineStatus,
            displayStatus: re.DisplayStatus,
            returnMethodId: re.DeliveryMethod,
            kitCode: re.ItemDetails.PrimaryInformation.KitCode,
            importantEvents: re.importantEvents
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
