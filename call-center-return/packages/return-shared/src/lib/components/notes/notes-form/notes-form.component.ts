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

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { Constants } from './../../../common/return.constants';
import { TranslateService } from '@ngx-translate/core';
import { SharedExtensionConstants } from '../../../shared-extension.constants';

@Component({
  selector: 'call-center-notes-form:not([extn])',
  templateUrl: './notes-form.component.html',
  styleUrls: ['./notes-form.component.scss'],
})
export class NotesFormComponent implements OnInit {
  EXTENSION = {
    TOP: SharedExtensionConstants.NOTES_FORM_RS_TOP,
    BOTTOM: SharedExtensionConstants.NOTES_FORM_RS_BOTTOM
  };

  componentId = "return-notes-form";

  @Input() note;
  @Input() toggleValidation = false;
  @Input() allowExchangeNotes;
  @Input() categoryEditable = true;
  @Input() categoryVisible = false;
  @Input() categoryType: string;

  @Output() changeNote = new EventEmitter<any>();
  @Output() setCategoryType = new EventEmitter<any>();

  // API response of notes reason cached in parent
  @Input() set returnReasons(reasons) {
    if (reasons) {
      this.reasonList = reasons.map(item => ({
        content: item.content,
        selected: this.note?.reasonCode === item.value,
        value: item.value
      }));
    }
  };

  @Input() set contactTypeList(contacts) {
    if (contacts) {
      this.contactList = contacts.map(item => ({
        content: item.content,
        selected: this.note?.contactType === item.value,
        value: item.value
      }));
    }
  };

  nlsMap = {
    'SHARED.NOTES.LABEL_RETURN': '',
    'SHARED.NOTES.LABEL_EXCHANGE': ''
  };

  contactList = [];
  reasonList = [];
  categoryList = [];

  notesData = {
    noteType: '',
    contactType: '',
    contactReference: '',
    notesDescription: '',
    priority: false,
    internal: false
  };

  constructor(
    protected translateService: TranslateService,
  ) { }

  ngOnInit(): void {
    this._initTranslations();
    this.initializeCategoryList();
    const loginUserId = BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLoginId();
    // We are editing a note
    if (this.note?.notesKey) {
      this.categoryEditable = false;
      this.notesData = {
        contactReference: this.note.contactReference,
        contactType: this.note.contactType,
        notesDescription: this.replaceBreakHtmlWithNewLine(this.note.noteText),
        priority: Number(this.note.priority) === 1,
        noteType: this.note.reasonCode,
        internal: this.note.visibleToAll === 'N',
        ...(this.note ? { notesKey: this.note.notesKey } : { createUserId: loginUserId })
      };
    }
  }

  replaceBreakHtmlWithNewLine(noteText) {
    const breakHtml = /<br\/>|<br>/g
    noteText = noteText.replace(breakHtml, '\n');
    return noteText;
  };

  inputChanged(): void {
    this.changeNote.emit(this.notesData);
  }

  onCategorySelected(event): void {
    this.categoryType = event.length === 0 ? '' :
    event && event.item && event.item.value;
    if (this.categoryType) {
      this.setCategoryType.emit(this.categoryType);
    }
  }

  onDropdownSelected(type, event): void {
    this.notesData[type] = Array.isArray(event) && event.length === 0 ? '' :
      event && event.item && event.item.value;
    this.inputChanged();
  }

  onCheckbox(item, event): void {
    this.notesData[item] = event && event.checked;
    this.inputChanged();
  }

  private initializeCategoryList() {
    this.categoryList = [
      {
        content: this.nlsMap['SHARED.NOTES.LABEL_RETURN'],
        selected: this.categoryType !== Constants.EXCHANGE_CATEGORY, 
        value:Constants.RETURN_CATEGORY
      }, 
      {
        content: this.nlsMap['SHARED.NOTES.LABEL_EXCHANGE'], 
        selected:this.categoryType === Constants.EXCHANGE_CATEGORY, 
        value:Constants.EXCHANGE_CATEGORY
      }
    ];
  }

  private async _initTranslations(): Promise<any> {
    const keys = Object.keys(this.nlsMap);
    const json = this.translateService.instant(keys);
    keys.forEach(k => this.nlsMap[k] = json[k]);
  }
}
