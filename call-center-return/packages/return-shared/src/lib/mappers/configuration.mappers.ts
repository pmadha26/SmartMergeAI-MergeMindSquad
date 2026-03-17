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

import { BucBaseUtil } from '@buc/svc-angular';
import { get } from 'lodash';
import * as ConfigurationActions from '../state/configuration/configuration.actions';
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from '../state/mashup/mashup-rsp-processor.service';
import { CommonCode } from '../state/configuration/configuration.types';

/**
 * The common code response mapper is a generic mapper for all types of common codes.
 */
export class CommonCodeResponseMapper implements MashupResponseMapper {
    
    public mapResponse(mashupResponse: Array<Record<string, any>>, mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
            entities: [],
            actions: []
        };
        if (Array.isArray(mashupResponse)) {
            const commonCodes = mashupResponse.map(mr => {
                const codeType = get(mr, 'input.mashupInput.CommonCode.CodeType');
                const commonCodeList = this.mapCommonCodeList(mr.response.CommonCodeList.CommonCode, codeType);
                return {
                    [codeType ? codeType : commonCodeList[0].type]: commonCodeList
                }
            });
            mapperResponse.actions.push(ConfigurationActions.setCommonCode({input: commonCodes}));
        }
        return mapperResponse;
    }

    private mapCommonCodeList(commonCodeList: Array<any>, type: string): Array<CommonCode> {
        if (Array.isArray(commonCodeList)) {
            return commonCodeList.map(cc => ({
                name: cc.CodeName,
                description: cc.CodeShortDescription,
                longDescription: cc.CodeLongDescription,
                value: cc.CodeValue,
                type: type ? type : cc.CodeType,
                organizationCode: cc.OrganizationCode,
                documentType: cc.DocumentType
            }));
        } else {
            return [];
        }
    }
}
