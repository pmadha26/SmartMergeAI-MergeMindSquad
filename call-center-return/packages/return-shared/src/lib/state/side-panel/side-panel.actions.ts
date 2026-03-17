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

import { createAction, props } from "@ngrx/store";
import { DeleteNote, NewNote, Note } from "../types/return.interface";

export const openNoteDetailsModal = createAction(
  '[SidePanelStateActions]-openNoteDetailsModal',
  props<{ note: Record<string, any>, searchKey: string, categoryType: string, isHistoryOrder: string, initiateEdit?: Function, initiateDelete?: Function }>()
);

export const openAddNoteModal = createAction(
  '[SidePanelStateActions]-openAddNoteModal',
  props<{ returnDetails: Record<string, any>, returnReasons: Array<Record<string, any>>, exchangeReasons?: Array<Record<string, any>>, note?: Note, categoryType?: string,  categoryEditable?: boolean, categoryVisible?: boolean }>()
);

export const openViewAllNotesModal = createAction(
  '[SidePanelStateActions]-openViewAllNoteModal',
  props<{ returnDetails: Record<string, any>, returnReasons: Array<Record<string, any>>, exchangeReasons?: Array<Record<string, any>>, notesList?: Note[], exchangeNotesList?: Note[], lineDetails?: Record<string, any>, categoryType?: string, categoryEditable?: boolean, categoryVisible?: boolean, categoryList?: Array<Record<string, any>>}>()
)

export const editOrAddNewNote = createAction(
  '[SidePanelStateActions]-addNewNote',
  props<{ returnHeaderKey: string, note: NewNote,  updateSaveParameters: () => void , closeModal?: () => void }>()
);

export const deleteNote = createAction(
  '[SidePanelStateActions]-deleteNote',
  props<{ returnHeaderKey: string, note: DeleteNote }>()
);

export const editOrAddNewLineNote = createAction(
  '[SidePanelStateActions]-addNewLineNote',
  props<{ returnHeaderKey: string, returnLineKey: string, note: NewNote,  updateSaveParameters: () => void, closeModal?: () => void, }>()
);

export const deleteLineNote = createAction(
  '[SidePanelStateActions]-deleteLineNote',
  props<{ returnHeaderKey: string, returnLineKey: string, note: DeleteNote }>()
);

export const fetchAllLineNotes = createAction('[create-return] get all line notes',
  props<{ orderHeaderKey: string }>()
);

export const fetchAllLineNotesFailure = createAction('[create-return] get all line notes failure',
  props<{ err?: any }>()
);

export const onChangeNoteSuccess = createAction(
  '[SidePanelStateActions]-onChangeNoteSuccess',
  props<{ input?: any, mapperResponse?: any, apiOutput?: any, notesKey?: string, updateSaveParameters?: () => void, closeModal?: () => void }>()
);

export const onChangeNoteFailure = createAction(
  '[SidePanelStateActions]-onChangeNoteFailure',
  props<{ updateSaveParameters?: () => void, input?: any, err?: any }>()
);

export const openAdjustPricingModal = createAction(
  '[SidePanelStateActions]-openAdjustPricingModal',
  props<{ returnDetails: Record<string, any> }>()
);
