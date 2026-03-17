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

import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { CCNotificationService } from '@buc/common-components';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { EntityStoreService } from '../../state/entities/entity-store.service';
import * as SidePanelStateSelectors from '../../state/side-panel/side-panel.selectors';
import { SharedExtensionConstants } from '../../shared-extension.constants';

@Component({
  selector: 'call-center-summary-notes-panel:not([extn])',
  templateUrl: './summary-notes-panel.component.html',
  styleUrls: ['./summary-notes-panel.component.scss'],
})
export class SummaryNotesPanelComponent implements OnInit, OnDestroy {
  EXTENSION = {
    TOP: SharedExtensionConstants.SUMMARY_NOTES_PANEL_RS_TOP,
    BOTTOM: SharedExtensionConstants.SUMMARY_NOTES_PANEL_RS_BOTTOM
  };
  @Input() returnDetails: any;
  @Input() expanded: boolean;
  @Input() ruleSetValues = [];
  @Input() adjustPricingMode;
  @Input() showAdjustPricing;
  @Input() refreshActions = [];
  @Input() showAdjustPricingWarning;
  @Input() isRefund;
  @Input() showNotesOnly;

  @ViewChild('notesTab', { static: true }) private notesTab: TemplateRef<any>;
  @ViewChild('summaryTab', { static: true }) private summaryTab: TemplateRef<any>;

  totalNotesCount = 0;
  returnSummaryTabs: any;
  selectedTab: any;
  componentId = 'summary-notes-panel';
  itemList = [{}];
  initialized: boolean;
  

  private subscriptions: Array<Subscription> = [];

  constructor(
    private entityStoreSvc: EntityStoreService,
    public translate: TranslateService,
    public ccNotificationService: CCNotificationService
  ) { }
  
  ngOnInit(): void {
    
    this.initialize();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  initialize(): void {

    this.initializeSummaryTabs();
    this.subscriptions.push(
      this.entityStoreSvc.getStore().select(
        SidePanelStateSelectors.getNotesCount
      ).subscribe(this.updateNoteCount.bind(this))
    );
  }

  private async _getNls(key, params?): Promise<any> {
    return this.translate.get(key, params).toPromise();
  }

  async updateNoteCount(notesCount: number): Promise<any> {
    this.totalNotesCount = notesCount;
  }

  async initializeSummaryTabs(){
    this.returnSummaryTabs = [
      ...!this.showNotesOnly ? [{
        heading: await this._getNls('PAYMENT_SUMMARY.SIDE_PANEL.LABEL_PRICING_SUMMARY'),
        value: 'summary-tab',
        id: 'summary-tab',
        content: this.summaryTab,
        handleSelected: this.selectTabByValue.bind(this, 'summary-tab')
      }] : [],
      {
        heading: this.totalNotesCount === 1 ? await this._getNls('SHARED.NOTES.LABEL_NOTE_COUNT' ,
        { count: this.totalNotesCount }) : await this._getNls('SHARED.NOTES.LABEL_NOTES_COUNT' ,
        { count: this.totalNotesCount }) ,
        value: 'return-notes-tab',
        id: 'return-notes-tab',
        content: this.notesTab,
        handleSelected: this.selectTabByValue.bind(this, 'return-notes-tab')
      }
    ];
    this.initialized = true;
  }

  //update note tab heading amount
  async setNoteListLength(event){
    if (!isNaN(event)) {
      this.returnSummaryTabs.find(notes => notes.value === "return-notes-tab").heading = event === 1 ? await this._getNls('SHARED.NOTES.LABEL_NOTE_COUNT' ,
      { count: event }) : await this._getNls('SHARED.NOTES.LABEL_NOTES_COUNT' ,
      { count: event })
    }
  }

  selectTabByValue(tabValue): void {
    this.selectedTab = tabValue;
    this.returnSummaryTabs.forEach(x => {
      if (x.value === tabValue) {
        x.active = true;
        x.content = x.content ? x.content : this.setTabContent(tabValue);
      } else {
        x.active = false;
      }
    });
  }

  setTabContent(tabValue): void {
    let tabContent;
    switch (tabValue) {
      case 'summary-tab':
        tabContent = this.summaryTab;
        break;
      case 'return-notes-tab':
        tabContent = this.notesTab;
        break;
    }
  }
}
