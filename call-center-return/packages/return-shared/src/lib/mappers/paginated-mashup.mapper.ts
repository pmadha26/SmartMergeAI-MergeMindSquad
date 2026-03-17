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
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from '../state/mashup/mashup-rsp-processor.service';
import { Entity } from '../state/types/base-types';
import { BucBaseUtil } from '@buc/svc-angular';
import { PaginationModel } from '../state/mashup/mashup.actions';
import * as PaginationActions from '../state/pagination/pagination.actions';
import { getArray } from '@buc/common-components';

export abstract class PaginatedMashupResponseMapper implements MashupResponseMapper {
    
    mapResponse(mashupResponse: Record<string, any> | Record<string, any>[], mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
            entities: [],
            actions: []
        };

        const pageId: string = mashupMapperChain.options.pageId;
        const page: any = get(mashupResponse, '0.response.Page');
        if (!BucBaseUtil.isVoid(page)) {
            const pageModel: PaginationModel = this.mapPaginationModel(page);
            const allEntities = this.mapResponseEntities(get(page, this.getEntityPath(), []), mashupMapperChain);
            const entities = getArray(allEntities.entities);
            mapperResponse.entities = entities.concat(...getArray(allEntities.additionalEntities));

            mapperResponse.actions.push(
                PaginationActions.pageLoadSuccess({
                    id: pageId,
                    pageModel,
                    pageData: entities
                })
            );
        }

        return mapperResponse;
    }

    protected mapPaginationModel(page: any): PaginationModel {
        const paginationModel: PaginationModel = {
            IsFirstPage: page.IsFirstPage,
            IsLastPage: page.IsLastPage,
            IsValidPage: page.IsValidPage,
            LastRecord: page.LastRecord,
            PageNumber: Number.parseInt(page.PageNumber),
            pageSize: Number.parseInt(page.PageSize),
            TotalNumberOfPages: Number.parseInt(page.TotalNumberOfPages),
        };
        const totalNoOfRecords = get(page, [ 'Output', this.getOutputListType(), 'TotalNumberOfRecords']);
        paginationModel.TotalNumberOfRecords = totalNoOfRecords ? Number.parseInt(totalNoOfRecords) : undefined;
        return paginationModel;
    }

    /**
     * This allows the subclass to specify the property from which to read the TotalNumberOfRecords for the page
     */
    abstract getOutputListType(): string;

    /**
     * This allows the subclass to pick up the objects to iterate over to map the response entities.
     */
    abstract getEntityPath(): string;

    /**
     * This allows subclasses to map the entities identified by the <code>getEntityPath</code> method.
     * @param responseEntities 
     * @param mapperChain 
     */
    abstract mapResponseEntities(responseEntities: Array<any>, mapperChain?: MashupMapperResponseChain): { entities: Array<Entity>, additionalEntities: Array<Entity>};
}
