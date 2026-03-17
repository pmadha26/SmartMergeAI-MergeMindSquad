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

import { Action, createAction, createSelector, props } from '@ngrx/store';
import { AppState, Entity, EntityStore, SelectorFnParams } from '../types/base-types';
import { get } from 'lodash';
import { LineNote, Note } from '../types/return.interface';
import { Constants } from '../../common/return.constants';

/**
 * Action to upsert entity
 */
export const upsertEntity = createAction('[entity: upsert]', props<{entity: Entity}>());

/**
 * Action to upsert multiple entities. Entities need not be of the same type
 */
export const upsertEntities = createAction('[entity: multiple upsert]', props<{entities: Array<Entity>}>());

/**
 * Action to delete entity
 */
export const deleteEntity = createAction('[entity: delete]', props<{id: string, name: string}>());

/**
 * Action to delete multiple entities
 */
export const deleteEntities = createAction('[entity: multiple delete]', props<{entities: Array<{id: string, type: string}>}>());

/**
 * Action to delete entity with entity type
 */
export const deleteEntityType = createAction('[entity: delete entity based on type]', props<{ name: string}>());

/**
 * The generic no-op action
 */
export const NO_OP_ACTION = createAction('No-op action');

/**
 * Selects the entity store
 * @param store The application state
 * @returns The entities
 */
const selectEntities = (store: AppState) => store.entities;

export type customEntitySelector = (params: SelectorFnParams) => Entity | Record<string, Entity[]> | Action | undefined;

/**
 * Selects the entity by Id
 * @param id The entity to ind
 * @param type The type of entity
 * @returns entity
 */
export const getEntityById = (id: string, type: string) => createSelector(
    selectEntities,
    (entities: Record<string, EntityStore>) => get(entities, [type, 'byId', id]) as Entity
);

export const getEntitiesByIds = (toFetch: {[type: string]: Array<string>}) => createSelector(
    selectEntities,
    (entities: Record<string, EntityStore>) => Object.keys(toFetch).reduce((prev, type) => {
        const entityStore: Record<string, Entity> = get(entities, [type, 'byId'], {}) as Record<string, Entity>;
        prev[type] = toFetch[type].map(i => entityStore[i]);
        return prev;
    }, {} as Record<string, Array<Entity>>)
);

export const getEntities = (customEntitySelector: customEntitySelector) => createSelector(
    selectEntities,
    (entities: Record<string, EntityStore>) => customEntitySelector(entities)
);

export const selectLineNoteEntity = createSelector(
    selectEntities,
    (entities: Record<string, EntityStore>) => get(entities, Constants.ENTITY_TYPE_LINE_NOTES) as EntityStore
);

export const selectExchangeLineNoteEntity = createSelector(
    selectEntities,
    (entities: Record<string, EntityStore>) => get(entities, Constants.ENTITY_TYPE_EXCHANGE_LINE_NOTES) as EntityStore
);

export const getAllLineNotes = createSelector(
    selectLineNoteEntity,
    (lineNoteEntity: EntityStore) => lineNoteEntity?.allIds?.map(noteId => lineNoteEntity.byId[noteId]) as LineNote[]
);

export const getAllExchangeLineNotes = createSelector(
    selectExchangeLineNoteEntity,
    (lineNoteEntity: EntityStore) => lineNoteEntity?.allIds?.map(noteId => lineNoteEntity.byId[noteId]) as LineNote[]
);

export const getLineNote = (orderLineKey: string) => createSelector(
  getAllLineNotes,
  (lineNotes: LineNote[]) => lineNotes.find(n => n.id === orderLineKey)?.notes as Note[]
)

export const getExchangeLineNote = (orderLineKey: string) => createSelector(
    getAllExchangeLineNotes,
    (lineNotes: LineNote[]) => lineNotes.find(n => n.id === orderLineKey)?.notes as Note[]
  )

