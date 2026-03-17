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

import { Component, Inject, Injector, OnDestroy, OnInit } from '@angular/core';
import { BucBaseUtil, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { Constants } from '../../../common/return.constants';
import { BaseModal } from 'carbon-components-angular';
import { Store } from '@ngrx/store';
import * as ConfiguationActions from '../../../state/configuration/configuration.actions';
import * as SidePanelStateActions from '../../../state/side-panel/side-panel.actions';
import { EntityStoreService } from '../../../state/entities/entity-store.service';
import { NewNote } from '../../../state/types/return.interface';
import { selectCommonCode } from '../../../state/configuration/configuration.reducers';
import { Subscription } from 'rxjs';
import { cloneDeep } from 'lodash';
import { DisplayRulesHelperService } from '@buc/common-components';
import { SharedExtensionConstants } from '../../../shared-extension.constants';

@Component({
  selector: 'call-center-add-notes-modal',
  templateUrl: './add-notes-modal.component.html',
  styleUrls: ['./add-notes-modal.component.scss'],
})
export class AddNotesModalComponent extends BaseModal implements OnInit, OnDestroy {
  EXTENSION = {
    TOP: SharedExtensionConstants.ADD_NOTES_MODAL_RS_TOP,
    BOTTOM: SharedExtensionConstants.ADD_NOTES_MODAL_RS_BOTTOM
  };
  componentId = "add-notes-modal";

  noteTypelist: any[];
  returnNoteTypelist: any[];
  exchangeNoteTypelist: any[];
  contactTypeList: any[] = [];
  notesData = {
    noteType: '',
    contactType: '',
    contactReference: '',
    notesDescription: '',
    priority: false,
    internal: false
  };
  categoryType: any;

  disableSave = true;
  isModalInitialized = false;
  toggleValidation = false;

  private subscriptions: Array<Subscription> = [];
  allowExchangeNotes: boolean;
  hasReturnAndExchangePermission: any;

  constructor(
    private entityStoreSvc: EntityStoreService,
    private store$: Store,
    protected inj: Injector,
    private displayRulesHelperService: DisplayRulesHelperService,
    @Inject('modalData') public modalData
  ) {
    super();
  }

  ngOnInit(): void {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  async initialize(): Promise<any> {
    this.hasReturnAndExchangePermission = this.displayRulesHelperService.getRuleValueForOrg(this.modalData.returnDetails.enterpriseCode, Constants.RULE_ALLOW_EXCHANGE_ORDER) === Constants.CHECK_YES;
    this.allowExchangeNotes = this.hasReturnAndExchangePermission && this.modalData.returnDetails.isDraft && !BucBaseUtil.isUndefinedOrNull(this.modalData.returnDetails.exchangeOrder.orderHeaderKey)
    this.setCategoryType(this.modalData.categoryType);
    this.getContactType();
    this.loadNote();
    this.subscriptions.push(
      this.entityStoreSvc.getStore().select(
        selectCommonCode(Constants.COMMON_CODE_CONTACT_TYPE)
      ).subscribe(this.mapDropdownData.bind(this))
    );
  }

  getContactType() {
    this.store$.dispatch(ConfiguationActions.fetchCommonCode({
      codeType: Constants.COMMON_CODE_CONTACT_TYPE,
      enterpriseCode: this.modalData.returnDetails.enterpriseCode,
      documentType: this.modalData.returnDetails.documentType
    }));
  }

  setReasons() {
    this.noteTypelist = this.categoryType === Constants.EXCHANGE_CATEGORY ? this.exchangeNoteTypelist : this.returnNoteTypelist;
  }

  mapDropdownData(contactTypeList): void {
    this.contactTypeList =  contactTypeList.map((item) => ({
      content: item.description || item.longDescription,
      selected: false,
      value: item.value
    }));
    this.returnNoteTypelist = this.modalData.returnReasons.length ? cloneDeep(this.modalData.returnReasons) : [];
    this.exchangeNoteTypelist = this.modalData.exchangeReasons?.length ? cloneDeep(this.modalData.exchangeReasons) : [];
    this.setReasons()
    this.isModalInitialized = true;
  }

  loadNote() {
    // We are in edit mode
    if (this.modalData.note) {
      this.notesData = {
        contactReference: this.modalData.note.contactReference,
        contactType: this.modalData.note.contactType,
        notesDescription: this.modalData.note.noteText,
        priority: Number(this.modalData.note.priority) === 1,
        noteType: this.modalData.note.reasonCode,
        internal: this.modalData.note.visibleToAll === 'N',
      };
    }
  }

  changeNote(event) {
    this.notesData = { ...event };
    this.disableSave = this.notesData.notesDescription ? false : true;
  }

  setCategoryType (event) {
    if (event) {
      this.categoryType = event;
      this.setReasons();
    }
  }

  async addNote() {
    const loginUserId = BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLoginId();
    if (this.notesData.notesDescription === '') {
      this.toggleValidation = true;
    }
    else {
      this.updateSaveParameters(true);
      const newNote: NewNote = {
        contactReference: this.notesData.contactReference,
        contactType: this.notesData.contactType,
        noteText: this.notesData.notesDescription,
        priority: this.notesData.priority ? '1' : '0',
        reasonCode: this.notesData.noteType,
        visibleToAll: this.notesData.internal ? 'N' : 'Y',
        modifyUserId: loginUserId,
        ...(this.modalData.note ? { notesKey: this.modalData.note.notesKey } : { createUserId: loginUserId })
      }

      if (this.modalData.returnDetails.orderLineKey) {
        // TODO: Handle add line note success
        this.store$.dispatch(SidePanelStateActions.editOrAddNewLineNote({
          returnHeaderKey: this.modalData.returnDetails.id,
          returnLineKey: this.modalData.returnDetails.OrderLineKey,
          note: newNote,
          closeModal: this.closeModal.bind(this),
          updateSaveParameters: this.updateSaveParameters.bind(this)
        }));
      } else {
        this.store$.dispatch(SidePanelStateActions.editOrAddNewNote({
          returnHeaderKey: this.categoryType == Constants.EXCHANGE_CATEGORY ? this.modalData.returnDetails.exchangeOrder.orderHeaderKey : this.modalData.returnDetails.id,
          note: newNote,
          closeModal: this.closeModal.bind(this),
          updateSaveParameters: this.updateSaveParameters.bind(this)
        }));
      }
    }
  }

  updateSaveParameters(saveInProgress = false) {
    if (saveInProgress) {
      this.isModalInitialized = false;
    } else {
      this.isModalInitialized = true;
    }
  }
}
