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

import {
  Component,  Input, EventEmitter, OnDestroy, OnInit, Output, QueryList, TemplateRef, ViewChild, ViewChildren} from '@angular/core';
import {
  BucIconTemplatesComponent, 
  BucTableHelperService, BucTableModel, 
  BucContentTemplatesComponent,
  BucTableConfiguration,
  BucTableHeaderItem,
  TemplateIdDirective,
  COMMON,
  ClientSidePaginationBaseTableComponent,
  getArray,
  BucTableTemplateMapping,
  BucTableHeaderModel,
  TableOverflowMenuAction,
  BucTableToolbarModel,
  BucCommonCurrencyFormatPipe,
  CommonBinaryOptionModalComponent,
  localeBuc2Angular
} from '@buc/common-components';
import { BucBaseUtil, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { ModalService, TableHeaderItem } from 'carbon-components-angular';
import { get } from 'lodash';
import { Observable, ReplaySubject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Constants } from '../../common/return.constants';
import { getDefaultImageUrl, tableCancelText } from '../../functions';
import * as LineSummaryActions from '../../state/line-summary/line-summary.actions'
import * as ConfigurationSelectors from '../../state/configuration/configuration.selectors';
import * as EntityActions from '../../state/entities/entity.actions'
import { EntityStoreService } from '../../state/entities/entity-store.service';
import { Return } from '../../state/types/return.interface';
import { TranslateService } from '@ngx-translate/core';
import { SharedExtensionConstants } from '../../shared-extension.constants';

@Component({
  selector: 'call-center-return-fulfillment-lines:not([extn])',
  templateUrl: './return-fulfillment-lines.component.html',
  styleUrls: ['./return-fulfillment-lines.component.scss'],
})
export class ReturnFulfillmentLinesComponent extends ClientSidePaginationBaseTableComponent implements OnInit, OnDestroy {
  EXTENSION = {
    TOP: SharedExtensionConstants.RETURN_FULFILLMENT_LINES_RS_TOP,
    BOTTOM: SharedExtensionConstants.RETURN_FULFILLMENT_LINES_RS_BOTTOM
  };

  public readonly componentId = 'return-fulfillment-lines-component';

  public readonly defaultImageUrl = getDefaultImageUrl();

  // Table headers
  public readonly TH_LINE = 'line';
  public readonly TH_ITEM_NAME = 'itemName';
  public readonly TH_RECEIVED_QUANTITY = 'receivedQuantity';
  public readonly TH_LINE_TOTAL = 'lineTotal';
  public readonly TH_DELETE_ORDERLINE = 'deleteOrderLine';
  public readonly defaultSortColumnId = this.TH_LINE;

  private templates: { [id: string]: TemplateRef<any> } = {};
  private searchChange$ = new ReplaySubject<string>(1);
  private subscriptions: Subscription[] = [];

  public readonly TABLE_ACTIONS = {
    ACTION_CUSTOMER_CAN_KEEP: 'customerCanKeep',
    ACTION_REMOVE_LINE: 'removeLine',
    ACTION_CHANGE_TO_SHIPPING: 'changeToShipping',
    ACTION_ADJUST_PRICING: 'adjustPricing',
    ACTION_NOTES: 'notes'
  };
  actionResourceIds: any = {};
  resourceIds = {
    CUSTOMER_CAN_KEEP: 'ICC000044',
    ADJUST_PRICING_RETURN_LINE_RESOURCE_ID: 'ICC000075'
  };

  @ViewChild('iconTemplates', { static: true })
  iconTemplates: BucIconTemplatesComponent;
  @ViewChild('contentTemplates', { static: true })
  contentTemplates: BucContentTemplatesComponent;
  @ViewChild('customerKeepHeaderTpl', {static: true})
  customerKeepHeaderTemplate: TemplateRef<any>;
  @ViewChild('pickupHeaderTpl', {static: true})
  pickupHeaderTemplate: TemplateRef<any>;
  @ViewChild('LineTotalHeaderTemplate', { static: true })
  public LineTotalHeaderTemplate: TemplateRef<any>;
  isAdjustPricingResourceAllowed: boolean;
  
  @ViewChildren(TemplateIdDirective) set _templates(
    a: QueryList<TemplateIdDirective>
  ) {
    if (a) {
      a.forEach(({ id, template }) => (this.templates[id] = template));
    }
  }

  @Input() fulfillmentGroup: any;
  @Input() thumbnailView: boolean = false;
  @Input() type: string = 'shipping';
  @Input() showSelectionColumn = false;
  @Input() showActions = false;
  @Input() returnEntity: Return;
  @Input() refreshActions = [];
  @Output() toolbarActionClicked = new EventEmitter<{id: string, items: Array<any>}>();
  @Output() overflowActionClicked = new EventEmitter<{id: string, items: Array<any>}>();
  @Output() iconActionClicked = new EventEmitter<{id: string, item: Record<string, unknown>}>();
  @Input() hasSearch = false;

  public tableModel: BucTableModel = new BucTableModel();
  public tableHeaderModel: BucTableHeaderModel;
  public cancelText: any = { CANCEL: '' };
  public paginationTranslations: any;
  public isSearchActive = false;
  public orderLines: Array<any>;
  public componentLines: Array<any>;
  toolbarModel: BucTableToolbarModel;
  overflowMenu: TableOverflowMenuAction[];
  public selected: Array<any> = [];
  overrideNoteCode: string;
  lineNotes = [];
  public initialLoad = true;

  lcl = localeBuc2Angular(BucSvcAngularStaticAppInfoFacadeUtil.getUserLanguage());
  public currPipe: BucCommonCurrencyFormatPipe = new BucCommonCurrencyFormatPipe(this.lcl)

  constructor(
    tableHelperService: BucTableHelperService,
    modalService: ModalService,
    public entityStoreSvc: EntityStoreService,
    private translate: TranslateService
  ) {
    super(tableHelperService, modalService);
  }

  ngOnInit() {
    this.initializeOrderLines();
    this.initialize();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async initialize(): Promise<any> {
    this.initialLoad = true;
    const translateSvc = this.getTranslateService();
    this.paginationTranslations = await COMMON.paginationTranslations(translateSvc);
    this.cancelText = await tableCancelText(translateSvc);
    this.subscriptions.push(
      this.entityStoreSvc.getStore().select(ConfigurationSelectors.getOverrideNoteRule)
        .subscribe(code => this.overrideNoteCode = code),
      this.entityStoreSvc.getStore().select(
        EntityActions.getAllLineNotes
      ).subscribe(lineNotes => {
        this.lineNotes = lineNotes;
        if (this.tableModel) {
          this.loadTableAsync();
        }
      })
    );

    const templates: BucTableTemplateMapping = {};
    if (this.type === 'pickup') {
      templates.headerModel = {
        template: this.pickupHeaderTemplate,
        templateData: {lineCount: this.orderLines.length}
      }
    } else if (this.type === 'customerKeep') {
      templates.headerModel = {
        template: this.customerKeepHeaderTemplate,
        templateData: {lineCount: this.orderLines.length}
      }
    }

    this.getActionResourceIds();
    const key: string = this.TH_LINE_TOTAL;
    templates.headers = {
      ...(templates.headers || {}),
      [key]: {
        template: this.LineTotalHeaderTemplate,
        data: ''
      }
    };
    await this.initializeTable(`${this.type}-return-fulfillment-lines-table`, templates);
    const tableConfiguration: BucTableConfiguration = this.getTableConfiguration();
    await this.addReceivedQuantityColumn();
    this.tableModel = tableConfiguration.getBucTableModel();
    this.toolbarModel = tableConfiguration.getToolbarModel();
    this.overflowMenu = tableConfiguration.getOverflowMenuActions();
    this.tableHeaderModel = tableConfiguration.getHeaderModel();
    const totalAmountHeader = tableConfiguration.getColumnById(this.TH_LINE_TOTAL); 
    if(totalAmountHeader && totalAmountHeader.name) {
      totalAmountHeader.data = this.translate.instant(totalAmountHeader.name);
    }
    this.disableTableFieldConfiguration();
    await this.applyUserPreference().toPromise();
    this.initialLoad = false;
    this.isAdjustPricingResourceAllowed = BucSvcAngularStaticAppInfoFacadeUtil.canUserAccessResource(this.resourceIds.ADJUST_PRICING_RETURN_LINE_RESOURCE_ID);
    this.setToolbarAndMenuActions();
    // subscriptions
    this.subscriptions.push(
      // search value change observable
      this.searchChange$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((searchStr) => {
          searchStr = searchStr.trim();
          this.isSearchActive =  searchStr !== '';
          this.isSearchActive ? this.searchTable(searchStr) : this.clearSearch()
        })
    );
  }

  private setToolbarAndMenuActions() {
    const tableConfiguration: BucTableConfiguration = this.getTableConfiguration();
    const actionIds = [
      this.TABLE_ACTIONS.ACTION_CHANGE_TO_SHIPPING,
      this.TABLE_ACTIONS.ACTION_CUSTOMER_CAN_KEEP,
      this.TABLE_ACTIONS.ACTION_REMOVE_LINE,
      this.TABLE_ACTIONS.ACTION_ADJUST_PRICING,
      this.TABLE_ACTIONS.ACTION_NOTES
    ];

    const adjustPricingAction = this.getToolbarActionById(this.TABLE_ACTIONS.ACTION_ADJUST_PRICING);
    let label = this.isAdjustPricingResourceAllowed ? 'CREATE_RETURN.RETURN_METHOD.ORDER_LINES.ADJUST_PRICING' : 'CREATE_RETURN.RETURN_METHOD.ORDER_LINES.VIEW_PRICING';
    label = this.getTranslateService().instant(label)
    if (adjustPricingAction) {
      adjustPricingAction.value = label;
    }

    const adjustPricingOverflow = this.getOverflowMenuActionById(this.TABLE_ACTIONS.ACTION_ADJUST_PRICING);
    if (adjustPricingOverflow) {
      adjustPricingOverflow.label = label;
    }
    // overflow actions
    this.overflowMenu = tableConfiguration.getOverflowMenuActions();
    tableConfiguration.setActiveOverflowMenuActions(actionIds);
    this.setOverflowMenuResourceIds(this.actionResourceIds, actionIds);
    // toolbar actions
    this.setActionResourceIds(this.actionResourceIds, actionIds);
    tableConfiguration.setActiveTableToolbarActions(actionIds);
  }

  getActionResourceIds() {
    this.actionResourceIds[this.TABLE_ACTIONS.ACTION_CUSTOMER_CAN_KEEP] = this.resourceIds.CUSTOMER_CAN_KEEP;
  }
  
  initializeOrderLines() {
    let lines = [];
    switch (this.type) {
      case 'shipping':
      case 'shipment-lines':
        const shipment = this.fulfillmentGroup.Shipment;
        if (!BucBaseUtil.isVoid(shipment)) {
          // shipment line might be created from a receipt instead of shipment line table.
          const orderLinesMap = COMMON.toMap(getArray(get(this.fulfillmentGroup, 'OrderLines.OrderLine')), 'OrderLineKey');
          lines = getArray(get(shipment, 'ShipmentLines.ShipmentLine'))
            .map(sl => Object.assign({}, sl, get(sl, 'OrderLine', orderLinesMap[sl.OrderLineKey])));
        } else {
          lines = getArray(get(this.fulfillmentGroup, 'OrderLines.OrderLine'));
        }
        break;
      case 'pickup':
      case 'customerKeep':
        lines = getArray(get(this.fulfillmentGroup, 'OrderLines.OrderLine'));
        break;
    }
    this.orderLines = lines.map(ol => ({
      ...ol,
      Currency: this.fulfillmentGroup.Currency,
      DisplayDescription: this.getDisplayDescription(ol),
      ImageUrl: this.getImageUrl(ol),
      OrderedQty: get(ol, 'OrderLine.OrderedQty', get(ol, 'OrderedQty'))
    }));
    this.componentLines = this.getBundleComponentLines(lines, false);
  }

  openPricingSummary(data) {
    const selectedLine = this.orderLines.find(item => item.OrderLineKey === data.id);
    this.entityStoreSvc.dispatchAction(
      LineSummaryActions.openLineSummaryModal({
        linesummary: {
            modalText: '',
            modalData: {
              returnLineDetails: selectedLine,
              summaryDetails: this.returnEntity,
              size: 'md',
              ruleSetValues: this.fulfillmentGroup.ruleSetValues,
              refreshActions: this.refreshActions
            }
          }
      })
    )
  }

  selectPage(pageNumber) {
    this.tableModel.currentPage = pageNumber;
    this.gotoPage(pageNumber);
  }

  onColSort(sortCol: number) {
    const header: BucTableHeaderItem = this.tableModel.getHeader(sortCol) as BucTableHeaderItem;
    this.setSort(header);
    this.applySortAndPagination();
  }

  async loadTableAsync() {
    await this.loadTable().toPromise();
  }

  onSearch(searchStr: string) {
    this.initialLoad = false;
    this.searchChange$.next(searchStr);
  }

  protected updateSortCriteria(sortedCols: BucTableHeaderItem[]) {
    if (sortedCols.length > 0) {
      this.setSort(sortedCols[0]);
    } else {
      this.setSort(this.getColumnById(this.defaultSortColumnId));
    }
  }

  protected setSort(sortColumn: BucTableHeaderItem): void {
    this.tableModel.currentSortKey = sortColumn?.['sortKey'];
    this.tableModel.currentSortOrder = sortColumn.descending ? 'Desc' : 'Asc';
  }

  protected fetchTableData(): Observable<any[]> {
    return of(this.orderLines);
  }

  protected onToolbarActionClicked(id: string, event?: any) {
    if (id === this.TABLE_ACTIONS.ACTION_REMOVE_LINE) {
      this.openConfirmationModal();
    } else {
      this.toolbarActionClicked.emit({ id, items: [...this.selected, ...this.getBundleComponentLines(this.componentLines, true)] });
    }
  }

  protected onToolbarContentClicked(id: string, event?: any) {}

  protected onOverflowMenuActionSelected(id: string) {
    this.tableModel.selectAll(false);
    this.overflowActionClicked.emit({id, items: [...this.selected, ...this.getBundleComponentLines(this.componentLines, true)]});
  }

  onSelectRow($event: string[]) {
    this.selected = this.tableModel.data
    .filter((a, i) => this.tableModel.rowsSelected[i])
    .map((r) => (r[0] as any).rowData);
    this.disableToolBarAction();
  }

  disableToolBarAction() {
    const adjustPricingAction = this.getToolbarActionById(this.TABLE_ACTIONS.ACTION_ADJUST_PRICING);
    if (adjustPricingAction) {
      if (this.selected.length > 1) {
        adjustPricingAction.disabled = true;
      } else if (this.selected.length === 1) {
        if(!this.isAdjustPricingResourceAllowed) {
          adjustPricingAction.disabled =  !this.selected[0].LineCharges.LineCharge;
        } else {
          adjustPricingAction.disabled =  this.selected[0].LinePriceInfo.IsLinePriceForInformationOnly === 'Y';
        }
      }
    }

    const notesAction = this.getToolbarActionById(this.TABLE_ACTIONS.ACTION_NOTES);
    if (notesAction && this.selected.length > 1) {
      notesAction.disabled = true;
    }
  }

  protected getDataForColumn(id: string, data: any) {
    let rc;
    switch (id) {
      case this.TH_LINE:
        rc = {
          data: {
            lineNo: data.PrimeLineNo,
            hasNotes: this.returnLinesHasNotes(data),
            isOverridden : this.isReturnLineOverridden(data),
            item: {...data}
          },
          id: data.OrderLineKey,
          rowData: data,
          template: this.templates.lineKeyIcon,
          exportData : data.PrimeLineNo
        };
        break;
      case this.TH_ITEM_NAME:
        const itemId = get(data, 'Item.ItemID', data.ItemID);
        rc = {
          data: {
            itemImageUrl: data.ImageUrl,
            itemId,
            itemDescription: data.DisplayDescription,
            defaultImageUrl: this.defaultImageUrl,
            kitCode: data.ItemDetails?.PrimaryInformation?.KitCode,
            isBundleParent: data.IsBundleParent === 'Y',
            isBundleComponent: data.BundleParentLine?.OrderLineKey ? true : false
          },
          exportData : data.DisplayDescription,
          template: this.templates.itemDetails,
          searchData: `${itemId} ${data.DisplayDescription}`,
          sortData: itemId
        };
        break;
      case this.TH_LINE_TOTAL :
        const displayData = this.currPipe.transform(data.LineOverallTotals.LineTotal,data.Currency, 'symbol');
        const includedInPrice = data.LinePriceInfo.IsLinePriceForInformationOnly === 'Y'
        rc = {
          id: data.OrderLineKey,
          data: {
            value: displayData,
            id: data.OrderLineKey,
            priceIncluded: includedInPrice,
            priceAdjusted: Number(data.LineOverallTotals.LineAdjustments) !== 0
          },
          template: this.templates.lineTotal,
          title: '',
          exportData : includedInPrice? this.getTranslateService().instant('RETURN_SUMMARY.RETURN_LINES.LABEL_INCLUDED') : displayData
        };
        break;
      case this.TH_DELETE_ORDERLINE:
        rc = {
          data: {
            data
          },
          id: data.id,
          template: this.templates.deleteIcon,
        }
        break;
      case BucTableConfiguration.TH_OVER_FLOW_MENU_ACTION_ID:
        rc = {
          data: {
            data
          },
          id: data.id,
          template: this.templates.overflowMenu,
        };
        break;
    }
    return rc;
  }

  returnLinesHasNotes(data): boolean {
    return this.lineNotes?.find(n => n.id === data.OrderLineKey)?.notes.length > 0;
  }

  isReturnLineOverridden(data): boolean {
    // Todo: Check transactionViolation when availble in getReturnFulfilmentSummary
    return false;
  }

  isBundleComponent(data): boolean {
   return !BucBaseUtil.isUndefinedOrNull(data?.BundleParentLine?.OrderLineKey)
  }

  protected onTableLoadComplete(): void {
    this.initialLoad = false;
    this.tableModel.isLoading = false;
  }

  private getImageUrl(ol: any) {
    let imageUrl = get(ol, 'OrderLine.ItemDetails.ImageURL');
    if (BucBaseUtil.isVoid(imageUrl)) {
      const imageLoc: string = get(ol, 'ItemDetails.PrimaryInformation.ImageLocation');
      const imageId: string = get(ol, 'ItemDetails.PrimaryInformation.ImageID');
      if (!BucBaseUtil.isVoid(imageId) && !BucBaseUtil.isVoid(imageLoc)) {
        imageUrl = imageLoc.endsWith('/') ? (imageLoc + imageId) : (imageLoc + '/' + imageId);
      }
    }
    return imageUrl;
  }

  private getDisplayDescription(ol: any) {
    let description = get(ol, 'OrderLine.ItemDetails.PrimaryInformation.ShortDescription');
    if (BucBaseUtil.isVoid(description)) {
      description = get(ol, 'OrderLine.ItemDetails.PrimaryInformation.Description');
    }
    if (BucBaseUtil.isVoid(description)) {
      description = get(ol, 'ItemDetails.PrimaryInformation.ExtendedDisplayDescription');
    }
    if (BucBaseUtil.isVoid(description)) {
      description = get(ol, 'ItemDesc');
    }
    return description;
  }

  onOverflowMenuClicked(data: any) {
    this.overflowMenu = this.getTableConfiguration().getOverflowMenuActions();
    this.selected = this.tableModel.data
      .filter((a, i) => (this.tableModel.data[i][0] as any).id === data.OrderLineKey)
      .map((r) => (r[0] as any).rowData);
    this.disableActions();
  }


  onDeleteActionClicked(data: any) {
    this.selected = this.tableModel.data
      .filter((a, i) => (this.tableModel.data[i][0] as any).id === data.OrderLineKey)
      .map((r) => (r[0] as any).rowData);
    this.openConfirmationModal()
  }

  openConfirmationModal() {
    const optionOne = {
      primary: '',
      callOnClose: true,
      callback: false,
      text: this.getTranslateService().instant('SHARED.GENERAL.LABEL_CANCEL'),
      tid: 'remove-return-line-modal-cancel-button'
    };
    const optionTwo = {
      class: {
        primary: true
      },
      callback: this.deleteOrderLine.bind(this),
      callOnClose: true,
      text: this.getTranslateService().instant('SHARED.GENERAL.LABEL_Y'),
      tid: 'remove-return-line-modal-yes-button',
    };
    this.modalService.destroy();
    this.modalService.create({
      component: CommonBinaryOptionModalComponent,
      inputs: {
        modalText: {
          header: this.getTranslateService().instant('CREATE_RETURN.RETURN_METHOD.ORDER_LINES.LABEL_HEADER_REMOVE'),
          label: this.selected.length === 1 ? this.getTranslateService().instant('CREATE_RETURN.RETURN_METHOD.ORDER_LINES.LABEL_CONFIRM_REMOVE_LINE_SINGLE_TEXT') :
          this.getTranslateService().instant('CREATE_RETURN.RETURN_METHOD.ORDER_LINES.LABEL_CONFIRM_REMOVE_LINE_MULTIPLE'),
          size: 'sm'
        },
        optionOne,
        optionTwo,
      }
    });
  }

  deleteOrderLine() {
    this.overflowActionClicked.emit({id: this.TABLE_ACTIONS.ACTION_REMOVE_LINE, items: [...this.selected, ...this.getBundleComponentLines(this.componentLines, true)]});
  }


  disableActions() {
    if (this.selected.length === 1) {
      const adjustPricingAction: any = this.getOverflowMenuActionById(this.TABLE_ACTIONS.ACTION_ADJUST_PRICING);
      if (adjustPricingAction) {
        if (!this.isAdjustPricingResourceAllowed) {
          adjustPricingAction.disabled = !this.selected[0].LineCharges.LineCharge;
          adjustPricingAction.showTooltip = !this.selected[0].LineCharges.LineCharge;
          adjustPricingAction.tooltipMsg = this.getTranslateService().instant('ADJUST_PRICING_MODAL.NO_ADJUSTMENTS_TOOLTIP');
        } else {
          adjustPricingAction.disabled = this.selected[0].LinePriceInfo.IsLinePriceForInformationOnly === 'Y';
          adjustPricingAction.showTooltip = this.selected[0].LinePriceInfo.IsLinePriceForInformationOnly === 'Y';
          adjustPricingAction.tooltipMsg = this.getTranslateService().instant('RETURN_SUMMARY.RETURN_METHODS.LABEL_ADJUST_PRICE_UNAVAILABLE_TOOLTIP');
        }
      }
      const actions = [
        this.TABLE_ACTIONS.ACTION_CHANGE_TO_SHIPPING,
        this.TABLE_ACTIONS.ACTION_CUSTOMER_CAN_KEEP,
        this.TABLE_ACTIONS.ACTION_REMOVE_LINE
      ];
      actions.forEach(a => {
        const action: any = this.getOverflowMenuActionById(a);
        if (action) {
          action.disabled = this.isBundleComponent(this.selected[0]);
          action.showTooltip = this.isBundleComponent(this.selected[0]);
          action.tooltipMsg = this.getTranslateService().instant('RETURN_SUMMARY.RETURN_METHODS.OVERFLOW_MENU_BUNDLE_ACTION_INELIGIBLE_TOOLTIP');
        }
      })
    }
  }

  getBundleComponentLines(lines, fromSelectedItems): Array<any> {
    let bundleParent = [];
    if(fromSelectedItems) {
      bundleParent = this.selected.filter(i => i.IsBundleParent === 'Y');
    } else {
      bundleParent = lines.filter(i => i.IsBundleParent === 'Y');
    }
    const componentLines = [];
    if(bundleParent.length > 0) {
      bundleParent.forEach(p =>
        componentLines.push(...lines.filter(c => c.BundleParentLine?.OrderLineKey === p.OrderLineKey))
      )
    }
    return componentLines;
  }

  prepareTableData(tableData) {
    super.prepareTableData(tableData);
    // disable lines which cannot be returned
    this.tableModel.data.forEach((row: any) => row.disabled = this.isBundleComponent(row[0]?.rowData));
  }

  private async addReceivedQuantityColumn() {
    // add the received quantity only when the data exists
    if (this.orderLines.some(ol => get(ol, 'ReceivedQuantity') !== undefined)) {
      await this.addTableHeaders([
        new BucTableHeaderItem({
          id: this.TH_RECEIVED_QUANTITY,
          name: 'RETURN_SUMMARY.RETURN_LINES.HEADER_RECEIVED_QUANTITY',
          dataBinding: 'ReceivedQuantity',
          sortKey: 'ReceivedQuantity',
          sortable: true,
          sequence: 4
        })
      ]);
    }
  }

  openNotesModal(item) {
    this.iconActionClicked.emit({ id: this.TABLE_ACTIONS.ACTION_NOTES, item })
  }

}
