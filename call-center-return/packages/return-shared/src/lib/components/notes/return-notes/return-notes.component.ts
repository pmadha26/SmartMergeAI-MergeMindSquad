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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChange, SimpleChanges, ViewContainerRef } from '@angular/core';
import { EntityStoreService } from '../../../state/entities/entity-store.service';
import { Store } from '@ngrx/store';
import { cloneDeep, get } from 'lodash';
import { Constants } from '../../../common/return.constants';
import * as SidePanelStateActions from '../../../state/side-panel/side-panel.actions';
import * as SidePanelStateSelectors from '../../../state/side-panel/side-panel.selectors';
import * as ConfigurationActions from '../../../state/configuration/configuration.actions';
import { selectCommonCode } from '../../../state/configuration/configuration.reducers'
import { CommonCode } from '../../../state/configuration/configuration.types';
import { Subscription } from 'rxjs';
import { Note } from '../../../state/types/return.interface';
import { ModalService } from 'carbon-components-angular';
import { TranslateService } from '@ngx-translate/core';
import { CCNotificationService, CommonBinaryOptionModalComponent, DisplayRulesHelperService } from '@buc/common-components';
import { BucBaseUtil } from '@buc/svc-angular';
import { skipWhile } from 'rxjs/operators';
import { ExchangeOrder } from '../../../state/types/order.interface';
import { SharedExtensionConstants } from '../../../shared-extension.constants';

@Component({
  selector: 'call-center-return-notes:not([extn])',
  templateUrl: './return-notes.component.html',
  styleUrls: ['./return-notes.component.scss'],
})
export class ReturnNotesComponent implements OnInit, OnDestroy, OnChanges {
  EXTENSION = {
      TOP: SharedExtensionConstants.RETURN_NOTES_RS_TOP,
      BOTTOM: SharedExtensionConstants.RETURN_NOTES_RS_BOTTOM
  };
  @Input() returnDetails: any;
  @Output() setNoteListLength = new EventEmitter<any>();
  notesList: any = [];
  exchangeNotesList: any = [];
  returnLineNotesList: any = [];
  categoryList: any = [];

  componentId = 'ReturnNotesComponent';
  notesTypeList: any[];
  emptyNotes = false;
  noReturnLineNotes = false;
  returnInitialized = false;
  exchangeInitialized = false
  reasonCodeList: any[];
  exchangeReasonCodeList: any[];
  exchangeNotesTypeList: any[];
  returnNotesTypeList: any[];
  searchKey = '';

  notesResourcePermission = {
    ADD: 'ICC000091'
  }

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

  private subscriptions: Array<Subscription> = [];
  hasReturnAndExchangePermission: boolean;
  allowExchangeNotes: any;
  categoryType = Constants.RETURN_CATEGORY
  exchangeOrder: ExchangeOrder;
  

  constructor(
    private store$: Store,
    private entityStoreSvc: EntityStoreService,
    private modalService: ModalService,
    private notificationService: CCNotificationService,
    protected translateService: TranslateService,
    private displayRulesHelperService: DisplayRulesHelperService
  ) { }

  ngOnInit(): void {
    
    this.initialize();
  }

  private async _initTranslations() {
    const keys = Object.keys(this.nlsMap);
    const json = await this.translateService.get(keys).toPromise();
    keys.forEach(k => this.nlsMap[k] = json[k]);
  }

  ngOnChanges(changes: SimpleChanges) {
    const returnEntityChange: SimpleChange = changes.returnDetails;
    if (returnEntityChange && !returnEntityChange.isFirstChange()) {
      if (returnEntityChange.currentValue === undefined) {
        this.returnInitialized = false;
      } else {
        this.returnInitialized = true;
      }
      this.subscribeToExchangeCommonCodes();
    }
    if (this.returnDetails) {
      this.setExchangePermissions()
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  async initialize(): Promise<any> {
    this.returnInitialized = false;
    this.exchangeInitialized = false
    await this._initTranslations();
    this.fetchReturnReasonsReturn();
    this.initializeCategoryList();
    this.setExchangePermissions();
    this.subscribeToExchangeCommonCodes()
    this.subscriptions.push(
      this.entityStoreSvc.getStore().select(
        SidePanelStateSelectors.getAllExchangeNotes
      ).subscribe(this.initializeExchangeNotes.bind(this)),
      this.entityStoreSvc.getStore().select(
        SidePanelStateSelectors.getAllNotes
      ).subscribe(this.initializeNotes.bind(this)),
      this.entityStoreSvc.getStore().select(
        selectCommonCode(Constants.COMMON_CODE_NOTES_REASON, this.returnDetails.documentType)
      ).subscribe(this.initializeReturnReasons.bind(this))
    );
  }

  subscribeToExchangeCommonCodes(){
    if(this.returnDetails.exchangeOrder && BucBaseUtil.isUndefinedOrNull(this.exchangeOrder)) {
      this.subscriptions.push(
        this.entityStoreSvc.getEntityById(this.returnDetails.exchangeOrder.orderHeaderKey, Constants.ENTITY_TYPE_EXCHANGE_ORDER)
        .pipe(skipWhile(BucBaseUtil.isVoid))
        .subscribe(exchange => {
          this.exchangeOrder = exchange 
          this.fetchExchangeReasonsReturn();
        }),
        this.entityStoreSvc.getStore().select(
          selectCommonCode(Constants.COMMON_CODE_NOTES_REASON, get(this.returnDetails, 'rawData.ExchangeOrders.ExchangeOrder[0].DocumentType', '') )
        ).subscribe(this.initializeExchangeReasons.bind(this))
      );
    }
  }

  private fetchReturnReasonsReturn() {
    if (BucBaseUtil.isUndefinedOrNull(this.reasonCodeList)) {
      this.store$.dispatch(ConfigurationActions.fetchCommonCode({
        codeType: Constants.COMMON_CODE_NOTES_REASON,
        enterpriseCode: this.returnDetails.enterpriseCode,
        documentType: this.returnDetails.documentType
      }))
    }
  }

  private fetchExchangeReasonsReturn() {
    if (BucBaseUtil.isUndefinedOrNull(this.exchangeReasonCodeList)) {
      this.store$.dispatch(ConfigurationActions.fetchCommonCode({
        codeType: Constants.COMMON_CODE_NOTES_REASON,
        enterpriseCode: this.exchangeOrder?.enterpriseCode,
        documentType:this.exchangeOrder?.documentType 
      }))
    }
  }

  onCategorySelected(event){
    this.categoryType = event.length === 0 ? '' :
    event && event.item && event.item.value;
    this.updateNoteCount()
    this.setReasons();
  }

  setExchangePermissions(){
    this.hasReturnAndExchangePermission = this.displayRulesHelperService.getRuleValueForOrg(this.returnDetails.enterpriseCode, Constants.RULE_ALLOW_EXCHANGE_ORDER) === Constants.CHECK_YES;
    this.allowExchangeNotes = this.hasReturnAndExchangePermission && this.returnDetails.isDraft && !BucBaseUtil.isUndefinedOrNull(this.returnDetails.exchangeOrder.orderHeaderKey)
    //reset category if exchange permissions change
    if (!this.allowExchangeNotes) {
      this.categoryType = Constants.RETURN_CATEGORY;
      this.initializeCategoryList();
    }
  }

  private initializeNotes(notes: Note[]) {
    if(this.exchangeInitialized && this.returnInitialized){
      this.categoryType = Constants.RETURN_CATEGORY
      this.initializeCategoryList()
    }
    this.notesList = notes ? cloneDeep(notes) : [];
    this.getCodesForNotes();
    this.mapNotes();
    this.returnInitialized = true;
    this.updateNoteCount() 
  }

  private initializeExchangeNotes(notes: Note[]) {
    if(this.exchangeInitialized && this.returnInitialized ){
      this.categoryType = Constants.EXCHANGE_CATEGORY
      this.initializeCategoryList()
    }
    if (this.allowExchangeNotes) {
      this.exchangeNotesList = notes ? cloneDeep(notes) : [];
      this.getCodesForExchangeNotes();
      this.mapExchangeNotes();
      this.exchangeInitialized = true
      this.updateNoteCount()
    }
  }

  private initializeCategoryList() {
    this.categoryList = [
      {
        content: this.nlsMap['SHARED.NOTES.LABEL_RETURN'],
        selected:this.categoryType !== Constants.EXCHANGE_CATEGORY, 
        value:Constants.RETURN_CATEGORY
      }, 
      {
        content: this.nlsMap['SHARED.NOTES.LABEL_EXCHANGE'], 
        selected:this.categoryType === Constants.EXCHANGE_CATEGORY, 
        value:Constants.EXCHANGE_CATEGORY
      }
    ]; 
  }

  private initializeReturnReasons(reasonCodes: CommonCode[]) {
    if (reasonCodes.length > 0){
      this.reasonCodeList = cloneDeep(reasonCodes);
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


  updateNoteCount() {
    this.setNoteListLength.emit(this.categoryType === Constants.EXCHANGE_CATEGORY ? this.exchangeNotesList.length | 0 : this.notesList.length | 0);
  }

  getCodesForNotes() {
    if (this.reasonCodeList?.length) {
      this.returnNotesTypeList = this.reasonCodeList.map(item => ({
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

  mapNotes(): any {
    if (this.notesList) {
      this.notesList = this.notesList.map(note => ({
        ...note,
        isNewNote: new Date(note.contactTime).getTime() >= (Date.now() - 5000),
        typeFiltered: true, // for dropdown filtering
        isFiltered: true, // for checkbox selections
        displayNote: true, // for search field selections
        reasonText: this.reasonCodeList?.find(codeItem => codeItem.value === note.reasonCode)?.description || '',
      }));
      this.notesList.sort((a, b) => {
        const keyA = new Date(a.contactTime).getTime();
        const keyB = new Date(b.contactTime).getTime();
        return keyB - keyA;
      });
    }
  }

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

  async deleteNote(event, type: 'return' | 'line' = 'return') {
    if (type === "line") {
      this.store$.dispatch(SidePanelStateActions.deleteLineNote({
        returnHeaderKey: this.returnDetails.id,
        returnLineKey: this.returnDetails.OrderLineKey,
        note: {
          NotesKey: event.notesKey,
          TableKey: event.tableKey
        }
      }));
      this.entityStoreSvc.deleteEntity(event.sequenceNo, Constants.ENTITY_TYPE_NOTE);
    } else {
      this.store$.dispatch(SidePanelStateActions.deleteNote({
        returnHeaderKey: this.categoryType === Constants.EXCHANGE_CATEGORY ? this.returnDetails?.exchangeOrder.orderHeaderKey : this.returnDetails?.id, //this.exchangeOrder?.id
        note: {
          NotesKey: event.notesKey,
          TableKey: event.tableKey
        }
      }));
      this.entityStoreSvc.deleteEntity(event.sequenceNo,  this.categoryType === Constants.EXCHANGE_CATEGORY ? Constants.ENTITY_TYPE_EXCHANGE_NOTES : Constants.ENTITY_TYPE_NOTE);
    }

  }

  initiateNoteDelete(event, type: 'return' | 'line' = 'return') {
    this.modalService.destroy();
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
          callback: async () => {
            await this.deleteNote(event, type);
          }
        }
      }
    });
  }

  initiateNoteEdit(event) {
    this.store$.dispatch(
      SidePanelStateActions.openAddNoteModal({
        returnDetails: this.returnDetails,
        returnReasons: this.returnNotesTypeList,
        exchangeReasons: this.exchangeNotesTypeList,
        note: event,
        categoryType: this.categoryType,
        categoryVisible: true
      })
    );
  }

  openViewAllNotesModal() {
    this.store$.dispatch(
      SidePanelStateActions.openViewAllNotesModal({
        returnDetails: this.returnDetails,
        returnReasons: this.returnNotesTypeList?.length ? [...this.returnNotesTypeList] : [],
        exchangeReasons: this.exchangeNotesTypeList?.length ? [...this.exchangeNotesTypeList] : [],
        categoryType: this.categoryType,
        categoryVisible: true,
        categoryList: this.categoryList
      })
    )
  }

  openNoteDetails(data, type: 'return' | 'line' = 'return'): void {
    this.store$.dispatch(
      SidePanelStateActions.openNoteDetailsModal({
        note: data,
        searchKey: this.searchKey,
        isHistoryOrder: this.returnDetails.isHistory,
        initiateDelete: (event) => { this.initiateNoteDelete(event, type) },
        initiateEdit: (event) => { this.initiateNoteEdit(event) },
        categoryType: this.categoryType
      })
    );
  }

  openAddNoteModal(): void {
    this.store$.dispatch(
      SidePanelStateActions.openAddNoteModal({
        returnDetails: this.returnDetails,
        returnReasons: this.returnNotesTypeList,
        exchangeReasons: this.exchangeNotesTypeList,
        categoryType: this.categoryType,
        categoryVisible: true
      })
    );
  }

  setReasons() {
    this.notesTypeList = this.categoryType === Constants.EXCHANGE_CATEGORY ? this.exchangeNotesTypeList : this.returnNotesTypeList ?? [];;
  }

  selectedCategoryNotelist() : any {
    return this.categoryType === Constants.EXCHANGE_CATEGORY ? this.exchangeNotesList : this.notesList
  }

  applyFilter(event) {
    this.emptyNotes = !this.filterList(this.selectedCategoryNotelist(), event);
    this.noReturnLineNotes = !this.filterList(this.returnLineNotesList, event);
  }

  /**
   * @param list Order|Orderline notes
   * @param event Filter options
   * @returns boolean
   */
  private filterList(list = [], event): boolean {
    this.searchKey = event.searchBy;
    const re = new RegExp(event.searchBy, 'gi');
    let notesFound = false;
    if (list.length) {
      list.forEach((note) => {
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
          note.isFiltered = note.user  ? false :
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
    } else {
      notesFound = true;
    }

    return notesFound;
  }
}
