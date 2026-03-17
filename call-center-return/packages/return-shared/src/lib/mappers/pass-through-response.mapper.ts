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

import { get } from "lodash";
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from "../state/mashup/mashup-rsp-processor.service";
import { Entity } from "../state/types/base-types";
import { getArray } from "@buc/common-components";

export class PassthroughResponseMapper implements MashupResponseMapper {

  private normalizedIdPaths: Array<string>;

  constructor(private entityType: string, private idPath: string) {
    this.normalizedIdPaths = this.idPath.split('.[].');
  }

  mapResponse(mashupResponse: Record<string, any> | Record<string, any>[], mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
    const mapperResponse: MashupMapperResponse = {
      entities: [],
    };
    if (Array.isArray(mashupResponse)) {
      mashupResponse.forEach(mr => this._mapEntity(mr.response, mapperResponse.entities));
    }

    return mapperResponse;
  }

  private _mapEntity(responseEntity: any, entities: Entity[]) {
    if (this.normalizedIdPaths.length > 1) {
      const objects: Array<any> = this.normalizedIdPaths.slice(0, this.normalizedIdPaths.length - 1)
        .reduce((prev, curr, idx) => {
          return (Array.isArray(prev)) 
            ? prev.map(p => get(p, curr))
            : getArray(get(prev, curr));
        }, responseEntity);
      entities.push(
        ...objects
          .filter(o => o === undefined)
          .map(o => ({
            entity_type: this.entityType,
            id: get(o, this.normalizedIdPaths[this.normalizedIdPaths.length - 1]),
            ...o
          }))
      );
    } else {
      entities.push({
        entity_type: this.entityType,
        id: get(responseEntity, this.idPath),
        ...responseEntity
      });
    }
  }

}
