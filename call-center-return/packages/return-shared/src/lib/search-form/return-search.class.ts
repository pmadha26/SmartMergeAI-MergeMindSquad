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

import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchForm, FilterOptionTypes, getArray, COMMON ,BucNotificationModel, BucNotificationService, BucSessionService, CustomOperator, BucTableFilterItemModel, BucDateTimeHelper} from '@buc/common-components';
import { BucCommOmsRestAPIService, BucPageResourceMappingService, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { TranslateService } from '@ngx-translate/core';
import { ModalService } from 'carbon-components-angular';
import { cloneDeep, isEmpty, defaultTo, flatMap, get } from 'lodash';
import { TenantFieldMap } from '../common/return.constants';
import { CommonService } from '../data-service/common-service.service';

export abstract class ReturnSearchForm extends SearchForm {

  public readonly FIELD_ID_RETURN_LINE_STATUS = 'returnLineStatus';
  public readonly FIELD_ID_IS_DRAFT_RETURN = 'isDraftReturn';
  public readonly FIELD_ID_IS_RETURN_DATE_RANGE = 'returnDateRange';
  public readonly FIELD_ID_RETURN_AGE = 'returnAge';
  public readonly RADIO_OPTION_ID_ALL_ORDERS = 'all';
  public readonly RADIO_OPTION_ID_CONFIRMED_ORDERS = 'confirmed';

  private httpClient: HttpClient;
  protected grpHier: any = {};
  protected oobGrpHier: any = {};
  protected oobFields = [];
  fieldsContainer = { oob: [], custom: [] };
  oobFieldsMap: any = {};
  protected oobFieldsByFilterIdMap = {};
  searchSettings: { searchBy: string, searchByItems: Array<any>, searchByCtx: any } = {
    searchBy: '',
    searchByItems: [],
    searchByCtx: {}
  };
  tenantFieldMap: any = TenantFieldMap;
  public renderingMap = { searchBy: 'searchSettings.searchBy' };
  public allHoldTypeList = [];
  public allHoldTypeListUnique = [];
  public sessionEnterprise: any;
  searchFormCriteria = [];

  constructor(inj: Injector) {
    super(
      inj.get(ModalService),
      inj.get(BucNotificationService),
      inj.get(TranslateService),
      inj.get(ActivatedRoute),
      inj.get(BucPageResourceMappingService),
      inj.get(BucCommOmsRestAPIService),
      inj
    );
    this.httpClient = inj.get(HttpClient);
  }

  protected getTenantFieldMap() {
    return this.tenantFieldMap;
  }

  getModuleName() {
    return 'returns';
  }

  protected _prefName(): string {
    return 'return-search.criteria.selected';
  }

  getSessionName() {
    return '';
  }

  protected getSession() {
    return this.bucSessionStorageService;
  }

  prepareReturnLineStatus(){
    const fieldConfigs = this.getOobField(this.FIELD_ID_RETURN_LINE_STATUS);
    const fieldValue = this.getGeneralFieldValue(this.FIELD_ID_RETURN_LINE_STATUS);
    const returnLineStatus = fieldConfigs.internalConfig.options.filter(o => !o.hidden).map(option => ({
      content: this.tSvc.instant(option.Description),
      selected: fieldValue !== '' && option.Status === fieldValue?.searchValue ? true : false,
      value: fieldValue !== '' && fieldValue === option.Status ? fieldValue?.searchValue : option.Status
    }));
    this._setFieldList(returnLineStatus, this.FIELD_ID_RETURN_LINE_STATUS);
    this._setFieldValue(this.FIELD_ID_RETURN_LINE_STATUS, fieldValue);
  }

  prepareShowDraftReturns(isDirectSearch) {
    const fieldConfigs = this.getOobField(this.FIELD_ID_IS_DRAFT_RETURN);
    const fieldValue = this.getGeneralFieldValue(this.FIELD_ID_IS_DRAFT_RETURN);
    const orderStatus = getArray(fieldConfigs.internalConfig.items).filter(o => !o.hidden).map(option => ({
      content: this.tSvc.instant(option.content),
      checked: fieldValue? option.id === fieldValue : isDirectSearch ? option.id === this.RADIO_OPTION_ID_ALL_ORDERS : option.checked,
      value: option.value,
      id: option.id,
      default: option.default
    }));
    this._setFieldList(orderStatus, this.FIELD_ID_IS_DRAFT_RETURN);
    this._setFieldValue(this.FIELD_ID_IS_DRAFT_RETURN, isDirectSearch ? this.RADIO_OPTION_ID_ALL_ORDERS : (fieldValue ? fieldValue : orderStatus.find(i => i.checked)?.id ?? this.RADIO_OPTION_ID_CONFIRMED_ORDERS));
  }

  protected async initialize(clearForm?: any) {
    await this.updateUI();
    if (clearForm) {
      this.clearCustomFields();
    }
  }

  protected async _fetchFields() {
    const p = [
      this.prepareOptions(),
    ];
    await Promise.all(p);
    const appName = 'call-center-return';
    const url = `./assets/${appName}/search_fields.json`;
    let a;

    try {
      const resp: any = await this.httpClient.get(url, { responseType: 'json' }).toPromise();
      if (resp) {
        const o = resp[this.getModuleName()];
        a = o ? o.fields : [];
        this.grpHier = o.groups;
        this.oobGrpHier = o.groups;
      } else {
        a = [];
      }
    } catch (e) {
      a = [];
    }

    this.oobFields = a;
    this.oobFieldsMap = {};
    this.oobFieldsByFilterIdMap = {};
    this.oobFields
      .forEach(f => {
        const filtId = (f.internalConfig && f.internalConfig.id !== undefined) ? f.internalConfig.id : f.id;
        this._initStorage(f);
        this.oobFieldsMap[f.id] = f;
        this.oobFieldsByFilterIdMap[f.filtId] = {
          fieldId: f.id,
          filtId
        };
      });
    this.fieldsContainer.oob = this.oobFields;
    this._setSearchForDefault();
  }

  public fetchSessionEnterprise() {
    this.sessionEnterprise = CommonService.getSessionEnterprise(this.route);
  }

  protected _getFilterItem(oobField: any): BucTableFilterItemModel {
    const filterItem: BucTableFilterItemModel = super._getFilterItem(oobField);

     if (oobField.id === this.FIELD_ID_IS_RETURN_DATE_RANGE){
      const drc = cloneDeep(get(BucSvcAngularStaticAppInfoFacadeUtil.getProductMeta(), 'bootstrapConfig.searchConfig.return.dateRange', {}));
      if(drc?.duration){
        const config = this.getDefaultDrc(drc)
        filterItem.value.option = filterItem.value.option?.length > 0 ? filterItem.value.option : config;
        filterItem.value.from = filterItem.value.from ?? config[1];
        filterItem.value.to = filterItem.value.to ?? config[2];
        const durationUnit = drc.duration == 1 ? this.tSvc.instant(`RETURN_SEARCH.RETURN_DATE_RANGE.LABEL_${drc.durationUnit?.toUpperCase()}_SINGULAR`) : this.tSvc.instant(`RETURN_SEARCH.RETURN_DATE_RANGE.LABEL_${drc.durationUnit?.toUpperCase()}_PLURAL`);
        Object.assign(filterItem, { 
          tooltipMsg: this.tSvc.instant(oobField.internalConfig?.tooltipText, {duration: drc.duration, durationUnit})
        })
      }
    }
    if (oobField.id === this.FIELD_ID_RETURN_AGE){
      if(filterItem.value != 'Y'){
        filterItem.helperText = '';
      }
    }
    if(oobField.id == this.FIELD_ID_RETURN_LINE_STATUS){
      filterItem.value = oobField.storage.value == '' ? {searchValue: ''} : oobField.storage.value;
      // following fields mainly for the tag in the filter panel of the search result page
      Object.assign(filterItem.value, {
        canReset: true,
        id: oobField.id,
        fieldId: oobField.id
      });
      Object.assign(filterItem, {
        tooltipMsg: oobField.internalConfig.tooltipMsg,
        placeholder:  oobField.internalConfig.placeholder,
        invalid: oobField.storage.invalid,
        items: oobField.storage.items
      });
    }
    if(oobField.id == this.FIELD_ID_IS_DRAFT_RETURN){
      Object.assign(filterItem, {description: oobField.internalConfig.description});
    }
    return filterItem;
  }

  private _initStorage(field) {
    const storage = { invalid: false };
    const ic = field.internalConfig;
    let extra;

    if (ic) {
      switch (ic.type) {
        case FilterOptionTypes.enterprise:
          extra = {
            multiEnt: true,
            value: {
              fetchTree: false,
              selectFirst: true,
              selectedInventoryOrgList: this.sessionEnterprise?.inventoryOrgs || [],
              content: this.sessionEnterprise?.content || '',
              selectedEnterpriseList: this.sessionEnterprise?.enterpriseList || undefined,
              selectedEnterprise: this.sessionEnterprise?.value || ''
            }
          };
          break;
        case FilterOptionTypes.dropdown:
          extra = { items: [], value: ic.default || '' };
          if (ic.type === FilterOptionTypes.toggle) {
            extra.value = false;
            if (ic.other) {
              const n = ic.other.length;
              const m = {};
              for (let i = 0; i < n; i += 2) {
                m[ic.other[i]] = ic.other[i + 1];
              }
              extra.items = m;
            }
          }
          break;
        case FilterOptionTypes.dateRange:
          const drc = cloneDeep(get(BucSvcAngularStaticAppInfoFacadeUtil.getProductMeta(), 'bootstrapConfig.searchConfig.return.dateRange', {}));
          let config = [];
          if(drc?.duration){
            config = this.getDefaultDrc(drc);
            const durationUnit = drc.duration == 1 ? this.tSvc.instant(`RETURN_SEARCH.RETURN_DATE_RANGE.LABEL_${drc.durationUnit?.toUpperCase()}_SINGULAR`) : this.tSvc.instant(`RETURN_SEARCH.RETURN_DATE_RANGE.LABEL_${drc.durationUnit?.toUpperCase()}_PLURAL`);
            ic.tooltipText = ic.tooltipText ? this.tSvc.instant(ic.tooltipText, {duration: drc.duration, durationUnit}) : '';
          }
          extra = {
            value: {
              qryType: 'BETWEEN',
              from: config?.[1] ?? '',
              to: config?.[2] ?? '',
              all: ['', ''],
              option: config
             },
             defaultValue: config
          };
          break;
        case FilterOptionTypes.comboBox:
          extra = { items: [], value: [] };
          break;
      }
    } else {
      extra = {};
    }
    field.storage = Object.assign(storage, extra);
  }

  protected _mergeOobAndPreferences(inputJson?) {
    let a;
    if (inputJson) {
      a = inputJson;
    } else if (this.userData?.attributes) {
      const g = this.userData.attributes[this._prefName()];
      a = this._decompress(g);
    }

    if (a && !isEmpty(a)) {
      const full = cloneDeep(a);
      this.grpHier = {
        paths: full
      };
    } else {
      this.grpHier = this.oobGrpHier;
    }
  }

  protected _updateByFiltersWKO(criteria) {
    const filterer = (fld) => this
      .rPipe
      .transform(fld, this, {
        ctx: this.searchSettings.searchByCtx,
        map: this.oobFieldsMap,
        tenantFieldMap: this.tenantFieldMap
      });
    criteria.forEach(({
      options
    }) => {
      options
        .forEach(opt => {
          const f = this.getOobField(opt.fieldId);
          if (f && f.locked !== true && f.placementOnly !== true && filterer(f) && f.internalConfig.resetByEnterprise) {
            this._updateByFilterItem(opt);
          }
        });
    });
  }

  getOobField(fieldId: string) {
    return this.oobFieldsMap[fieldId];
  }

  prepareReturnAge() {
    const fieldValue = this.getGeneralFieldValue('returnAge');
    const options = [
      { returnAgeDescription: this.tSvc.instant('RETURN_SEARCH.GENERAL.RECENT_RETURNS'), returnAgeValue: 'N' },
      { returnAgeDescription: this.tSvc.instant('RETURN_SEARCH.GENERAL.ARCHIVED_RETURNS'), returnAgeValue: 'Y' },
    ];
    const returnAgeList = getArray(options).map(i => ({
      content: i.returnAgeDescription,
      selected: fieldValue !== '' && i.returnAgeValue === fieldValue ? true : false,
      value: fieldValue !== '' && fieldValue === i.returnAgeValue ? fieldValue : i.returnAgeValue
    }));
    this._setFieldList(returnAgeList, 'returnAge');
    this._setFieldValue('returnAge', fieldValue);
  }

  protected _projectSearch2Filters() {
    const all = getArray(this.savedSearchCriteria);
    const r = all.filter(f => f.type !== 'custom');
    const g = r.find(c => c.id === 'general') || {};
    const nG = r.find(c => c.id !== 'general') || {};
    const e = getArray(nG.options).find(f => f.id === 'enterprise');
    let sb;
    let cb = () => {};

    this.rebindCustomFields(all.find(f => f.type === 'custom'));
    this.savedSearchCriteria = r;

    // fix old search
    if (e && e.fieldId === undefined) {
      const gen = [];
      const nonGen = [];

      // first, attach field-ids so that we can reference our JSON to get each field's characteristics
      this.savedSearchCriteria.forEach(c => {
        c.options.forEach(filt => {
          filt.fieldId = this.oobFieldsByFilterIdMap[filt.id].fieldId;
          const f = this.getOobField(filt.fieldId);
          if (!f.locked) {
            nonGen.push(filt);
          } else if (f.placementOnly !== true) {
            gen.push(filt);
          }
        });
      });

      g.options = gen;
      nG.options = nonGen;
      sb = nG.title;
    } else {
      sb = nG.id;
      cb = this._checkGroupingChanges.bind(this, sb, this.savedSearchCriteria);
    }

    const ck: any = COMMON.toMap(g.options, 'fieldId');
    const noGen: any = COMMON.toMap(nG.options, 'fieldId');
    const canSet = sb !== undefined;
    let needRefresh = false;
    if (ck.enterprise) {
      needRefresh = ck.enterprise.value.selectedEnterprise === this.selectedEnterprise;
    }
    this.searchSettings.searchBy = sb;
    return { canSet, needRefresh, cb };
  }

  protected _setSearchByForCurrent() {
    const paths = this.grpHier.paths;
    const sf = paths;
    const all = sf.searchBy;

    const m = COMMON.toMap(all, 'value');
    const toSet = m[this.searchSettings.searchBy] ? this.searchSettings.searchBy : sf.default;
    this.searchSettings.searchByItems = all;
    this.searchBySelectionHelper(toSet);

    if (!sf.translated) {
      this._fixItemLabels(sf);
    }
  }

  async updateGeneralUI(criteria = this.searchCriteria) {
    const c = criteria.map(({ options }) => options) || [];
    const opts = getArray(flatMap(c));

    for (const f of opts) {
      const canUpdate = this.rPipe.transform(
        this.getOobField(f.fieldId), this, {
          ctx: this.searchSettings.searchByCtx,
          map: this.oobFieldsMap,
          tenantFieldMap: this.tenantFieldMap
        }
      );
      if (canUpdate) {
        await this._updateByFilterItem(f);
      }
    }
  }

  protected async _checkGroupingChanges(crit, other: Array<any>) {
    const oCat = other.find(oC => oC.id === crit);
    const oOpts = oCat.options;
    const tCat = this.searchCriteria.find(tC => tC.id === crit);
    const tOpts = tCat.options;
    const m = COMMON.toMap(tOpts, 'fieldId');
    const diff = tOpts.length !== oOpts.length || !oOpts.every(o => m[o.fieldId]);

    if (diff) {
      this.bucNS.send([
        new BucNotificationModel({ statusType: 'info', statusContent: this.nlsMap['RETURN_SEARCH.MESSAGES.MESSAGE_SEARCH_GRP_DIFF'] })
      ]);
    }
  }

  onSelectSaveSearch(e: any) {
    this.savedSearchCriteria = e.criteria;
    this.selectSavedSearch(e.key);
  }

  async executeSavedSearch(savedSearchKey) {
    await this.selectSavedSearch(savedSearchKey);
  }

  async selectSavedSearch(savedSearchKey) {
    const rc = this._projectSearch2Filters();
    if (rc.canSet) {
      await this.updateGeneralUI(this.savedSearchCriteria);

      if (rc.needRefresh) {
        this._savedSearchCallbacks(this.savedSearchCriteria, rc.cb);
      } else {
        this._setSearchByForCurrent();
        this.updateUI(this.savedSearchCriteria, rc.cb);
      }

      this.selectedSavedSearch = savedSearchKey;
    }
  }

  protected abstract _setSearchForDefault();

  protected prepareOptions() {}

  protected _savedSearchCallbacks(criteria: any, cb: any) {}

  protected resultsRoute() {}

  protected prepareSearch() {}

  public readSessionValues(sessionPrefix: any, tabId: string, clearForm = false ) {
    const sessionId = BucSvcAngularStaticAppInfoFacadeUtil.getCurrentCCSessionId();
    const sessionService = new BucSessionService(sessionPrefix, `${sessionId}-${tabId}`);
    if(clearForm === true) {
      sessionService.setItem('returnSearchCriteria', []);
    }
    this.searchFormCriteria =  defaultTo(sessionService.getItem('returnSearchCriteria'), []) ;
  }

  private getGeneralFieldValue(fieldId): any {
    let fieldValue = '';
    if (this.searchFormCriteria.length) {
      this.searchFormCriteria[0].options.forEach(element => {
        if(element.fieldId === fieldId) {
          fieldValue = element.value;
        }
      });
    }
    return fieldValue;
  }

  public setKeyToSession(searchTabId: any, sessionPrefix: any) {
    const sessionId = BucSvcAngularStaticAppInfoFacadeUtil.getCurrentCCSessionId();
    const sessionService = new BucSessionService(`${sessionPrefix}-prevSearchTabId`, `${sessionId}`);
    sessionService.setItem('returnSearchTabId', searchTabId);
  }

  private getSearchTabIdFromSession(sessionPrefix: any, sessionId: any): any {
    const sessionService = new BucSessionService(`${sessionPrefix}-prevSearchTabId`, `${sessionId}`)
    const searchTabId = sessionService.getItem('returnSearchTabId');
    return searchTabId;
  }

  public clearSearchCriteria() {
    this.searchFormCriteria = [];
  }

  public saveCustomization(sessionSvc: BucSessionService, ops: CustomOperator[]) {
    sessionSvc.setItem("searchFormCtx", ops);
  }

  public getDefaultDrc(drc){
    const momObj = BucDateTimeHelper.getMomentInDifferentTimezone(null, this.tz);
    const now = momObj.endOf('day').toDate().toISOString();
    const previous = momObj.subtract(drc.duration, drc.durationUnit?.toLowerCase()).endOf('day').toDate().toISOString();

    return [ "RELATIVE", previous, now, { "last": [drc.duration, drc.durationUnit], "relativeTo": [ "TODAY", "23:59" ] } ]
  }
}
