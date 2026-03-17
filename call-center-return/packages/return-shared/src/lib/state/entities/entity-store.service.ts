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

import { Injectable } from '@angular/core';
import { Action, Store } from '@ngrx/store';
import {
  customEntitySelector,
  getEntities,
  getEntitiesByIds,
  getEntityById,
  deleteEntities,
  deleteEntity,
  deleteEntityType
} from './entity.actions';
import { AppState, Entity } from '../types/base-types';
import { map } from 'rxjs/operators';
import { BucBaseUtil } from '@buc/svc-angular';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class EntityStoreService {
  constructor(private store$: Store<AppState>) {}

  public getEntityById<T extends Entity>(
    id: string,
    type: string,
    customEntitySelector?: customEntitySelector
  ): Observable<T> {
    return this.store$
      .select(getEntityById(id, type))
      .pipe(
        map((entity) =>
          this._projectSelectedEntities(
            customEntitySelector,
            { name: 'getEntityById', params: { id, type } },
            { [type]: [entity] }
          )
        )
      ) as Observable<T>;
  }

  public getEntitiesByIds(
    toFetch: { [type: string]: Array<string> },
    customEntitySelector?: customEntitySelector
  ) : Observable<Record<string, Entity[]>> {
    return this.store$
      .select(getEntitiesByIds(toFetch))
      .pipe(
        map((entities) =>
          this._projectSelectedEntities(
            customEntitySelector,
            { name: 'getEntityByIds', params: { toFetch } },
            entities
          )
        )
      ) as Observable<Record<string, Entity[]>>;
  }

  public getEntities(selectorFn: customEntitySelector) : Observable<Record<string, Entity[]>> {
    return this.store$.select(getEntities(selectorFn))
        .pipe(map((selection) => {
            if(!BucBaseUtil.isVoid(selection)) {
                if((selection as Action).type) {
                    this.store$.dispatch(selection as Action);
                } else {
                    return selection as Record<string, Entity[]>;
                }
            }
            return undefined;
        }));
  }

  public deleteEntites(entities: Array<{id: string; type: string}>) {
    this.store$.dispatch(deleteEntities({
      entities
    }));
  }

  public deleteEntity(id: string, name: string) {
    this.store$.dispatch(deleteEntity({id, name}));
  }

  public deleteEntityOfType(name: string) {
    this.store$.dispatch(deleteEntityType({name}));
  }

  public getStore(): Store<AppState> {
    return this.store$;
  }

  public dispatchAction(action: Action): void {
    this.store$.dispatch(action);
  }

  private _projectSelectedEntities(
    customEntitySelector: customEntitySelector,
    params: any,
    entities: Record<string, Entity[]>
  ): Entity | Record<string, Entity[]> {
    if (typeof customEntitySelector === 'function') {
      const toReturn = customEntitySelector({ ...params, entities });
      if (
        !BucBaseUtil.isVoid(toReturn) &&
        (toReturn as Action).type !== undefined
      ) {
        // dispatch the action from the custom entity selector and return the currently selected entity
        this.store$.dispatch(toReturn as Action);
      } else if (!BucBaseUtil.isVoid(toReturn)) {
        // return whatever the entity selector provided.
        return toReturn as Record<string, Entity[]>;
      }
    }
    return params.name === 'getEntityById'
      ? Object.values(entities)[0][0]
      : entities;
  }
}
