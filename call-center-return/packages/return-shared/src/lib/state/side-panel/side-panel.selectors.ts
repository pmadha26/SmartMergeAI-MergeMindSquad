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

import { createSelector } from "@ngrx/store";
import { get } from "lodash";
import { Constants } from "../../common/return.constants";
import { AppState, EntityStore } from "../types/base-types";
import { Note } from "../types/return.interface";

const selectEntities = (store: AppState) => store.entities;

export const selectNoteEntity = createSelector(
    selectEntities,
    (entities: Record<string, EntityStore>) => get(entities, Constants.ENTITY_TYPE_NOTE) as EntityStore
);

export const selectExchangeNoteEntity = createSelector(
    selectEntities,
    (entities: Record<string, EntityStore>) => get(entities, Constants.ENTITY_TYPE_EXCHANGE_NOTES) as EntityStore
);

export const getAllNotes = createSelector(
    selectNoteEntity,
    (noteEntity: EntityStore) => noteEntity?.allIds?.map(noteId => noteEntity.byId[noteId]) as Note[]
);

export const getAllExchangeNotes = createSelector(
    selectExchangeNoteEntity,
    (noteEntity: EntityStore) => noteEntity?.allIds?.map(noteId => noteEntity.byId[noteId]) as Note[]
);

export const getNotesCount = createSelector(
    getAllNotes,
    (notes: Note[]) => notes?.length || 0
);
