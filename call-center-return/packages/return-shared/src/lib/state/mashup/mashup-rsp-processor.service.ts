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

import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Action } from '@ngrx/store';
import { MashupActionPayload, PaginagedMashupPayload } from './mashup.actions';
import { AppState, Entity } from '../types/base-types';
import { BucLoggerUtil } from '@buc/svc-angular';

/**
 * Interface for output of mashup mapper. A mashup response could lead to entities being upserted in the store
 * , actions to be dispatched to other trigger other effects or both. The actions are dispatched separately and
 * will not be part of the mashup effect flow. The mashup invocation will always emit an action.
 * The only exception to this rule is when entities is empty and the actions array contains a single action. In this
 * case, the action in the actions array will be dispatched without the upsert-entities action.
 */
export interface MashupMapperResponse {
  /**
   * The entities to push to the store.
   */
  entities: Array<Entity>;
  /**
   * The actions to be dispatched. These actions are dispatched using store.dispatch
   */
  actions?: Array<Action>;
}

export interface MashupMapperResponseChain {
  originalApiResponse: Record<string, any>;
  originalApiInput: Array<MashupActionPayload> | PaginagedMashupPayload;
  currentAppState: AppState;
  mapperResponse: MashupMapperResponse;
  groupedMashupResponse: Record<string, any>;
  options?: any;
}

/**
 * Interface that mappers should extend to convert a mashup response to an array of entities to upsert into the store.
 */
export interface MashupResponseMapper {
  /**
   * Processes a mashup invocation response into entities and further actions to trigger
   *
   * @param mashupResponse The mashup response
   * @param mashupMapperChain The mashup mapper chain. This holds the intermediate results of processing a mashup API response. Should not be modified
   * @return An object with an array of entities extracted from the mashup response. The processor can also optionally provide
   * any actions that need to be dispatched based on the mashup responses. The actions will allow further mashup calls to be made
   * based on the response for the current mashup output.
   */
  mapResponse(
    mashupResponse: Record<string, any> | Array<Record<string, any>>,
    mashupMapperChain: MashupMapperResponseChain
  ): MashupMapperResponse;
}

/**
 * The injection token for registering mashup response mapper implementations
 */
export const MASHUP_RESPONSE_MAPPERS: InjectionToken<
  Record<string, MashupResponseMapper>
> = new InjectionToken('Registers mashup response mapper implementations');

@Injectable()
export class MashupResponseProcessorService {
  private _consolidatedMapperMap: Record<string, MashupResponseMapper> = {};

  constructor(
    @Inject(MASHUP_RESPONSE_MAPPERS)
    responseMappers: Record<string, MashupResponseMapper>[]
  ) {
    if (Array.isArray(responseMappers) && responseMappers.length > 0) {
      responseMappers.forEach((mapperMap) =>
        Object.keys(mapperMap).forEach(
          (k) => (this._consolidatedMapperMap[k] = mapperMap[k])
        )
      );
    }
  }

  /**
   *
   * @param mashupResponse The mashup responses where mashup id is the key and the mashup response is the value.
   * @param currentAppState The current snapshot of the application's state
   * @param options The options provided to the original mashup call
   * @returns A mashup mapper response object.
   */
  public processMashupResponse(
    mashupResponse: Record<string, any>,
    currentAppState: AppState,
    mashupInput: Array<MashupActionPayload>,
    originalApiResponse: Record<string, any>,
    options?: any
  ): MashupMapperResponse {
    let mapperResponse: MashupMapperResponse = { entities: [], actions: [] };

    const mapperChain: MashupMapperResponseChain = {
      currentAppState,
      options,
      originalApiResponse,
      originalApiInput: mashupInput,
      mapperResponse,
      groupedMashupResponse: mashupResponse
    };

    // If we want to process the mashup Ids in the response in a specific way
    const mashupIds: Array<string> = options?.mashupIds || Object.keys(mashupResponse);
    mashupIds.reduce((prev: MashupMapperResponseChain, mashupId: string) => {
      const currentMashup = mashupResponse[mashupId];

      const mashupResponseMapper = this._consolidatedMapperMap[mashupId];
      if (mashupResponseMapper !== undefined) {
        const mappedResponse = mashupResponseMapper.mapResponse(
          currentMashup,
          prev
        );
        if (mappedResponse) {
          if (Array.isArray(mappedResponse.entities)) {
            mappedResponse.entities.forEach((e) =>
              prev.mapperResponse.entities.push(e)
            );
          }
          if (Array.isArray(mappedResponse.actions)) {
            mappedResponse.actions.forEach((a) =>
              prev.mapperResponse.actions.push(a)
            );
          }
        }
      } else {
        BucLoggerUtil.log('@call-center/return-shared', 'MashupResponseProcessorService', 'processMashupResponse', 
          `Could not find a mashup mapper for ${mashupId}`);
      }

      return prev;
    }, mapperChain);

    return mapperResponse;
  }
}
