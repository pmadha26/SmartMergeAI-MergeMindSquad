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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SharedExtensionConstants } from '../../../shared-extension.constants';

@Component({
  selector: 'call-center-notes-filter:not([extn])',
  templateUrl: './notes-filter.component.html',
  styleUrls: ['./notes-filter.component.scss']
})
export class NotesFilterComponent {
  EXTENSION = {
    TOP: SharedExtensionConstants.NOTES_FILTER_RS_TOP,
    BOTTOM: SharedExtensionConstants.NOTES_FILTER_RS_BOTTOM
  };
  @Input() notesTypeList: any[] = [];
  @Input() disabled = false;
  @Input() categoryList: any[] = [];
  @Input() categoryType: any[] = [];
  @Input() allowExchangeNotes: any;
  @Output() filterChange = new EventEmitter<any>();

  // Used to save `applied` instance of filters
  filters = {
    system: false,
    user: false,
    highPriority: false,
    searchBy: '',
    typeSelected: [],
    category: this.categoryType ?? ''
  };

  // Used to update view
  filtersInView = {
    system: false,
    user: false,
    highPriority: false,
    typeSelected: [],
  };

  isOpen = false;

  componentId = 'NotesFilterComponent';

  nlsMap = {
    'SHARED.NOTES.LABEL_RETURN': '',
    'SHARED.NOTES.LABEL_EXCHANGE': ''
  };

  onCheckbox(type, checked, emitEvent = false): void {
    this.filtersInView[type] = checked;

    // Emit changes
    if (emitEvent) {
      this.filters[type] = checked;
      this.filtersInView[type] = checked;
      this.filterChange.emit(this.filters);
    }
  }

  onComboSelected(event): void {
    this.filtersInView.typeSelected = event.map(type => type.value);
  }

  clearSearch(): void {
    this.filters.searchBy = '';
    this.filterChange.emit(this.filters);
  }

  onSearch(event): void {
    this.filters.searchBy = event;
    this.filterChange.emit(this.filters);
  }

  onCategoryChange(event): void {
    this.filters.category = event.item.value;
    this.filterChange.emit(this.filters);
  }

  // Set to default state
  clearFilterClicked(event) {
    event.preventDefault();
    this.filtersInView = {
      system: false,
      user: false,
      highPriority: false,
      typeSelected: [],
    };
    this.notesTypeList = this.notesTypeList.map((type) => ({ ...type, selected: false }));
  }

  applyFilter() {
    this.isOpen = false;
    this.filters = { ...this.filters, ...this.filtersInView };
    // Emit changes
    this.filterChange.emit(this.filters);
  }

  closeFlyout() {
    this.isOpen = false;
  }

  // Prevent click event from propagating resulting in the flyout to close
  onClear(event: Event) {
    event.stopPropagation();
  }
}
