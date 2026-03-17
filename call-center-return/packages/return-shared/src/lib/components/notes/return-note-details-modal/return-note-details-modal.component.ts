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

import { Component, Inject, Injector, OnInit } from '@angular/core';
import { BaseModal } from 'carbon-components-angular';
import { SharedExtensionConstants } from '../../../shared-extension.constants';

@Component({
  selector: 'call-center-return-note-details-modal',
  templateUrl: './return-note-details-modal.component.html',
  styleUrls: ['./return-note-details-modal.component.scss']
})
export class ReturnNoteDetailsModalComponent extends BaseModal implements OnInit {
  EXTENSION = {
    TOP: SharedExtensionConstants.RETURN_NOTE_DETAILS_MODAL_RS_TOP,
    BOTTOM: SharedExtensionConstants.RETURN_NOTE_DETAILS_MODAL_RS_BOTTOM
  };

  componentId = "return-note-details-modal"
  note: any;
  searchKey: any;
  isModal = true;
  categoryType: any;
  isHistoryOrder: any;

  constructor(protected inj: Injector, @Inject('modalData') public modalData) {
    super();
  }

  ngOnInit(): void {
    this.note = this.modalData.note;
    this.searchKey = this.modalData.searchKey;
    this.categoryType = this.modalData.categoryType;
    this.isHistoryOrder = this.modalData.isHistoryOrder;
  }
}

