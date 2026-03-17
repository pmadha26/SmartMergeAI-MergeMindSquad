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

import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { ModalService } from "carbon-components-angular";
import { map, tap } from "rxjs/operators";
import { AddNotesModalComponent } from "../../components/notes/add-notes-modal/add-notes-modal.component";
import { ReturnNoteDetailsModalComponent } from "../../components/notes/return-note-details-modal/return-note-details-modal.component";
import * as SidePanelStateActions from './side-panel.actions';
import * as MashupActions from '../mashup/mashup.actions';
import { Constants } from "../../common/return.constants";
import { AdjustPricingModalComponent } from "../../components/adjust-pricing-modal/adjust-pricing-modal.component";
import { ViewAllNotesModalComponent } from "../../components/notes/view-all-notes-modal/view-all-notes-modal.component";
import { BucSvcAngularStaticAppInfoFacadeUtil } from "@buc/svc-angular";
import { CCNotificationService } from "@buc/common-components";
import { TranslateService } from "@ngx-translate/core";
import { Store } from "@ngrx/store";
import * as EntityActions from "../entities/entity.actions";
import { ErrorHandlerService } from "../../data-service/error-handler.service";

@Injectable()
export class SidePanelStateEffects {

  openNoteDetailsModalEffect$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.openNoteDetailsModal),
      tap((action) => {
        this.modalService.destroy();
        this.modalService.create({
          component: ReturnNoteDetailsModalComponent,
          inputs: {
            modalData: {
              note: action.note,
              searchKey: action.searchKey,
              isHistoryOrder: action.isHistoryOrder,
              initiateEdit: action.initiateEdit,
              initiateDelete: action.initiateDelete, 
              categoryType: action.categoryType
            }
          }
        });
      })
    ), { dispatch: false }
  );

  openAddNoteModalEffect$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.openAddNoteModal),
      tap((action) => {
        this.modalService.destroy();
        this.modalService.create({
          component: AddNotesModalComponent,
          inputs: {
            modalData: {
              ...action
            }
          }
        });
      })
    ), { dispatch: false }
  );

  openViewAllNotesModalEffect$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.openViewAllNotesModal),
      tap((action) => {
        this.modalService.destroy();
        this.modalService.create({
          component: ViewAllNotesModalComponent,
          inputs: {
            modalData: {
              ...action
            }
          }
        });
      })
    ), { dispatch: false }
  );

  addNoteEffect$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.editOrAddNewNote),
      map((action) =>
        MashupActions.invokeMashup({
          mashupId: Constants.MASHUP_ID_ADD_NOTE,
          mashupInput: {
            Order: {
              Action: Constants.COMMON_CODE_MODIFY,
              OrderHeaderKey: action.returnHeaderKey,
              Notes: {
                Note: {
                  ContactReference: action.note.contactReference,
                  ContactType: action.note.contactType,
                  NoteText: action.note.noteText,
                  Priority: action.note.priority,
                  ReasonCode: action.note.reasonCode,
                  VisibleToAll: action.note.visibleToAll,
                  Modifyuserid: action.note.modifyUserId,
                  ...(action.note.notesKey ? { NotesKey: action.note.notesKey } : { Createuserid: action.note.createUserId }),
                }
              }
            }
          },
          options: {
            onSuccessAction: SidePanelStateActions.onChangeNoteSuccess({
              notesKey: action.note.notesKey,
              closeModal: action.closeModal,
              updateSaveParameters: action.updateSaveParameters
            }),
            onFailureAction: SidePanelStateActions.onChangeNoteFailure({
              updateSaveParameters: action.updateSaveParameters
            })
          }
        })
      )
    )
  );

  deleteNoteEffect$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.deleteNote),
      map((action) =>
        MashupActions.invokeMashup({
          mashupId: Constants.MASHUP_ID_DELETE_NOTE,
          mashupInput: {
            Order: {
              Action: Constants.COMMON_CODE_MODIFY,
              OrderHeaderKey: action.returnHeaderKey,
              Notes: {
                Note: {
                  NotesKey: action.note.NotesKey,
                  TableKey: action.note.TableKey
                }
              }
            }
          },
          options: {
            onSuccessAction: SidePanelStateActions.onChangeNoteSuccess({})
          }
        })
      )
    )
  );

  editOrAddNewLineNote$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.editOrAddNewLineNote),
      map((action) => {
        return MashupActions.invokeMashup({
          mashupId: Constants.MASHUP_ID_ADD_ORDERLINE_NOTE,
          mashupInput: {
            Order: {
              Action: Constants.COMMON_CODE_MODIFY,
              OrderHeaderKey: action.returnHeaderKey,
              OrderLines: {
                OrderLine: [{
                  OrderLineKey: action.returnLineKey,
                  Notes: {
                    Note: {
                      ContactReference: action.note.contactReference,
                      ContactType: action.note.contactType,
                      NoteText: action.note.noteText,
                      Priority: action.note.priority,
                      ReasonCode: action.note.reasonCode,
                      VisibleToAll: action.note.visibleToAll,
                      ...(action.note.notesKey ? { NotesKey: action.note.notesKey } : { Createuserid: action.note.createUserId }),
                      Modifyuserid: action.note.modifyUserId
                    }
                  }
                }]
              }
            }
          },
          options: {
            onSuccessAction: SidePanelStateActions.onChangeNoteSuccess({
              notesKey: action.note.notesKey,
              closeModal: action.closeModal,
              updateSaveParameters: action.updateSaveParameters
            }),
            onFailureAction: SidePanelStateActions.onChangeNoteFailure({
              updateSaveParameters: action.updateSaveParameters
            })
          }
        })
      })
    )
  );

  deleteReturnLineNote$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.deleteLineNote),
      map((action) => {
        return MashupActions.invokeMashup({
          mashupId: Constants.MASHUP_ID_DELETE_ORDERLINE_NOTE,
          mashupInput: {
            Order: {
              Action: Constants.COMMON_CODE_MODIFY,
              OrderHeaderKey: action.returnHeaderKey,
              OrderLines: {
                OrderLine: {
                  OrderLineKey: action.returnLineKey,
                  Notes: {
                    Note: {
                      NotesKey: action.note.NotesKey,
                      TableKey: action.note.TableKey
                    }
                  }
                }
              }
            }
          },
          options: {
            onSuccessAction: SidePanelStateActions.onChangeNoteSuccess({})
          }
        })
      })
    ), { dispatch: true }
  );

  fetchAllLineNotes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SidePanelStateActions.fetchAllLineNotes),
      map((payload) => {
        return MashupActions.invokeMashup(
          {
            mashupId: Constants.MASHUP_ID_FETCH_LINE_NOTES,
            mashupInput: {
              Order: {
                DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
                OrderHeaderKey: payload.orderHeaderKey
              },
            }, 
            options: {
              OnFailureAction: SidePanelStateActions.fetchAllLineNotesFailure({}),
              handleMashupError: true,
            }
          }
        )
      }
      )
    )
  );

  fetchAllLineNotesEffect$ = createEffect(
      () => this.actions$.pipe(
        ofType(SidePanelStateActions.fetchAllLineNotesFailure),
        map(({ err }) => {
          if (err.mashupResponse.Errors.Attributes.ErrorCode == 'YFS10003') {
            // The error message is already displayed to the user as part of getReturnDetails when the record is not found. This error handling is implemented to prevent duplicate messages from appearing.
          } else {
            const errorMsg = this.errorHandlerSvc.handleMashupError(err);
            this.notificationService.notify({
              title: errorMsg,
              type: 'error',
            });
          }
          return EntityActions.NO_OP_ACTION();
        })
      )
    )

  onChangeNoteSuccess$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.onChangeNoteSuccess),
      map((action) => this._onChangeNoteSuccess( action.apiOutput, action.input, action.mapperResponse, action.notesKey,  action.updateSaveParameters, action.closeModal))
    )
  );

  onChangeNoteFailure$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.onChangeNoteFailure),
      map((action) => this._onChangeNoteFailure( action.err, action.input, action.updateSaveParameters))
    )
  );

  openAdjustPricingModalEffect$ = createEffect(
    () => this.actions$.pipe(
      ofType(SidePanelStateActions.openAdjustPricingModal),
      tap((action) => {
        this.modalService.destroy();
        this.modalService.create({
          component: AdjustPricingModalComponent,
          inputs: {
            modalData: {
              returnDetails: action.returnDetails,
            }
          }
        });
      })
    )
  );

  constructor(
    private actions$: Actions,
    private store$: Store,
    private modalService: ModalService,
    private notificationService: CCNotificationService,
    private translateService: TranslateService,
    private errorHandlerSvc: ErrorHandlerService,
  ) { }

  private _onChangeNoteSuccess(apiOutput, input, mapperResponse, notesKey, updateSaveParameters, closeModal) {
    if (notesKey && (input.mashups[0].mashupId === Constants.MASHUP_ID_ADD_NOTE || input.mashups[0].mashupId === Constants.MASHUP_ID_ADD_ORDERLINE_NOTE)) {
      this.notificationService.notify({
        type: "success",
        title: this.translateService.instant('SHARED.NOTES.MSG_NOTE_UPDATED')
      });

    } else if (input.mashups[0].mashupId === Constants.MASHUP_ID_DELETE_NOTE || input.mashups[0].mashupId === Constants.MASHUP_ID_DELETE_ORDERLINE_NOTE) {
      this.notificationService.notify({
        type: "success",
        title: this.translateService.instant('SHARED.NOTE_REMOVAL_MODAL.MSG_NOTE_SUCCESS')
      });
    }
    if(updateSaveParameters) {
      updateSaveParameters();
    }
    if(closeModal) {
      closeModal();
    }
    return MashupActions.publishActions(this.store$, apiOutput, input, mapperResponse)
  }

  private _onChangeNoteFailure( err, input, updateSaveParameters) {
    if(updateSaveParameters) {
      updateSaveParameters();
    }
    return EntityActions.NO_OP_ACTION()
  }

  
}
