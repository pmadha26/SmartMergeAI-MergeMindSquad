/*
 * IBM Confidential
 * OCO Source Materials
 * 5737-D18, 5725-D10
 *
 * (C) Copyright International Business Machines Corp. 2022, 2024
 *
 * The source code for this program is not published or otherwise divested
 * of its trade secrets, irrespective of what has been deposited with the
 * U.S. Copyright Office.
 */

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    BucCommonComponentsModule,
    BucFeatureComponentsModule,
    BucCommonCurrencyFormatPipe,
    BucCommonQuantityFormatPipe,
} from '@buc/common-components';
import { CCFeatureComponentsModule } from '@buc/cc-components';
import {
    ModalModule,
    ModalService,
    TilesModule,
    NumberModule,
    TagModule,
    ButtonModule,
    DialogModule,
    NotificationModule,
    SkeletonModule,
    AccordionModule,
    SearchModule,
    IconModule,
    IconService,
    InputModule,
    TooltipModule,
} from 'carbon-components-angular';
import { TranslateModule } from '@ngx-translate/core';
import { SampleSharedComponent } from './components/sample-shared.component';

import { SidePanelStateModule } from './state/side-panel/side-panel.module';
import { StoreModule } from '@ngrx/store';
import { CONSOLIDATED_UI_STATE_REDUCERS, UiStateReducersService } from './state/ui-state-reducers.service';
import { ReturnPricingSummaryComponent } from './components/return-pricing-summary/return-pricing-summary.component';
import { PromotionBoxComponent } from './components/promotion-box/promotion-box.component';
import { AddNotesModalComponent } from './components/notes/add-notes-modal/add-notes-modal.component';
import { NotesFormComponent } from './components/notes/notes-form/notes-form.component';
import { NotesFilterComponent } from './components/notes/notes-filter/notes-filter.component';
import { ViewAllNotesModalComponent } from './components/notes/view-all-notes-modal/view-all-notes-modal.component';
import { ReturnNotesComponent } from './components/notes/return-notes/return-notes.component';
import { ReturnNotesCardComponent } from './components/notes/return-notes-card/return-notes-card.component';
import { ReturnNoteDetailsModalComponent } from './components/notes/return-note-details-modal/return-note-details-modal.component';
import { SummaryNotesPanelComponent } from './components/summary-notes-panel/summary-notes-panel.component';
import { AdjustPricingModalComponent } from './components/adjust-pricing-modal/adjust-pricing-modal.component';
import { ReturnLinePricingSummaryModalComponent } from './components/return-line-pricing-summary-modal/return-line-pricing-summary-modal.component';
import { PaginationModule } from './state/pagination/pagination.module';
import { BucMaskPipe } from './pipes/mask.pipe';
import { ItemImageComponent } from './components/item-image/item-image.component';
import { ReturnFulfillmentLinesComponent } from './components/return-fulfillment-lines/return-fulfillment-lines.component';
import { LineSummaryStateModule } from './state/line-summary/line-summary.module';
import { AdjustPricingStateModule } from './state/adjust-pricing/adjust-pricing.module';

// Icons
import TrashCan16 from "@carbon/icons/es/trash-can/16";
import Edit16 from "@carbon/icons/es/edit/16";
import Screen16 from "@carbon/icons/es/screen/16";
import Group16 from "@carbon/icons/es/group/16";
import Copy16 from "@carbon/icons/es/copy/16";
import Document16 from "@carbon/icons/es/document/16";
import CloseFilled from "@carbon/icons/es/close--filled/16";
import WarningAlt from "@carbon/icons/es/warning--alt/16";
import PauseFilled from "@carbon/icons/es/pause--filled/16";
import PauseOutlineFilled from "@carbon/icons/es/pause--outline--filled/16";
import User16 from "@carbon/icons/es/user/16";
import Popup16 from "@carbon/icons/es/popup/16";
import Tag16 from "@carbon/icons/es/tag/16";
import Gift from "@carbon/icons/es/gift/16.js";
import StopOutline16 from "@carbon/icons/es/stop--outline/16";
import Information16 from "@carbon/icons/es/information/16";
import CheckmarkOutlineWarning from "@carbon/icons/es/checkmark--filled--warning/16";
import Connect16 from "@carbon/icons/es/connect/16";
import FeatureMembership16 from "@carbon/icons/es/feature-membership/16";
import ConnectReference16 from "@carbon/icons/es/connect--reference/16";
import { AdjustPricingLineTableComponent } from './components/adjust-pricing-modal/adjust-pricing-line-table/adjust-pricing-line-table.component';
import { AdjustPricingReturnTableComponent } from './components/adjust-pricing-modal/adjust-pricing-return-table/adjust-pricing-return-table.component';
import Add16 from "@carbon/icons/es/add/16";
import Delete16 from "@carbon/icons/es/delete/16";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16";
import Nominal16 from "@carbon/icons/es/nominal/16"

function getUiStateReducers(svc: UiStateReducersService) {
    return svc.getActionReducerMap();
}

const modules = [
    CommonModule,
    FormsModule,
    ModalModule,
    InputModule,
    TranslateModule,
    BucCommonComponentsModule,
    BucFeatureComponentsModule,
    CCFeatureComponentsModule,
    SidePanelStateModule,
    LineSummaryStateModule,
    AdjustPricingStateModule,
    TilesModule,
    PaginationModule,
    NumberModule,
    TagModule,
    ButtonModule,
    DialogModule,
    NotificationModule,
    SkeletonModule,
    AccordionModule,
    SearchModule,
    IconModule,
    TooltipModule
];

const components = [
    ReturnPricingSummaryComponent,
    AddNotesModalComponent,
    NotesFormComponent,
    NotesFilterComponent,
    ViewAllNotesModalComponent,
    ReturnNotesComponent,
    ReturnNotesCardComponent,
    ReturnNoteDetailsModalComponent,
    SummaryNotesPanelComponent,
    AdjustPricingModalComponent,
    ReturnFulfillmentLinesComponent,
    SampleSharedComponent,
    BucMaskPipe,
    ItemImageComponent,
    ReturnLinePricingSummaryModalComponent,
    AdjustPricingReturnTableComponent,
    AdjustPricingLineTableComponent,
    PromotionBoxComponent
];

const services = [
    ModalService,
    UiStateReducersService
];

@NgModule({
    imports: [
        ...modules,
        StoreModule.forFeature('uiState', CONSOLIDATED_UI_STATE_REDUCERS),
        IconModule
    ],
    exports: [
        ...modules,
        ...components
    ],
    declarations: [
        ...components,
    ],
    providers: [
        ...services,
        {
            provide: CONSOLIDATED_UI_STATE_REDUCERS,
            useFactory: getUiStateReducers,
            deps: [UiStateReducersService]
        },
        BucMaskPipe
    ]
})
export class ReturnSharedModule {
  constructor(protected iconService: IconService) {
    iconService.registerAll([
      ChevronDown16, Delete16, Add16, TrashCan16, Edit16, Screen16, Group16, Copy16,
      Document16, User16, Popup16, Tag16, StopOutline16,Information16,CheckmarkOutlineWarning,
      CloseFilled, WarningAlt, PauseFilled, Gift, PauseOutlineFilled, Connect16,
      FeatureMembership16, ConnectReference16, Nominal16
    ]);
  }
}
