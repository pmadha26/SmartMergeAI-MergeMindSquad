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

/*
 * Public API Surface of return-shared
 */

import { fromPairs } from 'lodash';

export * from './lib/common/shared-root-providers.module';
export * from './lib/return-shared.module';
export * from './lib/components/sample-shared.component';
export { ItemImageComponent } from './lib/components/item-image/item-image.component';

export { BaseEnvironment } from './lib/common/environment.base';
export { Constants, TenantFieldMap, ContactTypes, Validation, Rules, DelMethod, ExchangeLineErrorCodes } from './lib/common/return.constants';

export { CommonService } from './lib/data-service/common-service.service';
export { BreadcrumbService } from './lib/data-service/breadcrumb.service';
export { ReturnListDataService } from './lib/data-service/return-list-data.service';
export { PaymentDataService } from './lib/data-service/payment-data.service'
export { ReturnSearchForm } from './lib/search-form/return-search.class';
export { BindHelper } from './lib/data-service/bind-helper.class';
export { ErrorHandlerService } from './lib/data-service/error-handler.service';
export { ActionParams} from './lib/actions/paramtypes/paramtypes'

export * from './lib/functions';

//  Ngrx
export { CONSOLIDATED_UI_STATE_REDUCERS, UI_STATE_REDUCERS_TOKEN, UiStateReducersService } from './lib/state/ui-state-reducers.service';

// Types
export * from './lib/state/types/return.interface';
export * from './lib/state/types/base-types';
export * from './lib/state/types/order.interface';

// Entity
export { EntityStoreModule } from './lib/state/entities/entity-store.module';
export * as EntityActions from './lib/state/entities/entity.actions';
export { EntityStoreService } from './lib/state/entities/entity-store.service';

// Mashup
export {
  MASHUP_RESPONSE_MAPPERS,
  MashupMapperResponse,
  MashupResponseMapper,
  MashupResponseProcessorService,
  MashupMapperResponseChain,
} from './lib/state/mashup/mashup-rsp-processor.service';
export * as MashupActions from './lib/state/mashup/mashup.actions';
export { PaginationModel } from './lib/state/mashup/mashup.actions';

// configuration
export * as ConfigurationActions from './lib/state/configuration/configuration.actions';
export { CommonCode } from './lib/state/configuration/configuration.types';
export { ConfigurationModule } from './lib/state/configuration/configuration.module';
export { selectCommonCode } from './lib/state/configuration/configuration.reducers';
export * as ConfigurationSelectors from './lib/state/configuration/configuration.selectors';

// mashup response mappers
export { CommonCodeResponseMapper } from './lib/mappers/configuration.mappers';
export { OrderMapper } from './lib/mappers/order.mapper';
export { ExchangeOrderMapper } from './lib/mappers/exchange-order.mapper';
export { ExchangeLineMapper } from './lib/mappers/exchange-line.mapper';
export { ReturnOrderMapper } from './lib/mappers/return.mapper';
export { ExchangeReturnPaymentMapper } from './lib/mappers/exchange-return-payment.mapper';
export { AlertMapper } from './lib/mappers/alert.mapper';
export { NoteMapper } from './lib/mappers/note.mapper';
export { LineNotesMapper } from './lib/mappers/line-notes.mapper';
export { ReturnLineMapper } from './lib/mappers/return-line.mapper';
export { ReturnLineDetailsMapper } from './lib/mappers/return-line-details.mapper';
export { ReturnShipmentMethodsMapper } from './lib/mappers/return.shiment.methods.mapper';
export { OrderLineMapper } from './lib/mappers/order-line.mapper';
export { BundleOrderLineMapper } from './lib/mappers/bundle-order-line.mapper';
export { PaginatedMashupResponseMapper } from './lib/mappers/paginated-mashup.mapper';
export { PassthroughResponseMapper } from './lib/mappers/pass-through-response.mapper';
export { PaymentOrderMapper } from './lib/mappers/payment.mapper';

// pagination
export * as PaginationActions from './lib/state/pagination/pagination.actions';
export { PaginationState, SortCriteriaType } from './lib/state/pagination/pagination.actions';
export { paginationEffectCreator } from './lib/state/pagination/pagination.effects';
export { PaginationModule } from './lib/state/pagination/pagination.module';

// side panel
export { ReturnPricingSummaryComponent } from './lib/components/return-pricing-summary/return-pricing-summary.component';
export { PromotionBoxComponent } from './lib/components/promotion-box/promotion-box.component';
export { AddNotesModalComponent } from './lib/components/notes/add-notes-modal/add-notes-modal.component';
export { NotesFormComponent } from './lib/components/notes/notes-form/notes-form.component';
export { ViewAllNotesModalComponent } from './lib/components/notes/view-all-notes-modal/view-all-notes-modal.component';
export { ReturnNotesComponent } from './lib/components/notes/return-notes/return-notes.component';
export { ReturnNotesCardComponent } from './lib/components/notes/return-notes-card/return-notes-card.component';
export { NotesFilterComponent } from './lib/components/notes/notes-filter/notes-filter.component';
export { ReturnNoteDetailsModalComponent } from './lib/components/notes/return-note-details-modal/return-note-details-modal.component';
export { SummaryNotesPanelComponent } from './lib/components/summary-notes-panel/summary-notes-panel.component';
export { AdjustPricingModalComponent } from './lib/components/adjust-pricing-modal/adjust-pricing-modal.component';
export { ReturnFulfillmentLinesComponent } from './lib/components/return-fulfillment-lines/return-fulfillment-lines.component';
export { ReturnLinePricingSummaryModalComponent } from './lib/components/return-line-pricing-summary-modal/return-line-pricing-summary-modal.component';
export { SidePanelStateModule } from './lib/state/side-panel/side-panel.module';
export * as SidePanelStateActions from './lib/state/side-panel/side-panel.actions';
export * as SidePanelStateSelectors from './lib/state/side-panel/side-panel.selectors';

// Line summary
export * as LineSummaryActions from './lib/state/line-summary/line-summary.actions';
export { LineSummaryStateModule } from './lib/state/line-summary/line-summary.module';

// Adjust Pricing
export * as AdjustPricingActions from './lib/state/adjust-pricing/adjust-pricing.actions';
export { AdjustPricingStateModule } from './lib/state/adjust-pricing/adjust-pricing.module';
export { AdjustPricingLineTableComponent } from './lib/components/adjust-pricing-modal/adjust-pricing-line-table/adjust-pricing-line-table.component';
export { AdjustPricingReturnTableComponent} from './lib/components/adjust-pricing-modal/adjust-pricing-return-table/adjust-pricing-return-table.component';

export { BucMaskPipe } from './lib/pipes/mask.pipe';
