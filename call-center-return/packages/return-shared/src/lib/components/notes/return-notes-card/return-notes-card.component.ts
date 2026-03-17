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
import { Constants, ContactTypes } from '../../../common/return.constants';
import { BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { SharedExtensionConstants } from '../../../shared-extension.constants';

@Component({
  selector: 'call-center-return-notes-card:not([extn])',
  templateUrl: './return-notes-card.component.html',
  styleUrls: ['./return-notes-card.component.scss']
})
export class ReturnNotesCardComponent implements OnInit {
  EXTENSION = {
    TOP: SharedExtensionConstants.RETURN_NOTES_CARD_RS_TOP,
    BOTTOM: SharedExtensionConstants.RETURN_NOTES_CARD_RS_BOTTOM
  };
  @Input() note: any;
  @Input() searchKey: any;
  @Input() isModal = false;
  @Input() showControls = false;
  @Input() partOfList = false;
  @Input() showNoteReasonText = true;
  @Input() tagPosition: "top" | "bottom" = "bottom";
  @Input() categoryType = Constants.RETURN_CATEGORY;
  @Input() isHistoryOrder;

  @Output() deleteNote = new EventEmitter<any>();
  @Output() editNote = new EventEmitter<any>();

  contactTypes = ContactTypes;
  displayCopyText = false;
  isEditableByUser = false;

  componentId = 'return-notes-card';

  notesResourcePermission : any;

  ngOnInit() {
    this.setNotePermissions()
    const loginUserId = BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLoginId();
    if(this.note.createuserid == loginUserId){
      this.isEditableByUser = true;
    }
  }

  setNotePermissions(){
    this.notesResourcePermission = {
      EDIT: this.categoryType == Constants.EXCHANGE_CATEGORY ? 'ICC000028' : 'ICC000091',
      DELETE: this.categoryType == Constants.EXCHANGE_CATEGORY ? 'ICC000029' : 'ICC000092'
    }
 }
 
  copyToClipboard(val): void {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
    this.displayCopyText = true;
    setTimeout(() => {
      this.displayCopyText = false;
    }, 2000);
  }

  getNumber(val) {
    if (val) {
      return parseInt(val);
    }
  }
}
