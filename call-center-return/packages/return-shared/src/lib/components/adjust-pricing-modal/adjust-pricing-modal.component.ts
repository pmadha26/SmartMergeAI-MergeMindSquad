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

import { Component, Inject, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { CCNotificationService, COMMON, DisplayRulesHelperService, getArray, getCurrentLocale, TableModelExtension } from '@buc/common-components';
import { TranslateService } from '@ngx-translate/core';
import { BaseModal, TableHeaderItem } from 'carbon-components-angular';
import { get, isEmpty } from 'lodash';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, skipWhile, withLatestFrom } from 'rxjs/operators';
import { Constants } from '../../common/return.constants';
import { BucBaseUtil, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { EntityStoreService } from '../../state/entities/entity-store.service';
import * as AdjustPricingActions from '../../state/adjust-pricing/adjust-pricing.actions';
import { fetchAllLineNotes } from '../../state/side-panel/side-panel.actions';
import { Actions, ofType } from '@ngrx/effects';
import { SharedExtensionConstants } from '../../shared-extension.constants';

@Component({
  selector: 'call-center-return-adjust-pricing-modal',
  templateUrl: './adjust-pricing-modal.component.html',
  styleUrls: ['./adjust-pricing-modal.component.scss'],
})
export class AdjustPricingModalComponent extends BaseModal implements OnInit {
  EXTENSION = {
      TOP: SharedExtensionConstants.ADJUST_PRICING_MODAL_RS_TOP,
      BOTTOM: SharedExtensionConstants.ADJUST_PRICING_MODAL_RS_BOTTOM
  };

  @ViewChild('chargeName', { static: true }) private chargeName: TemplateRef<any>;
  @ViewChild('chargeType', { static: true }) private chargeType: TemplateRef<any>;
  @ViewChild('amount', { static: true }) private amount: TemplateRef<any>;
  @ViewChild('chargeApplyTo', { static: true }) private chargeApplyTo: TemplateRef<any>;
  @ViewChild('amountReadOnly', { static: true }) private amountReadOnly: TemplateRef<any>;
  @ViewChild('chargeNameReadOnly', { static: true }) private chargeNameReadOnly: TemplateRef<any>;
  @ViewChild('chargeTypeReadOnly', { static: true }) private chargeTypeReadOnly: TemplateRef<any>;
  @ViewChild('chargeApplyToReadOnly', { static: true }) private chargeApplyToReadOnly: TemplateRef<any>;
  @ViewChild('removeActionTemplateRef', { static: true }) private removeActionTemplateRef: TemplateRef<any>;

  public readonly defaultPageLen = Constants.TABLE_PAGE_LENGTH_10;
  componentId = 'AdjustPricingModalComponent';
  model = new TableModelExtension();
  lineModel = new TableModelExtension();
  paginationTranslations: any;
  pageSize: number;
  pageNo: number;
  chargeHeaders: any;
  summaryDetails: any;
  headerChargeDetailsData: any;
  chargeNameList = [];
  chargeInfoList = [];
  appliedCouponPromo = [];
  chargeApplyToList = [];
  emptyChargeName: any;
  applyEnabled = true;
  newChargeDetails = {
    HeaderCharge: [],
    LineCharge: []
  };
  headerCharges: any;
  lineCharges: any;
  orderHeaderKey: string;
  orderLineKey: string;
  isLineLevel: boolean;
  isDraft: any;
  lineChargeDetailsData: any;
  currentApplyTo: any;
  isApplyToChanged: boolean;
  selectedOrderLines = [];
  saveChargesEnabled = false;
  isSaveAllChargesEnabled = false;
  note = '';
  allowModificationPrice: boolean;
  modificationInfoList = [];
  permissionsArray = [];
  chargeTypes: any;
  isResourceAllowedToAddChangeOrderCharges: boolean;
  notificationShown = false;
  notificationObj: any;
  selectedChargePairs = [];
  remainChargeNamesForType = {};
  totalChargeNamesForType = {};
  // flag for toggle the add new row button
  ranOutOfChargeOptions = false;
  isInitialized = false;
  cTypes;
  modifiedIndex;
  modifiedId;
  modifiedAmount;
  repopulateCharges = false;
  currencySymbolBefore;
  curLocale: any;
  isExchange: false;
  isLoader: boolean = false;
  enableAddCharge: boolean = true;
  hasEmptyValue: boolean = false;

  protected readonly nlsMap: any = {
    'ADJUST_PRICING_MODAL.LABEL_CATEGORY': '',
    'ADJUST_PRICING_MODAL.LABEL_CHARGE_NAME': '',
    'ADJUST_PRICING_MODAL.LABEL_CHARGE_TYPE': '',
    'ADJUST_PRICING_MODAL.LABEL_AMOUNT': '',
    'ADJUST_PRICING_MODAL.LABEL_TAXES': '',
    'ADJUST_PRICING_MODAL.LABEL_APPLY_TO': '',
    'ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_LINE': '',
    'ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_UNIT': '',
    'ADJUST_PRICING_MODAL.LABEL_ADJUSTMENT_SAVED_MSG': '',
    'ADJUST_PRICING_MODAL.LABEL_EMPTY_FIELDS_ERROR_MSG': '',
    'ADJUST_PRICING_MODAL.LABEL_CHARGES_ERROR_MSG': '',
    'ADJUST_PRICING_MODAL.MSG_TOOLTIP_ORDER_LINE': '',
    'ADJUST_PRICING_MODAL.MSG_TOOLTIP_ORDER': '',
    'ADJUST_PRICING_MODAL.LABEL_CHARGENAMENONREFUNDABLEDES': '',
    'ADJUST_PRICING_MODAL.LABEL_BILLABLE': '',
    'ADJUST_PRICING_MODAL.LABEL_DISCOUNT': '',
    'ADJUST_PRICING_MODAL.MSG_TOOLTIP_LINE_DISCOUNT': '',
    'ADJUST_PRICING_MODAL.MSG_TOOLTIP_LINE_CHARGE': ''
    
  };

  private amountChangedSub: Subject<any> = new Subject();
  private saveAllChargesSub: Subscription;
  private subscriptions: Array<Subscription> = [];
  modalHasChanges: boolean = false;
  showAdjustPricingWarning = false;
  returnOrderHeaderKey: any;
  isRefund: any;
  allowedModifications: any;
  exchangeOrderHeaderKey: any;
  isPromoUpdated = false;
  

  constructor(
    @Inject('modalData') public modalData,
    public translate: TranslateService,
    private notificationService: CCNotificationService,
    private entityStoreSvc: EntityStoreService,
    private displayRulesHelperService: DisplayRulesHelperService,
    private actions$: Actions
  ) {
    super();
  }

  async ngOnInit() {
    
    await this.initialize();
    this.isInitialized = true;
  }

  ngOnDestroy(): void {
    if (this.saveAllChargesSub) {
      this.saveAllChargesSub.unsubscribe();
    }
  }

  initChargeInfoList([chargeNameList, chargeCategoryList]) {
    if (chargeCategoryList.length && chargeNameList.length && !this.isExchange) {
      this.chargeInfoList = chargeNameList.map(chargeName => {
        const chargeCategory = chargeCategoryList.find(catgory =>
          catgory.ChargeCategory === chargeName.ChargeCategory);
        const cName = chargeName.ChargeName;
        const chargeNameDesc =  chargeName.Description;
        return {
          category: chargeCategory.ChargeCategory, isRefundable: chargeCategory.IsRefundable, isBillable: chargeCategory.IsBillable,
          desc: chargeNameDesc, isDiscount: chargeCategory.IsDiscount, cName: cName
        }
      });
    }
    this.repopulateCharges = true;
    this.prepareChargeTypes();
    this.tableData();
  }

  initExchangeChargeInfoList([chargeNameList, chargeCategoryList]) {
    if (chargeCategoryList.length && chargeNameList.length && this.isExchange) {
      this.chargeInfoList = chargeNameList.map(chargeName => {
        const chargeCategory = chargeCategoryList.find(catgory =>
          catgory.ChargeCategory === chargeName.ChargeCategory);
        const cName = chargeName.ChargeName;
        const chargeNameDesc =  chargeName.Description;
        return {
          category: chargeCategory.ChargeCategory, isRefundable: chargeCategory.IsRefundable, isBillable: chargeCategory.IsBillable,
          desc: chargeNameDesc, isDiscount: chargeCategory.IsDiscount, cName: cName
        }
      });
    }
    this.repopulateCharges = true;
    this.prepareChargeTypes();
    this.tableData();
  }

  async initialize() {
    this.pageSize = Constants.TABLE_PAGE_LENGTH_10;
    this.pageNo = this.pageNo ? this.pageNo : 1;
    this.orderHeaderKey = this.modalData.summaryDetails.OrderHeaderKey;
    this.isLineLevel = this.modalData.isLineLevel
    this.isDraft = this.modalData.summaryDetails.DraftOrderFlag === 'Y';
    this.curLocale = getCurrentLocale();
    this.isExchange = this.modalData.isExchange;
    this.showAdjustPricingWarning = this.modalData.showAdjustPricingWarning || false
    this.returnOrderHeaderKey = this.modalData.returnOrderHeaderKey || "";
    this.exchangeOrderHeaderKey = get(this.modalData.summaryDetails,  'ExchangeOrders.ExchangeOrder[0].OrderHeaderKey', '');
    this.isSaveAllChargesEnabled = this.displayRulesHelperService.getRuleValueForOrg(this.modalData.summaryDetails.EnterpriseCode, Constants.RULE_ICC_SINGLE_ADJUST_PRICING_SAVE) === Constants.CHECK_YES;
    this.isRefund = this.modalData.isRefund
    if (this.curLocale.startsWith('zh')) {
        this.curLocale = 'zh';
    }
    await this._initTranslations();
    this.saveAllChargesSub = this.actions$
      .pipe(ofType(AdjustPricingActions.saveAllChargesSuccess, AdjustPricingActions.saveAllChargesFailure))
      .subscribe(() => {
        this.isLoader = false;
    });
    const timerValue = this.isSaveAllChargesEnabled ? 0 : 750;
    this.subscriptions.push(
      this.amountChangedSub.pipe(
        debounceTime(timerValue),
        distinctUntilChanged())
        .subscribe(({ index, value, chargeAmountId }) => {
           if(isEmpty(value)) {
                this.hasEmptyValue = true;
            } else {
                this.hasEmptyValue = false;
                this.saveCharges(index, value, chargeAmountId)
            }
          this.modifiedId = chargeAmountId;
          this.modifiedAmount = value;
          this.modifiedIndex = index;
        }),
      this.entityStoreSvc.getStore().select(AdjustPricingActions.getChargeNameList).pipe(
        withLatestFrom(this.entityStoreSvc.getStore().select(AdjustPricingActions.getCategoryNameList)),
        skipWhile(([chargeNameList, chargeCategoryList]) => BucBaseUtil.isVoid(chargeNameList) || BucBaseUtil.isVoid(chargeCategoryList)))
        .subscribe(this.initChargeInfoList.bind(this)),
        this.entityStoreSvc.getStore().select(AdjustPricingActions.getExchangeChargeNameList).pipe(
          withLatestFrom(this.entityStoreSvc.getStore().select(AdjustPricingActions.getExchangeCategoryNameList)),
          skipWhile(([chargeNameList, chargeCategoryList]) => BucBaseUtil.isVoid(chargeNameList) || BucBaseUtil.isVoid(chargeCategoryList)))
          .subscribe(this.initExchangeChargeInfoList.bind(this)),
      this.entityStoreSvc.getStore().select(AdjustPricingActions.getChargeErrorMessage).pipe(
        skipWhile(BucBaseUtil.isVoid))
        .subscribe(this.showNotification.bind(this)),
      this.entityStoreSvc.getStore().select(AdjustPricingActions.getAppliedCharges).pipe(
        skipWhile(BucBaseUtil.isVoid))
        .subscribe((charges) => {
          this.isLineLevel ? this.getOrderLineDetails(charges, true) : this.getOrderDetails(charges);
        })
    );
    this.hasResourcePremissions();
    this.isLineLevel ? this.getOrderLineDetails(this.modalData, false) :
      this.getOrderDetails(this.modalData.summaryDetails);
    this.prepareHeaders();
    this.callInitApis();
    this.isChargeModificationPermissionAllowed();
    this.initializeChargeTables();
  }


  prepareChargeTypes() {
    this.cTypes = [
      {
        content: this.nlsMap['ADJUST_PRICING_MODAL.LABEL_BILLABLE'],
        code: Constants.BILLABLE_CODE
      },
      {
        content: this.nlsMap['ADJUST_PRICING_MODAL.LABEL_DISCOUNT'],
        code: Constants.DISCOUNT_CODE
      }
    ];

    // keep track of the total number of chargeNames for each type, used to recover the number for tracking purposes
    // using the code of each charge type for identification
    this.totalChargeNamesForType[Constants.DISCOUNT_CODE] = this.getChargeNameList('Y', 'Y').length;
    this.totalChargeNamesForType[Constants.BILLABLE_CODE] = this.getChargeNameList('N', 'Y').length;

    this.remainChargeNamesForType[Constants.DISCOUNT_CODE] = this.totalChargeNamesForType[Constants.DISCOUNT_CODE];
    this.remainChargeNamesForType[Constants.BILLABLE_CODE] = this.totalChargeNamesForType[Constants.BILLABLE_CODE];
  }

  _repopulateCharges(data, promotions, removeOperation) {
    this.selectedChargePairs = [];
    // recover the remaing charge names numbers back to the original
    this.cTypes.forEach(ctype => {
      this.remainChargeNamesForType[ctype.code] = this.totalChargeNamesForType[ctype.code];
    })
    data.forEach(charges => {
      // make sure the row actually exists
      const obj = {
        chargeType: charges[0].data.code,
        chargeName: charges[1].data.value
      };
      this.selectedChargePairs.push(obj);
      if (charges[3].value || charges[3].data.value) {
        this.remainChargeNamesForType[obj.chargeType] -= 1;
      }
    });
    if (promotions == 0 && removeOperation) {
      // promotions are decrement to 0 and at the same time
      this.remainChargeNamesForType[Constants.DISCOUNT_CODE] += 1
    }
  }

  getOrderDetails(modalData) {
    this.summaryDetails = (modalData.isPromotionApplied) ? (modalData.responseData) : modalData;
    const charges: Array<any> = this.summaryDetails?.HeaderCharges?.HeaderCharge?.map((element) => ({ ...element }));
    if (!isEmpty(this.summaryDetails?.Promotions)) {
      this.appliedCouponPromo = (this.summaryDetails.Promotions.Promotion);
    }
    this.headerChargeDetailsData = {
      HeaderCharge: this.groupByUtil(charges, Constants.KEY_ISMANUAL)
    };
    this.allowedModifications = this.summaryDetails?.Modifications;
    if (this.modificationInfoList.length == 0) {
      this.modificationInfoList = this.allowedModifications?.Modification || [];
    }
    this.addChargeDescriptions(charges);
    this.currencySymbolBefore = COMMON.isCurrencySymbolBefore(this.curLocale, this.summaryDetails?.PriceInfo?.Currency);
  }

  getOrderLineDetails(modalData, isChargesAdded) {
    let orderLineData;
    if (isChargesAdded) {
      this.selectedOrderLines = modalData?.OrderLine.filter((orderLine) => orderLine.OrderLineKey === this.orderLineKey);
      orderLineData = this.selectedOrderLines[0];
    } else {
      this.summaryDetails = modalData?.summaryDetails;
      orderLineData = modalData?.lineDetails.line;
      if (!this.modalData.skipModificationPermissionCheck) {
        if (!orderLineData.Modifications && this.summaryDetails.OrderLines[0]) {
          orderLineData.Modifications = this.summaryDetails.OrderLines[0].Modifications;
        }
      }
      this.selectedOrderLines = [orderLineData];
    }
    this.selectedOrderLines = this.selectedOrderLines.map(obj => ({ ...obj, PriceInfo: { Currency: this.summaryDetails?.PriceInfo?.Currency } }));
    if (this.modificationInfoList.length == 0 && !this.modalData.skipModificationPermissionCheck) {
      this.modificationInfoList = orderLineData.Modifications?.Modification || [];
    }
    this.lineChargeDetailsData = { ...orderLineData.LineCharges };
    this.orderLineKey = this.modalData.lineDetails.line.OrderLineKey;
    if (!this.lineChargeDetailsData?.LineCharge !== undefined) {
      const charges = this.lineChargeDetailsData?.LineCharge
        ?.map((element) => ({
          ...element,
          ChargeApplyTo: this.getChargesApplyTo(element)
        }));
      this.lineChargeDetailsData.LineCharge = this.groupByUtil(charges, Constants.KEY_ISMANUAL);
      this.addChargeDescriptions(this.lineChargeDetailsData.LineCharge);
    }
    this.currencySymbolBefore = COMMON.isCurrencySymbolBefore(this.curLocale, this.summaryDetails?.PriceInfo?.Currency);
  }

  protected async _initTranslations() {
    const keys = Object.keys(this.nlsMap);
    const json = await this.translate.get(keys).toPromise();
    keys.forEach(k => this.nlsMap[k] = json[k]);
  }

  callInitApis() {
    const categoryListInput = {
      CallingOrganizationCode: this.summaryDetails.EnterpriseCode,
      DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
      DocumentType: this.summaryDetails.DocumentType
    };

    const chargeKeys = {
      CallingOrganizationCode: this.summaryDetails.EnterpriseCode,
      DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
      DocumentType: this.summaryDetails.DocumentType,
      ChargeCategory: ''
    };

    this.entityStoreSvc.dispatchAction(AdjustPricingActions.fetchChargeNameAndCategoryList({ chargeNameListInput: chargeKeys, categoryListInput: categoryListInput, isExchange: this.isExchange}));
  }

  prepareHeaders() {
    this.chargeHeaders = 
      [

        new TableHeaderItem({
          data: this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_TYPE'],
          sortable: false, style: { width: '19rem', height: '3rem' }
        }),

        new TableHeaderItem({
          data: this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_NAME'],
          sortable: false, style: { width: '19rem', height: '3rem' }, className: this.isLineLevel ? 'headerChargeName' : ''
        }),

        this.isLineLevel &&
        new TableHeaderItem({
          data: this.nlsMap['ADJUST_PRICING_MODAL.LABEL_APPLY_TO'],
          sortable: false, style: { width: '17rem', height: '3rem' }, className: 'headerApplyTo'
        }),
        new TableHeaderItem({
          data: this.nlsMap['ADJUST_PRICING_MODAL.LABEL_AMOUNT'],
          sortable: false, style: { width: '15rem', height: '3rem', textAlign: 'left' }
        }),
        this.isSaveAllChargesEnabled &&
        new TableHeaderItem({ data: '', sortable: false, style: { width: '3rem', height: '3rem' } })
      ]
    ;
  }

  initializeChargeTables() {
    this.model.header = this.chargeHeaders;
    this.model.isLoading = false;
    this.model.pageLength = this.pageSize;
    this.model.currentPage = this.pageNo;
    this.model.data = [];
    this.tableData();
  }

  isChargeModificationPermissionAllowed() {
    this.allowModificationPrice = false;
    if (this.modificationInfoList?.length > 0
      && this.modificationInfoList.find(mod => mod.ModificationType === Constants.STR_PRICE
        && mod.ModificationAllowed === 'Y')) {
        this.allowModificationPrice = true;
    } else if (this.modalData.skipModificationPermissionCheck) {
      this.allowModificationPrice = true;
    }
    return this.allowModificationPrice;
  }

  addNewChargeRow() {
    if(this.hasEmptyValue){
        const emptyFieldsErrorMsg = this.nlsMap['ADJUST_PRICING_MODAL.LABEL_EMPTY_FIELDS_ERROR_MSG'];
        this.showNotification(emptyFieldsErrorMsg);
        return;
      }
    this.enableAddCharge = false;
    if (this.isResourceAllowedToAddChangeOrderCharges) {
      if (this.isChargeModificationPermissionAllowed) {
        if (this.isLineLevel) {
          const summaryLineCharge = {
            ChargeAmount: '',
            ChargeCategory: '',
            ChargeName: '',
            ChargeType: '',
            ChargeApplyTo: '',
            newRow: true,
          };
          if (this.lineChargeDetailsData?.LineCharge === undefined) {
            const lineChargeArr = [];
            lineChargeArr.push(summaryLineCharge);
            const key = Constants.KEY_LINE_CHARGE;
            this.lineChargeDetailsData[key] = lineChargeArr;
          } else {
            this.lineChargeDetailsData.LineCharge = [...this.lineChargeDetailsData.LineCharge, summaryLineCharge];
          }
        } else {
          const summaryCharge = {
            ChargeAmount: '',
            ChargeCategory: '',
            ChargeType: '',
            ChargeName: '',
            newRow: true,
          };
          if (this.headerChargeDetailsData?.HeaderCharge === undefined) {
            const headerChargeArr = [];
            headerChargeArr.push(summaryCharge);
            const key = Constants.KEY_HEADER_CHARGE;
            this.headerChargeDetailsData[key] = headerChargeArr;
          } else {
            this.headerChargeDetailsData.HeaderCharge = [...this.headerChargeDetailsData.HeaderCharge, summaryCharge];
          }
        }
      }
      this.tableData();
      if(this.isSaveAllChargesEnabled){
          this.saveChargesEnabled = false;
      }
    }
  }

  tableData() {
    const chargeSummaryTable = (model: TableModelExtension, data: Array<any>) => {

      model.asMap = {};
      model.fullTable = this.prepareChargeSummaryTableResponse(data);
      model.fullTableLen = model.fullTable.length;
      model.totalDataLength = model.fullTableLen;

      if (model.fullTableLen > 0) {
        model.pageLength = model.fullTableLen;
        model.pages = COMMON.calcPagination(model.fullTable, model.pageLength);
        model.calcPgLen = model.pageLength;
        model.data = model.pages[0];
        model.currentPage = 1;
        if (this.repopulateCharges) {
          this._repopulateCharges(this.model.data, 0, false);
          this.repopulateCharges = false;
        }
      } else {
        model.data = [];
      }
    };

    try {
      let data;
      if (this.isLineLevel) {
        if (this.lineChargeDetailsData) {
          data = getArray(this.lineChargeDetailsData?.LineCharge);
          const filteredData = data.filter((item) => !(item.IsManual === 'N' && !parseFloat(item.ChargeAmount)));
          if (filteredData.length > 0) {
            [{ model: this.model }]
              .forEach(o => chargeSummaryTable(o.model, filteredData));
          } else {
            this.addNewChargeRow();
          }
        } else {
          [this.model]
            .forEach(m => {
              m.totalDataLength = 0;
              m.data = [];
            });
        }
      } else {
        if (this.headerChargeDetailsData) {
          data = getArray(this.headerChargeDetailsData?.HeaderCharge);
          const filteredData = data.filter((item) => !(item.IsManual === 'N' && !parseFloat(item.ChargeAmount)));
          if (filteredData.length > 0) {
            [{ model: this.model }]
              .forEach(o => chargeSummaryTable(o.model, filteredData));
          } else {
            this.addNewChargeRow();
          }
        } else {
          [this.model]
            .forEach(m => {
              m.totalDataLength = 0;
              m.data = [];
            });
        }
      }
    } catch (err) {
      [this.model]
        .forEach(m => {
          m.totalDataLength = 0;
          m.data = [];
        });
      console.log('error occured', err);
    }
  }

  mapChargeTypeToDisplay(isBillable, isDiscount) {
    return isBillable === 'Y' && isDiscount === 'N' ? this.nlsMap['ADJUST_PRICING_MODAL.LABEL_BILLABLE'] : this.nlsMap['ADJUST_PRICING_MODAL.LABEL_DISCOUNT'];
  }

  prepareChargeSummaryTableResponse(response) {
    return response.map((i, index) => {
      const row = [
        {
          data: {
            value: this.mapChargeTypeToDisplay(i.IsBillable, i.IsDiscount),
            index,
            code: i.IsBillable == 'Y' && i.IsDiscount == 'N' ? Constants.BILLABLE_CODE : Constants.DISCOUNT_CODE,
            newRow: i.newRow,
            list: this.isSaveAllChargesEnabled ? this.getAllChargeTypeList(i) : this.getChargeTypeList(),
            isDisable: false,
            isManual: i.IsManual
          },
          template: !this.isResourceAllowedToAddChangeOrderCharges || this.cannotAllowModification(i.IsManual, i.newRow) ? this.chargeTypeReadOnly : this.chargeType,
          title: this.mapChargeTypeToDisplay(i.IsBillable, i.IsDiscount)
        },
        {
          data: {
            value: this.getChargeName(i.ChargeCategory, i.ChargeName),
            discountChargeLabel:  i.Description ? (i.IsDiscount === 'Y' ? this.translate.instant('ADJUST_PRICING_MODAL.MSG_TOOLTIP_LINE_DISCOUNT', {desc: i.Description}) : 
            this.translate.instant('ADJUST_PRICING_MODAL.MSG_TOOLTIP_LINE_CHARGE', {desc: i.Description })) : "",
            index,
            newRow: i.newRow,
            list: this.isSaveAllChargesEnabled ? this.getChargeNameList(i.IsDiscount, i.IsBillable, i.ChargeName) : [],
            isDisable: this.isSaveAllChargesEnabled && i.ChargeName ? false : true,
            isManual: i.IsManual
          },
          template: !this.isResourceAllowedToAddChangeOrderCharges || this.cannotAllowModification(i.IsManual, i.newRow) ? this.chargeNameReadOnly : this.chargeName,
          title: this.getChargeName(i.ChargeCategory, i.ChargeName), 
        },
        this.isLineLevel && {
          data: {
            value: i.ChargeApplyTo,
            index,
            list: this.getApplyToList(i.ChargeApplyTo),
            newRow: i.newRow,
            isDisable: i.ChargeName ? false : true,
            isManual: i.IsManual,
            uniqueId: (i.ChargeCategory) ? index + '~' + (i.ChargeCategory) : index,
          },
          template: !this.isResourceAllowedToAddChangeOrderCharges || this.cannotAllowModification(i.IsManual, i.newRow) ? this.chargeApplyToReadOnly : this.chargeApplyTo,
          title: i.ChargeApplyTo
        },
        {
          data: {
            value: this.getChargeDetails(i),
            index,
            isDiscount: i.ChargeCategory,
            isDisable: this.isChargeAmountDisabled(i),
            isManual: i.IsManual,
            uniqueId: (i.ChargeCategory) ? index + '~' + (i.ChargeCategory) : index,
            chargeAmountId: (i.ChargeCategory) ? index + '~' + (i.ChargeCategory) : index,
          },
          template: !this.isResourceAllowedToAddChangeOrderCharges || this.cannotAllowModification(i.IsManual, i.newRow) ? this.amountReadOnly : this.amount,
          title: i.ChargeAmount
        },
        this.isSaveAllChargesEnabled && {
            data: {
                value: '',
                index,
                newRow: i.newRow
            },
            template: this.removeActionTemplateRef,
            title: 'Remove'
        },
      ];
      return row;
    });
  }
  cannotAllowModification(manual, newRow) {
    return !this.allowModificationPrice || !this.isManual(manual, newRow);
  }
  hasResourcePremissions() {
    this.isResourceAllowedToAddChangeOrderCharges = this.modalData.isAdjustPricingResourceAllowed;
  }
  getChargeDetails(charge) {
    if (this.isLineLevel) {
      if(this.isSaveAllChargesEnabled && (charge.newRow || charge.isRowEdited)){
          return charge.ChargeAmount;
      }
      if (charge.ChargeApplyTo === this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_UNIT']) {
        return charge.ChargePerUnit;
      } else {
        return charge.ChargePerLine;
      }
    } else {
      return charge.ChargeAmount
    }
  }

  getChargeName(categoryName, chargeName) {
    let name: any;
    this.chargeInfoList.filter((item) => {
      if (item && item.category === categoryName && item.cName === chargeName) {
        name = item.desc;
      }
    });
    if(!name){
      name = chargeName;
    }
    return name;
  }

   getAllChargeTypeList(charge){
    this.chargeTypes = [];
    this.cTypes.forEach(cType=> {
        this.chargeTypes.push(
            {
                content: cType.content,
                selected: charge?.ChargeType == cType.code ? true : false,
                value: cType.code
            }
        )
    });
    return this.chargeTypes;
  }

  getChargeTypeList() {
    this.chargeTypes = [];
    this.cTypes.forEach(cType => {
      // the charge type option exists only when it has at least one charge name options
      if (this.remainChargeNamesForType[cType.code] > 0) {
        this.chargeTypes.push(
          {
            content: cType.content,
            value: cType.code
          }
        )
      }
    });

    return this.chargeTypes;
  }

  getChargeNameList(discount, billable, chargeName = '') {
    this.chargeNameList = [];
    if (this.chargeInfoList) {
      this.chargeNameList = this.chargeInfoList.map(info => {
        if (info && info.isDiscount === discount && info.isBillable === billable) {
          return {
            content: info.desc !== '' ? info.desc : info.cName,
            value: info.cName,
            data: info,
            selected: chargeName == info.cName
          }
        }
      });
      return this.chargeNameList = this.chargeNameList.filter(x => x);
    }
  }

  getApplyToList(value) {
    this.chargeApplyToList = [];
    const applyType = [
      this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_LINE'],
      this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_UNIT']
    ];
    applyType.forEach((element) => {
      this.chargeApplyToList.push({
        content: element,
        value: element,
        selected: value === element ? true : false
      });
    });
    return this.chargeApplyToList;
  }

  getChargesApplyTo(element) {
    if (parseFloat(element.ChargePerUnit)) {
      return this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_UNIT'];
    } else {
      return this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_LINE'];
    }
  }

  isManual(isManual, newRow) {
    return newRow ? true : isManual != 'Y' ? false : true;
  }

  changeInChargeType(event, index) {
    const changeKey = Constants.KEY_CHARGE_NAME;
    const changeValue = event.item.value;
    let isBillable = '';
    let isDiscount = '';

    // bookmarking the selected pairs
    if (index < this.selectedChargePairs.length) {
      this.selectedChargePairs[index].chargeType = changeValue;
      this.selectedChargePairs[index].chargeName = null;
    } else {
      this.selectedChargePairs.push({
        chargeType: changeValue,
        chargeName: null
      });
    }

    let list = [];
    this.model.data[index][1].data.isDisable = false;

    list = [];
    if (changeValue === Constants.BILLABLE_CODE) {
      list = this.getChargeNameList('N', 'Y');
      isBillable = 'Y';
      isDiscount = 'N';
    } else if (changeValue === Constants.DISCOUNT_CODE) {
      list = this.getChargeNameList('Y', 'Y');
      isBillable = 'Y';
      isDiscount = 'Y';
    }

    if(this.isSaveAllChargesEnabled){
      if (this.isLineLevel) {
          this.lineChargeDetailsData.LineCharge[index].ChargeType = changeValue;
          this.lineChargeDetailsData.LineCharge[index].IsBillable = isBillable;
          this.lineChargeDetailsData.LineCharge[index].IsDiscount = isDiscount;
      } else {
          this.headerChargeDetailsData.HeaderCharge[index].ChargeType = changeValue;
          this.headerChargeDetailsData.HeaderCharge[index].IsBillable = isBillable;
          this.headerChargeDetailsData.HeaderCharge[index].IsDiscount = isDiscount;
      }
    }

    list = this._filterSelectedChargeNames(list, changeValue);
    this.model.data[index][0].data.value = changeValue;
    this.model.data[index][1].data.list = list;
    // turn the disable
  }

  _filterSelectedChargeNames(list, chargeType) {
    let results = []
    for (let i = 0; i < list.length; i++) {
      const rowData = list[i];
      let exists = false;
      for (let j = 0; j < this.selectedChargePairs.length; j++) {
        const chargePair = this.selectedChargePairs[j]
        if (chargePair.chargeType == chargeType && chargePair.chargeName == rowData.data.desc) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        results.push(rowData);
      }
    }
    return results;
  }
  changeInChargeNameList(event, index) {
    const keyChargeName = Constants.KEY_CHARGE_NAME;
    const keyChargeCategory = Constants.KEY_CHARGE_CATEGORY;
    const changeValue = event.item.value;
    const category = event.item.data.category;

    this.selectedChargePairs[index].chargeName = event.item.data.desc; // use desc attribute since the value of the object is desc
    // keep track of the number of remaining charge name option for a particular charge type
    this.remainChargeNamesForType[this.model.data[index][0].data.value] -= 1;

    // if no more charge name for the current options, double check if any charge type left
    if (this.remainChargeNamesForType[this.model.data[index][0].data.value] == 0) {
      this.ranOutOfChargeOptions = this.getChargeTypeList().length == 0;
    }

    if (this.isLineLevel) {
        if (this.lineChargeDetailsData.LineCharge[index]) {
          this.lineChargeDetailsData.LineCharge[index].ChargeName = changeValue;
          this.lineChargeDetailsData.LineCharge[index].ChargeCategory = category;
        } else {
          this.lineChargeDetailsData.LineCharge[index] = {
            ChargeAmount: '',
            ChargeCategory: category,
            ChargeName: changeValue,
            ChargeType: '',
            ChargeApplyTo: '',
            newRow: true
          }
        }
        this.utilityLineCharge(keyChargeName, changeValue, index);
        this.utilityLineCharge(keyChargeCategory, category, index);
        this.model.data[index][2].data.isDisable = false;
    } else {
      this.headerChargeDetailsData.HeaderCharge[index].ChargeName = changeValue;
      this.headerChargeDetailsData.HeaderCharge[index].ChargeCategory = category;
      this.utilityHeaderCharge(keyChargeName, changeValue, index, category);
      this.model.data[index][3].data.isDisable = false;
    }
  }

  ChangeInApplyToField(event, data) {
    const changeKey = Constants.KEY_CHARGE_APPLYTO;
    const changeValue = event.item.value;
    const index = data.index;

    if (!this.lineChargeDetailsData.LineCharge[index].ChargeApplyTo || this.lineChargeDetailsData.LineCharge[index].ChargeApplyTo !== changeValue.toString()) {
      const chargeAmount = this.getChargeDetails(this.lineChargeDetailsData.LineCharge[index]);
      this.lineChargeDetailsData.LineCharge[index].ChargeApplyTo = changeValue;
      this.utilityLineCharge(changeKey, changeValue, index);
      this.model.data[index][3].data.isDisable = false;
      if (chargeAmount && chargeAmount > 0) {
        this.isApplyToChanged = true;
        this.amountChangedSub.next({ index: data.index, value: chargeAmount, chargeAmountId: data.uniqueId });
      }
    }
  }

  utilityHeaderCharge(changeKey, changeValue, index, category?) {
    const chargeCategoryKey = Constants.KEY_CHARGE_CATEGORY;
    const mappedKey = { id: index };
    if (this.newChargeDetails.HeaderCharge.length === 0) {
      this.newChargeDetails.HeaderCharge.push({ ...this.headerChargeDetailsData.HeaderCharge[index], ...mappedKey });
    } else if (this.newChargeDetails.HeaderCharge.length > 0) {
      const newChargeIndex = this.newChargeDetails.HeaderCharge.findIndex(obj => obj.id === index);
      if (newChargeIndex === -1) {
        this.newChargeDetails.HeaderCharge.push({ ...this.headerChargeDetailsData.HeaderCharge[index], ...mappedKey });
      } else {
        if (category && category !== this.newChargeDetails.HeaderCharge[newChargeIndex][chargeCategoryKey]) {
          this.newChargeDetails.HeaderCharge[newChargeIndex][chargeCategoryKey] = category;
        }

        this.newChargeDetails.HeaderCharge[newChargeIndex][changeKey] = changeValue;
      }
    }
  }

  utilityLineCharge(changeKey, changeValue, index) {
    const mappedKey = { id: index };
    if (this.newChargeDetails.LineCharge.length === 0) {
      this.newChargeDetails.LineCharge.push({ ...this.lineChargeDetailsData.LineCharge[index], ...mappedKey });
    } else if (this.newChargeDetails.LineCharge.length > 0) {
      const newChargeIndex = this.newChargeDetails.LineCharge.findIndex(obj => obj.id === index);
      if (newChargeIndex === -1) {
        this.newChargeDetails.LineCharge.push({ ...this.lineChargeDetailsData.LineCharge[index], ...mappedKey });
      } else {
        this.newChargeDetails.LineCharge[newChargeIndex][changeKey] = changeValue;
      }
    }
  }

  isChargeAmountDisabled(item) {
    let disabled = true;
    if (this.isLineLevel) {
      item.ChargeName && item.ChargeApplyTo ? disabled = false : disabled = true;
    } else {
      item.ChargeName ? disabled = false : disabled = true;
    }
    return disabled;
  }

  changeInAmountField(data, value) {
    if (!value || !isNaN(value?.toString())) {
      data.chargeAmountId = !isNaN(value?.toString()) ?  value.toString() : undefined;
      this.amountChangedSub.next({ index: data.index, value: !isNaN(value?.toString()) ? value.toString() : undefined, chargeAmountId: data.chargeAmountId });
    }
  }

  saveCharges(index, changeValue, chargeAmountId) {
    this.modifiedId = chargeAmountId;
    this.modifiedAmount = changeValue;
    this.modifiedIndex = index;
    const changeKey = Constants.KEY_CHARGE_AMOUNT;
    if (this.isLineLevel) {
      const chargeLine = this.lineChargeDetailsData.LineCharge[index];
      if (chargeLine.ChargeAmount !== changeValue || this.isApplyToChanged) {
        this.isApplyToChanged = false;
        this.lineChargeDetailsData.LineCharge[index].ChargeAmount = changeValue;
        if(this.isSaveAllChargesEnabled){
          this.lineChargeDetailsData.LineCharge[index].isRowEdited = true;
        }
        this.utilityLineCharge(changeKey, changeValue, index);
        this.addLineCharges({
          lineCharge: this.lineChargeDetailsData, index,
          orderLineKey: this.orderLineKey, updateLine: true, newChargeDetails: this.newChargeDetails
        });
      }
    } else {
      const chargeAmountString = chargeAmountId.toString();
      let updatedIndex;
      if (chargeAmountString.includes('~')) {
        const chargeAmountArray = chargeAmountString.split('~');
        updatedIndex = (this.headerChargeDetailsData.HeaderCharge).findIndex(obj => obj.ChargeCategory === chargeAmountArray[1]);
      } else {
        updatedIndex = index;
      }
      const chargeLine = this.headerChargeDetailsData.HeaderCharge[updatedIndex];
      if (chargeLine?.ChargeAmount !== changeValue) {
        this.headerChargeDetailsData.HeaderCharge[updatedIndex].ChargeAmount = changeValue;
        this.utilityHeaderCharge(changeKey, changeValue, updatedIndex);
        this.addHeaderCharges({
          headerCharge: this.headerChargeDetailsData, index: updatedIndex,
          updateHeaderCharge: true, newChargeDetails: this.newChargeDetails
        });
      }
    }
  }

  chargeRemoveAction(index){
    this.enableAddCharge = true;
    if(this.isLineLevel){
        this.lineChargeDetailsData.LineCharge.splice(index, 1);
        this.newChargeDetails.LineCharge = this.newChargeDetails.LineCharge.filter(charge => charge.id !== index);
        if(this.newChargeDetails.LineCharge.length == 0){
            this.saveChargesEnabled = false;
        }else{
            this.saveChargesEnabled = true;
            this.enableAddCharge = true;
        }
    } else {
        this.headerChargeDetailsData.HeaderCharge.splice(index, 1);
        this.newChargeDetails.HeaderCharge = this.newChargeDetails.HeaderCharge.filter(charge => charge.id !== index);
        if(this.newChargeDetails.HeaderCharge.length == 0){
            this.saveChargesEnabled = false;
        }else{
            this.saveChargesEnabled = true;
            this.enableAddCharge = true;
        }
    }
    this.tableData();
  }

  addHeaderCharges(item) {
    this.headerCharges = item.headerCharge;
    this.newChargeDetails = item.newChargeDetails;
    this.enableAddCharge = true;
    if (item.updateHeaderCharge && !this.isSaveAllChargesEnabled) {
      this.addCharges(item.index);
    } else {
      this.saveChargesEnabled = true;
    }
  }

  addLineCharges(item) {
    this.lineCharges = item.lineCharge;
    this.orderLineKey = item.orderLineKey;
    this.newChargeDetails = item.newChargeDetails;
    this.enableAddCharge = true;
    if (item.updateLine && !this.isSaveAllChargesEnabled) {
      this.addCharges(item.index);
    } else {
      this.saveChargesEnabled = true;
    }
  }

  async addCharges(index) {
    let summaryChargeArray = [];
    if (this.isLineLevel) {
      if (this.newChargeDetails !== undefined) {
        summaryChargeArray = this.newChargeDetails.LineCharge.filter(charge => charge.id === index).map(lineCharge => ({
          ChargeCategory: lineCharge.ChargeCategory,
          ChargeName: lineCharge.ChargeName,
          ChargePerLine: lineCharge.ChargeApplyTo ===
            this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_LINE'] ? lineCharge.ChargeAmount : '',
          ChargePerUnit: lineCharge.ChargeApplyTo ===
            this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_UNIT'] ? lineCharge.ChargeAmount : ''
        }));

      }
    } else {
      if (this.newChargeDetails.HeaderCharge !== undefined) {
        summaryChargeArray = this.newChargeDetails.HeaderCharge.filter(charge => charge.id === index).map(headerCharge => ({
          ChargeAmount: headerCharge.ChargeAmount,
          ChargeCategory: headerCharge.ChargeCategory,
          ChargeName: headerCharge.ChargeName
        }));

      }

    }
    this.saveCharge(summaryChargeArray);
    
  }

  async addAllCharges() {
    let summaryChargeArray = [];
    if (this.isLineLevel) {
      if (this.newChargeDetails !== undefined) {
        summaryChargeArray = this.newChargeDetails.LineCharge.map(lineCharge => ({
          ChargeCategory: lineCharge.ChargeCategory,
          ChargeName: lineCharge.ChargeName,
          ChargePerLine: lineCharge.ChargeApplyTo ===
            this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_LINE'] ? lineCharge.ChargeAmount : '',
          ChargePerUnit: lineCharge.ChargeApplyTo ===
            this.nlsMap['ADJUST_PRICING_MODAL.LABEL_CHARGE_PER_UNIT'] ? lineCharge.ChargeAmount : ''
        }));

      }
      this.hasEmptyValue = summaryChargeArray.some(charge => {
          const perLine = charge?.ChargePerLine;
          const perUnit = charge?.ChargePerUnit;

          return (BucBaseUtil.isVoid(perLine)) 
              && (BucBaseUtil.isVoid(perUnit));
      });
    } else {
      if (this.newChargeDetails.HeaderCharge !== undefined) {
        summaryChargeArray = this.newChargeDetails.HeaderCharge.map(headerCharge => ({
          ChargeAmount: headerCharge.ChargeAmount,
          ChargeCategory: headerCharge.ChargeCategory,
          ChargeName: headerCharge.ChargeName
        }));

      }
      this.hasEmptyValue = summaryChargeArray.some(charge => {
          const chargeAmount = charge?.ChargeAmount;
          return (BucBaseUtil.isVoid(chargeAmount));
      });
    }
    if(this.hasEmptyValue){
      this.isLoader = false;
      const emptyFieldsErrorMsg = this.nlsMap['ADJUST_PRICING_MODAL.LABEL_EMPTY_FIELDS_ERROR_MSG'];
      this.showNotification(emptyFieldsErrorMsg);
      return;
    }
   this.saveAllCharges(summaryChargeArray)
    
  }

  async onSaveClick(){
    if(this.isSaveAllChargesEnabled){
      this.isLoader = true;
      this.addAllCharges();
    }
  }

  saveCharge(summaryChargeArray) {
    this.modalHasChanges = true;
    this.entityStoreSvc.dispatchAction(AdjustPricingActions.addModifyCharges({
      isLineLevel: this.isLineLevel,
      returnDetails: this.summaryDetails,
      orderHeaderKey: this.orderHeaderKey,
      orderLineKey: this.orderLineKey,
      summaryChargeArray,
    }));
  }

  saveAllCharges(summaryChargeArray){
    this.modalHasChanges = true;
    let orderHeaderKeys = {
      returnOrderHeaderKey: this.isExchange ? this.returnOrderHeaderKey : this.orderHeaderKey,
      exchangeOrderHeaderKey: this.isRefund ? "" : (this.isExchange ? this.orderHeaderKey : this.exchangeOrderHeaderKey),
    }
    this.entityStoreSvc.dispatchAction(AdjustPricingActions.saveAllCharges({
      isLineLevel: this.isLineLevel,
      returnDetails: this.summaryDetails,
      orderHeaderKey: this.orderHeaderKey,
      orderLineKey: this.orderLineKey,
      summaryChargeArray,
      noteText: this.note ? this.note : undefined,
      closeModal: this.closeModal.bind(this),
      refreshActions: [
        ...(this.showAdjustPricingWarning
          ? [AdjustPricingActions.refreshOrderPayment({
            exchangeOrderHeaderKey: orderHeaderKeys.exchangeOrderHeaderKey,
            returnOrderHeaderKey: orderHeaderKeys.returnOrderHeaderKey
          })]
          : [...this.modalData.refreshActions,
        ...(this.note && this.isLineLevel
          ? [fetchAllLineNotes({ orderHeaderKey: this.orderHeaderKey })]
          : []
        )]
        )
      ]
    }));
  }

  onNoteChange() {
    this.modalHasChanges = true;
    if (this.isSaveAllChargesEnabled) {
        this.note ? this.saveChargesEnabled = true : this.saveChargesEnabled = false;
    }
  }
  groupByUtil(objectArray, property) {
    return objectArray?.sort((a, b) => {
      const x = a[property];
      const y = b[property];
      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
  }

  addNote() {
    this.entityStoreSvc.dispatchAction(AdjustPricingActions.addNote({
      noteText: this.note,
      orderHeaderKey: this.orderHeaderKey,
      orderLineKey: this.orderLineKey,
      isLineLevel: this.isLineLevel
    }))
  }

  promoUpdated() {
    this.isPromoUpdated = true;
  }

  onCloseModalClick() {
    this.subscriptions.forEach(s => s.unsubscribe());
    if(!this.isSaveAllChargesEnabled){
      if (this.note) {
        this.addNote();
      }
      if (this.modalHasChanges) {
        if (this.showAdjustPricingWarning) {
          let orderHeaderKeys = {
            returnOrderHeaderKey: this.isExchange ? this.returnOrderHeaderKey : this.orderHeaderKey,
            exchangeOrderHeaderKey: this.isRefund ? "" : (this.isExchange ? this.orderHeaderKey : this.exchangeOrderHeaderKey),
          }
          this.entityStoreSvc.dispatchAction(AdjustPricingActions.refreshOrderPayment({
            exchangeOrderHeaderKey:
              orderHeaderKeys.exchangeOrderHeaderKey, returnOrderHeaderKey: orderHeaderKeys.returnOrderHeaderKey
          }));
        } else {
          this.entityStoreSvc.dispatchAction(AdjustPricingActions.onAdjustPricingCloseClick({
            isLineLevel: this.isLineLevel,
            refreshActions: this.modalData.refreshActions,
          }))
        }
      }
      this.entityStoreSvc.dispatchAction(AdjustPricingActions.updateAppliedChargesFailure({ errorMsg: '' }));
      this.closeModal();
    }else{
      // refresh page except on the payment page as the promo update action interally calls the refresh action on
      // the payment page.
      if (this.isPromoUpdated && !this.showAdjustPricingWarning) {
        this.entityStoreSvc.dispatchAction(AdjustPricingActions.onAdjustPricingCloseClick({
          isLineLevel: this.isLineLevel,
          refreshActions: this.modalData.refreshActions,
        }))
      }
      this.closeModal();
    } 
  }

  addChargeDescriptions(charges) {
    charges?.forEach( charge => {
        if (charge.ChargeAmount > 0){
            if (charge.IsShippingCharge === 'N' ){
                if (this.summaryDetails.Awards?.Award ){
                const promo = this.summaryDetails.Awards.Award.filter(award =>
                    ( charge.ChargeCategory === award.ChargeCategory && charge.ChargeName === award.ChargeName
                    && award.AwardApplied === 'Y' ));

                    promo.forEach( item => {
                        charge.Description = charge.Description ? charge.Description + ", " + item.Description : item.Description;
                    });
                }
            }
        }
    });
}

  setFlags(flagData) {
    this.saveChargesEnabled = flagData.saveChargesEnabled;
    this.modalHasChanges = flagData.isAnyChangeAppliedOnModal;
    this._repopulateCharges(this.model.data, flagData.numPromotionApplied, flagData.removePromotionOperation);
  }

  onPromoError(errorMsg){
    this.showNotification(errorMsg);
  }

  showNotification(mashupError) {
    if (mashupError) {
      this.notificationObj = {
        type: 'error',
        title: mashupError,
        showClose: true,
        lowContrast: true
      };
      this.notificationShown = true;
    }
  }

  closeNotification() {
    this.notificationShown = false;
  }
}
