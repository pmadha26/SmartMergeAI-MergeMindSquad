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

import { createReducer, on } from "@ngrx/store";
import * as EntityActions from "./entity.actions";
import { Entity, EntityStore } from "../types/base-types";

export const entityReducer = createReducer({},
    on(EntityActions.upsertEntity, (state: Record<string, EntityStore>, action) => _upsert(state, action.entity)),
    on(EntityActions.upsertEntities, (state: Record<string, EntityStore>, action) => _upsertEntities(state, action.entities)),
    on(EntityActions.deleteEntity, (state: Record<string, EntityStore>, action) => _deleteEntity(state, action.id, action.name)),
    on(EntityActions.deleteEntities, (state: Record<string, EntityStore>, action) => _deleteEntities(state, action.entities)),
    on(EntityActions.deleteEntityType, (state: Record<string, EntityStore>, action) => _deleteEntityType(state, action.name)),
);

function _deleteEntities(entities: Record<string, EntityStore>, toDelete: Array<{id: string, type: string}>): Record<string, EntityStore> {
    const groupedEntities: Record<string, Array<string>> = toDelete.reduce((p, td) => {
        const idList = p[td.id] || [];
        idList.push(td.id);
        p[td.id] = idList;
        return p;
    }, {});

    return Object.assign({}, entities,
        ...Object.keys(groupedEntities).map(et => {
            const existing = entities[et];
            const allIds = existing.allIds.filter(i => !groupedEntities[et].includes(i));
            const byId = allIds.reduce((p, i) => p[i] = existing.byId[i], {});
            return {
                [et]: {
                    byId,
                    allIds
                }
            };
        })
    );
}

function _deleteEntity(entities: Record<string, EntityStore>, toDelete: string, type: string): Record<string, EntityStore> {
    const entityStore = entities[type];
    if (entityStore !== undefined) {
        const updatedStore: EntityStore = {
            byId: Object.assign({}, entityStore.byId),
            allIds: entityStore.allIds ? entityStore.allIds.filter(i => i !== toDelete) : []
        };
        delete updatedStore.byId[toDelete];
        return Object.assign({}, entities, {[type]: updatedStore});
    }
    return entities;
}

function _upsertEntities(entities: Record<string, EntityStore>, toUpsert: Array<Entity>): Record<string, EntityStore> {
    const entityStoreUpdates: Record<string, EntityStore> = toUpsert.reduce((prev, entity) => {
        const entityType: string = entity.entity_type;
        const entityId = entity.id;

        const entityStore: EntityStore = prev[entityType] || { byId: {}, allIds: []};
        entityStore.byId[entityId] = entity;
        entityStore.allIds.push(entityId);

        prev[entityType] = entityStore;
        return prev;
    }, {} as Record<string, EntityStore>);

    return Object.assign({}, entities, ...Object.keys(entityStoreUpdates).map(eType => {
        const updates = entityStoreUpdates[eType];
        const existingEntityStore = entities[eType] || { byId: {}, allIds: [] };
        const byId = Object.assign({}, existingEntityStore.byId, updates.byId);
        return {
            [eType]: {
                byId,
                allIds: Object.keys(byId),
            },
        };
    }));
}
function _deleteEntityType(entities: Record<string, EntityStore>, entityType: string): Record<string, EntityStore> {
    return {
        ...entities,
        [entityType]: {
            byId: {},
            allIds: [],
        },
    };
}

function _upsert(entities: Record<string, EntityStore>, toUpsert: Entity): Record<string, EntityStore> {
    const entityType = toUpsert.entity_type;
    const entityStore: EntityStore = entities[entityType];
    return Object.assign({}, entities, { [entityType]: _upsertEntity(entityStore, toUpsert) });
}

function _upsertEntity(entityStore: EntityStore, toUpsert: Entity): EntityStore {
    const id: string = toUpsert.id;
    const byId = Object.assign({}, entityStore.byId, { [id]: toUpsert });
    return {
        byId,
        allIds: Object.keys(byId),
    };
}
