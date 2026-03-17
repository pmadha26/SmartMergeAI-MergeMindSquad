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

import { Component, Inject, Injector, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { CCNotificationService, CommonBinaryOptionModalComponent, DisplayRulesHelperService } from '@buc/common-components';
import { BaseModal, ModalService } from 'carbon-components-angular';
import { TranslateService } from '@ngx-translate/core';

import { EntityStoreService } from '../../../state/entities/entity-store.service';
import { Store } from '@ngrx/store';
import { cloneDeep } from 'lodash';
import { Constants } from '../../../common/return.constants';
import * as SidePanelStateActions from '../../../state/side-panel/side-panel.actions';
import * as SidePanelStateSelectors from '../../../state/side-panel/side-panel.selectors';
import * as ConfigurationActions from '../../../state/configuration/configuration.actions';
import { selectCommonCode } from '../../../state/configuration/configuration.reducers'
import { CommonCode } from '../../../state/configuration/configuration.types';
import { Subscription } from 'rxjs';
import { NewNote, Note } from '../../../state/types/return.interface';
import { BucBaseUtil, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import *  as EntityActions from '../../../state/entities/entity.actions';
import { skipWhile } from 'rxjs/operators';
import { ExchangeOrder } from '../../../state/types/order.interface';
import { SharedExtensionConstants } from '../../../shared-extension.constants';

@Component({
  selector: 'call-center-view-all-notes-modal',
  templateUrl: './view-all-notes-modal.component.html',
  styleUrls: ['./view-all-notes-modal.component.scss'],
})
export class ViewAllNotesModalComponent extends BaseModal implements OnInit, OnDestroy {
  EXTENSION = {
    TOP: SharedExtensionConstants.VIEW_ALL_NOTES_MODAL_RS_TOP,
    BOTTOM: SharedExtensionConstants.VIEW_ALL_NOTES_MODAL_RS_BOTTOM
  };

  componentId = 'view-all-notes-modal';
  contactTypeList = [];
  notesTypeList = [];
  returnNotesTypeList = [];
  exchangeNotesTypeList = [];
  notesList = [];
  returnNotesList = [];
  exchangeNotesList = [];
  noteEditInProgress = false;
  toggleValidation = false;
  isContentInitialized = false;

  emptyNotes = false;
  noReturnLineNotes = false;
  initialized = false;
  returnReasonCodeList: any[];
  exchangeReasonCodeList: any[];
  private subscriptions: Array<Subscription> = [];
  hasAddNotePermission: boolean;
  isHistoryReturn: boolean

  searchKey = '';

  resourceIds = {
    ADD_NOTE_PERMISSION: 'ICC000091'
  };

  // Holds the value of current note changes
  noteUpdate: any;

  nlsMap = {
    'SHARED.NOTE_REMOVAL_MODAL.MSG_NOTE_SUCCESS': '',
    'SHARED.NOTE_REMOVAL_MODAL.LABEL_HEADER': '',
    'SHARED.NOTE_REMOVAL_MODAL.LABEL_DELETE_NOTE': '',
    'SHARED.NOTE_REMOVAL_MODAL.LABEL_CONFIRM': '',
    'SHARED.NOTE_REMOVAL_MODAL.LABEL_DISMISS': '',
    'SHARED.NOTES.MSG_NOTE_UPDATED': '',
    'SHARED.NOTES.LABEL_RETURN': '',
    'SHARED.NOTES.LABEL_EXCHANGE': ''
  };
  categoryType: any;
  hasReturnAndExchangePermission: boolean;
  allowExchangeNotes: boolean;
  categoryEditable: any;
  isLineNote: any;
  categoryList: any;
  exchangeOrder: ExchangeOrder;
  

  constructor(
    private entityStoreSvc: EntityStoreService,
    private modalService: ModalService,
    private translateService: TranslateService,
    private notificationService: CCNotificationService,
    private store$: Store,
    protected inj: Injector,
    private displayRulesHelperService: DisplayRulesHelperService,
    @Inject('modalData') public modalData
  ) {
    super();
  }

  async ngOnInit() {
    
    await this.initialize();
  }

  /**
   * Retrieve translations
   */
  private async _initTranslations() {
    const keys = Object.keys(this.nlsMap);
    const json = await this.translateService.get(keys).toPromise();
    keys.forEach(k => this.nlsMap[k] = json[k]);
  }

  /**
   * Map notes & assigns appropriate state & filter flags
   */
  mapNotes() {
    if (this.returnNotesList) {
      this.returnNotesList = this.returnNotesList.map(note => ({
        ...note,
        isNewNote: new Date(note.contactTime).getTime() >= (Date.now() - 5000),
        typeFiltered: true, // for dropdown filtering
        isFiltered: true, // for checkbox selections
        displayNote: true, // for search field selections
        reasonText: this.returnReasonCodeList?.find(codeItem => codeItem.value === note.reasonCode)?.description || '',
      }));
      this.returnNotesList.sort((a, b) => {
        const keyA = new Date(a.contactTime).getTime();
        const keyB = new Date(b.contactTime).getTime();
        return keyB - keyA;
      });
    } else {
      this.returnNotesList = [];
    }
  }

  /**
   * Map exchange notes & assigns appropriate state & filter flags
   */
  mapExchangeNotes(): any {
    if (this.exchangeNotesList) {
      this.exchangeNotesList = this.exchangeNotesList.map(note => ({
        ...note,
        isNewNote: new Date(note.contactTime).getTime() >= (Date.now() - 5000),
        typeFiltered: true, // for dropdown filtering
        isFiltered: true, // for checkbox selections
        displayNote: true, // for search field selections
        reasonText: this.exchangeReasonCodeList?.find(codeItem => codeItem.value === note.reasonCode)?.description || '',
      }));
      this.exchangeNotesList.sort((a, b) => {
        const keyA = new Date(a.contactTime).getTime();
        const keyB = new Date(b.contactTime).getTime();
        return keyB - keyA;
      });
    }
  }

  setResourcePermission(){
    this.hasAddNotePermission = BucSvcAngularStaticAppInfoFacadeUtil.canUserAccessResource(this.resourceIds.ADD_NOTE_PERMISSION);
   }

  /**
   * Adds empty note in edit mode as the first element in list
   */
  addNewNote() {
    this.categoryEditable = !this.isLineNote ?? false ;
    this.notesList.unshift({ isEditMode: true });
    this.noteEditInProgress = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  /**
   * Get note list, reason and contact type to pass to `add-note` component on edit
   */
  async initialize(): Promise<any> {
    this.hasReturnAndExchangePermission = this.displayRulesHelperService.getRuleValueForOrg(this.modalData.returnDetails.enterpriseCode, Constants.RULE_ALLOW_EXCHANGE_ORDER) === Constants.CHECK_YES;
    this.allowExchangeNotes = this.modalData.allowExchangeNotes || (this.hasReturnAndExchangePermission && this.modalData.returnDetails.isDraft && !BucBaseUtil.isUndefinedOrNull(this.modalData.returnDetails.exchangeOrder.orderHeaderKey))
    this.categoryType = this.modalData.categoryType;
    this.categoryEditable = this.modalData.categoryEditable;
    this.categoryList = this.modalData.categoryList;
    this.setResourcePermission();
    this.isLineNote = !BucBaseUtil.isUndefinedOrNull(this.modalData.lineDetails?.OrderLineKey)
    await this._initTranslations();
    this.fetchCommonCodes();
    this.initializeSubscriptions()
    this.selectedCategoryNotelist();
    this.isNotesEmpty();
    this.checkForArchivedReturn()
  }

  initializeSubscriptions() {
    this.subscriptions.push(
      //load line, or exchange and return notes
      (this.isLineNote ?
        (this.isExchange() ? 
          //Exchange line notes
          this.entityStoreSvc.getStore().select(
            EntityActions.getLineNote(this.modalData.lineDetails?.OrderLineKey)
          ).subscribe(this.initializeExchangeNotes.bind(this)) :
          //Return line notes
          this.entityStoreSvc.getStore().select(
            EntityActions.getLineNote(this.modalData.lineDetails?.OrderLineKey)
          ).subscribe(this.initializeNotes.bind(this))
        ) : (
          //Exchange and return notes
          this.entityStoreSvc.getStore().select(
            SidePanelStateSelectors.getAllNotes
          ).subscribe(this.initializeNotes.bind(this)),
          this.entityStoreSvc.getStore().select(
            SidePanelStateSelectors.getAllExchangeNotes
          ).pipe(skipWhile(BucBaseUtil.isVoid))
          .subscribe(this.initializeExchangeNotes.bind(this)) 
        )
      ),
      
      this.entityStoreSvc.getEntityById(this.isLineNote && this.isExchange ? this.modalData.returnDetails.OrderHeaderKey : this.modalData.returnDetails?.exchangeOrder?.orderHeaderKey, Constants.ENTITY_TYPE_EXCHANGE_ORDER)
      .pipe(skipWhile(BucBaseUtil.isVoid))
      .subscribe(exchange => {
        this.exchangeOrder = exchange 
        this.fetchExchangeReasonsReturn();
      }),
      this.entityStoreSvc.getStore().select(
        selectCommonCode(Constants.COMMON_CODE_NOTES_REASON, this.modalData.returnDetails.documentType)
      ).subscribe(this.initializeReturnReasons.bind(this)),
      this.entityStoreSvc.getStore().select(
        selectCommonCode(Constants.COMMON_CODE_NOTES_REASON, this.exchangeOrder?.documentType)
      ).subscribe(this.initializeExchangeReasons.bind(this)),
      this.entityStoreSvc.getStore().select(
        selectCommonCode(Constants.COMMON_CODE_CONTACT_TYPE)
      ).subscribe(this.mapDropdownData.bind(this))
    );
  }

  private fetchCommonCodes() {
    if (!BucBaseUtil.isUndefinedOrNull(this.modalData.returnDetails.documentType )) {
      this.store$.dispatch(ConfigurationActions.fetchCommonCode({
        codeType: Constants.COMMON_CODE_NOTES_REASON,
        enterpriseCode: this.modalData.returnDetails.enterpriseCode,
        documentType: this.modalData.returnDetails.documentType
      }));
      this.store$.dispatch(ConfigurationActions.fetchCommonCode({
        codeType: Constants.COMMON_CODE_CONTACT_TYPE,
        enterpriseCode: this.modalData.returnDetails.enterpriseCode,
        documentType: this.modalData.returnDetails.documentType
      }));
    }
  }

  private fetchExchangeReasonsReturn() {
    if (!BucBaseUtil.isUndefinedOrNull(this.exchangeOrder?.documentType )) {
      this.store$.dispatch(ConfigurationActions.fetchCommonCode({
        codeType: Constants.COMMON_CODE_NOTES_REASON,
        enterpriseCode: this.exchangeOrder?.enterpriseCode,
        documentType: this.exchangeOrder?.documentType 
      }))
      this.store$.dispatch(ConfigurationActions.fetchCommonCode({
        codeType: Constants.COMMON_CODE_CONTACT_TYPE,
        enterpriseCode: this.exchangeOrder?.enterpriseCode,
        documentType: this.exchangeOrder?.documentType
      }));
    }
  }

  private initializeNotes(notes: Note[]) {
    this.returnNotesList = cloneDeep(notes);
    this.getCodesForNotes();
    this.mapNotes();
    this.selectedCategoryNotelist()
    this.isNotesEmpty();
    this.isContentInitialized = true;
  }

  private initializeExchangeNotes(notes: Note[]) {
    if (this.allowExchangeNotes) {
      this.exchangeNotesList = notes ? cloneDeep(notes) : [];
      this.getCodesForExchangeNotes();
      this.mapExchangeNotes();
      this.selectedCategoryNotelist()
      this.isNotesEmpty();

      this.isContentInitialized = true;
    }
  }

  private initializeReturnReasons(reasonCodes: CommonCode[]) {
    if (reasonCodes.length > 0){
      this.returnReasonCodeList = cloneDeep(reasonCodes);
      this.getCodesForNotes();
      this.mapNotes();
      this.setReasons()
    }
  }

  private initializeExchangeReasons(reasonCodes: CommonCode[]) {
    if (reasonCodes.length > 0){
      this.exchangeReasonCodeList = cloneDeep(reasonCodes);
      this.getCodesForExchangeNotes();
      this.mapExchangeNotes();
      this.setReasons()
    }
  }

  getCodesForNotes() {
    if (this.returnReasonCodeList?.length) {
      this.returnNotesTypeList = this.returnReasonCodeList.map(item => ({
        content: item.description || item.longDescription,
        selected: false,
        value: item.value
      }));
    }
    else {
      this.returnNotesTypeList = [];
    }
  }

  getCodesForExchangeNotes() {
    if (this.exchangeReasonCodeList?.length) {
      this.exchangeNotesTypeList = this.exchangeReasonCodeList.map(item => ({
        content: item.description || item.longDescription,
        selected: false,
        value: item.value
      }));
    }
    else {
      this.exchangeNotesTypeList = [];
    }
  }

  setReasons() {
    this.notesTypeList = this.isExchange() ? this.exchangeNotesTypeList : this.returnNotesTypeList ?? [];;
  }

  selectedCategoryNotelist() {
    this.notesList =  this.isExchange() ? this.exchangeNotesList : this.returnNotesList
  }

  mapDropdownData(contactTypeList): void {
    this.contactTypeList = contactTypeList.map((item) => ({
      content: item.description || item.longDescription,
      selected: false,
      value: item.value
    }));
  }

  /**
   * Add or update existing note
   * @param index
   */
  async saveNote(index) {
    const notesKey = this.notesList[index]?.notesKey;
    const loginUserId = BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLoginId();
    if (this.noteUpdate.notesDescription.trim() === '') {
      this.toggleValidation = true;
      return;
    }

    this.toggleValidation = false;
    this.updateSaveParameters(true);
    const newNote: NewNote = {
      contactReference: this.noteUpdate.contactReference,
      contactType: this.noteUpdate.contactType,
      noteText: this.noteUpdate.notesDescription,
      priority: this.noteUpdate.priority ? '1' : '0',
      reasonCode: this.noteUpdate.noteType,
      visibleToAll: this.noteUpdate.internal ? 'N' : 'Y',
      modifyUserId: loginUserId,
      ...(notesKey ? { notesKey } : { createUserId: loginUserId })
    }

    if (this.modalData?.lineDetails?.OrderLineKey) {
      this.store$.dispatch(SidePanelStateActions.editOrAddNewLineNote({
        returnHeaderKey: this.isExchange() ? this.modalData.returnDetails.OrderHeaderKey : this.modalData.returnDetails.id,
        returnLineKey: this.modalData.lineDetails?.OrderLineKey,
        note: newNote,
        updateSaveParameters: this.updateSaveParameters.bind(this)
      }));
    } else {
      this.store$.dispatch(SidePanelStateActions.editOrAddNewNote({
        returnHeaderKey: this.isExchange() ? this.modalData.returnDetails?.exchangeOrder?.orderHeaderKey : this.modalData.returnDetails.id,
        note: newNote,
        updateSaveParameters: this.updateSaveParameters.bind(this)
      }));
    }

    this.noteEditInProgress = false;
    this.selectedCategoryNotelist();
  }

  updateSaveParameters(saveInProgress = false) {
    if (saveInProgress) {
      this.isContentInitialized = false;
    } else {
      this.isContentInitialized = true;
    }
  }

  /**
   * Cancels edit/create operation
   * @param index
   */
  cancelOperation(index) {
    this.resetDropdownOptions();
    if (!this.notesList[index]?.notesKey) {
      this.notesList.splice(index, 1);
    } else {
      this.notesList[index].isEditMode = false;
    }

    this.noteEditInProgress = false;
    this.isNotesEmpty();
  }

  isExchange(){
    return this.categoryType === Constants.EXCHANGE_CATEGORY;
  }

  /**
   * Assign note changes to local object
   * @param event
   */
  changeNote(event) {
    this.noteUpdate = { ...event };
  }

  setCategoryType(event) {
    if (event) {
      this.cancelOperation(0);
      this.noteEditInProgress = true;
      this.categoryType = event;
      this.setReasons()
      this.selectedCategoryNotelist()
      this.addNewNote()
    }
  }

  /**
   * Set state of selected note to edit & disables edit/delete functionality for all other notes
   * @param index
   */
  editNote(index) {
    this.resetDropdownOptions();
    this.noteUpdate = {};
    this.notesList[index].isEditMode = true;
    this.noteEditInProgress = true;
    this.categoryEditable = false;
  }

  /**
   * Makes API call to delete note
   * @param index
   */
  async deleteNote(index) {
    if (this.modalData?.lineDetails?.OrderLineKey) {
      this.store$.dispatch(SidePanelStateActions.deleteLineNote({
        returnHeaderKey: this.isExchange() ? this.modalData.returnDetails?.OrderHeaderKey : this.modalData.returnDetails.id,
        returnLineKey: this.modalData.lineDetails?.OrderLineKey,
        note: {
          NotesKey: this.notesList[index].notesKey,
          TableKey: this.notesList[index].tableKey
        }
      }));
    } else {
      this.store$.dispatch(SidePanelStateActions.deleteNote({
        returnHeaderKey: this.isExchange() ? this.modalData.returnDetails?.exchangeOrder?.orderHeaderKey : this.modalData.returnDetails.id,
        note: {
          NotesKey: this.notesList[index].notesKey,
          TableKey: this.notesList[index].tableKey
        }
      }));
      this.entityStoreSvc.deleteEntity(this.notesList[index].sequenceNo, this.isExchange() ? Constants.ENTITY_TYPE_EXCHANGE_NOTES : Constants.ENTITY_TYPE_NOTE);
    }
    this.isNotesEmpty();
  }

  /**
   * Confirms note deletion via binary option modal
   * @param index
   */
  confirmNoteDelete(index) {
    this.modalService.create({
      component: CommonBinaryOptionModalComponent,
      inputs: {
        modalText: {
          header: this.nlsMap['SHARED.NOTE_REMOVAL_MODAL.LABEL_HEADER'],
          label: this.nlsMap['SHARED.NOTE_REMOVAL_MODAL.LABEL_DELETE_NOTE']
        },
        optionOne: {
          primary: true,
          text: this.nlsMap['SHARED.NOTE_REMOVAL_MODAL.LABEL_DISMISS'],
          tid: 'dismiss-cancel',
          callback: () => { },
          callOnClose: true
        },
        optionTwo: {
          class: {
            danger: true
          },
          text: this.nlsMap['SHARED.NOTE_REMOVAL_MODAL.LABEL_CONFIRM'],
          tid: 'confirm-cancel',
          callback: () => {
            this.deleteNote(index);
          }
        }
      }
    });
  }

  applyFilter(event) {
    this.searchKey = event.searchBy;
    const re = new RegExp(event.searchBy, 'gi');
    let notesFound = false;

    if (this.categoryType != event.category) {
      this.categoryType = event.category
      this.updateCategoryOptions()
      this.initializeSubscriptions();
    }
    if (this.notesList) {
      this.notesList.forEach((note) => {
        // Reset filters each filter change
        note.isFiltered = !(event.highPriority && event.system && event.user); // for checkbox selections
        note.displayNote = !event.searchBy; // for search field selections
        note.typeFiltered = !Boolean(event.typeSelected.length); // for dropdown filtering

        if (!event.system && !event.user) {
          if (event.highPriority) {
            note.isFiltered = note.priority === '1.00';
          }
          else {
            note.isFiltered = true;
          }
        }
        else if (!event.system) { // Set note.isFiltered=false if 'system' check box is unchecked (show only user notes)
          note.isFiltered = !note.user ? false : event.highPriority ? note.priority === '1.00' : true;
        }
        else if (!event.user) { // Set note.isFiltered=false if 'user' check box is unchecked (show only system notes)
          note.isFiltered = note.user ? false :
            event.highPriority ? note.priority === '1.00' : true;
        }

        if (event.searchBy) {
          note.displayNote = note.noteText.match(re);
        }

        if (event.typeSelected.length) {
          note.typeFiltered = event.typeSelected.includes(note.reasonCode);
        }
        if (note.isFiltered && note.displayNote && note.typeFiltered) {
          notesFound = true;
        }
      });

      this.emptyNotes = !notesFound;
    }
  }

  isNotesEmpty() {
    if (!this.isLineNote){
      this.emptyNotes = this.notesList.length===0
    } else {
      if (!this.isContentInitialized && this.modalData.lineDetails?.OrderLineKey && !this.notesList.length) {
        this.addNewNote();
      }
    }
  }

  private updateCategoryOptions() {
    this.categoryList = [
      {
        content: this.nlsMap['SHARED.NOTES.LABEL_RETURN'],
        selected: !this.isExchange(), 
        value:Constants.RETURN_CATEGORY
      }, 
      {
        content: this.nlsMap['SHARED.NOTES.LABEL_EXCHANGE'], 
        selected: this.isExchange(), 
        value:Constants.EXCHANGE_CATEGORY
      }
    ]; 
  }


  private resetDropdownOptions() {
    this.notesTypeList = this.notesTypeList.map((type) => {
      type.selected = false;
      return type;
    });
    this.contactTypeList = this.contactTypeList.map((type) => {
      type.selected = false;
      return type;
    });
  }

  private checkForArchivedReturn() {
    const historyFlagVal = this.modalData?.returnDetails?.isHistory;
    this.isHistoryReturn = (historyFlagVal === true || historyFlagVal === 'Y');
  }
}
