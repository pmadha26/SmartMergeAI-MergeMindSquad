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
import * as SidePanelStateActions from './side-panel.actions';

export const sidePanelStateReducers = createReducer({},
  on(SidePanelStateActions.openNoteDetailsModal, (state: Record<string, any>, action) => ({
      ...state
  })),
  on(SidePanelStateActions.openAddNoteModal, (state: Record<string, any>, action) => ({
      ...state
  })),
  on(SidePanelStateActions.openViewAllNotesModal, (state: Record<string, any>, action) => ({
    ...state
}))
);
