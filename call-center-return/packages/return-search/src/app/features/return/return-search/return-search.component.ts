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

import { Component, Injector, OnInit, QueryList, TemplateRef, ViewChildren } from '@angular/core';
import { BreadcrumbService, getPathFromRoot, ReturnSearchForm, Constants, TenantFieldMap } from '@call-center/return-shared';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  BucSessionService, getCurrentLocale, getCurrentLocaleDateFormat, getFlatPickrDateFormat, COMMON, SelectEnterpriseComponent, getArray, EnterpriseItem, BucFieldRenderPipe, getMoment,
  BucTableFilterCategoryModel,BucDateTimeHelper,
  getDateString
} from '@buc/common-components';
import {  BucSvcAngularStaticAppInfoFacadeUtil, CallCenterNavigationService } from '@buc/svc-angular';
import { cloneDeep, flatMap } from 'lodash';
import { TemplateIdDirective } from '@buc/common-components';
import { ExtensionConstants } from '../../extension.constants';

@Component({
  selector: 'call-center-return-search',
  templateUrl: './return-search.component.html',
  styleUrls: ['./return-search.component.scss']
})
export class ReturnSearchComponent extends ReturnSearchForm implements OnInit {

  public readonly sessionPrefix = 'call-center-return-search';

  defaultLabels = {
    searchByLabel: '',
    customizationLabel: '',
    pageHeaderDes: ''
  };
  protected renderingPath = ['searchBy'];

  public searchDirection: string;
  public isScreenInitialized = false;
  public isPageInitialized = false;
  public breadCrumbList: any[];
  public currentRoute = 'return-list';
  
  private customTemplates: { [id: string]: TemplateRef<any> } = {};
  timezone: string;
  @ViewChildren(TemplateIdDirective) set _templates(a: QueryList<TemplateIdDirective>) {
    if (a) {
      a.forEach(({ id, template }) => (this.customTemplates[id] = template));
    }
  }
  componentId = "ReturnSearch";

  EXTENSION = {
    TOP: ExtensionConstants.RETURN_SEARCH_RS_TOP,
    BOTTOM: ExtensionConstants.RETURN_SEARCH_RS_BOTTOM
  };

  readonly nlsMap: any = {
    'RETURN_SEARCH.GENERAL.LABEL_ADVANCED_SEARCH': '',
    'RETURN_SEARCH.GENERAL.LABEL_QUERY_is': '',
    'RETURN_SEARCH.GENERAL.LABEL_QUERY_starts_with': '',
    'RETURN_SEARCH.GENERAL.LABEL_QUERY_contains': '',
    'RETURN_SEARCH.GENERAL.CONFIRM_RETURN': '',
    'RETURN_SEARCH.GENERAL.DRAFT_RETURN': '',
    'RETURN_SEARCH.GENERAL.RECENT_RETURNS': '',
    'RETURN_SEARCH.GENERAL.ARCHIVED_RETURNS': '',
    'RETURN_SEARCH.MESSAGES.MESSAGE_SEARCH_GRP_DIFF': '',
    'RETURN_SEARCH.GENERAL.LABEL_SEARCH_BY_RETURN_INFO': '',
    'RETURN_SEARCH.RETURN_AGE.HELPER_TEXT': ''
  };
  sectionTitle = '';

  tenantId = BucSvcAngularStaticAppInfoFacadeUtil.getSelectedTenantId();
  sessionId: string = BucSvcAngularStaticAppInfoFacadeUtil.getCurrentCCSessionId();
  tabId: string;

  public pageHeaderDes: SafeHtml;
  protected readonly sanitizer: DomSanitizer;

  protected bucSessionStorageService: BucSessionService;
  protected bucSessionStorageServiceGlobal: BucSessionService;

  i18nDatePlaceholder: string;
  flatpickrDateFormat: string;
  currLocale: string;

  searchCriteria = [];
  selectedSavedSearch;

  protected stringQueryOptions = [];
  protected numericQueryOptions = [];
  protected grpHier: any = {};
  protected oobGrpHier: any = {};
  protected oobFields = [];
  oobFieldsMap: any = {};
  protected oobFieldsByFilterIdMap = {};
  protected readonly rPipe: BucFieldRenderPipe;

  tenantFieldMap: any = TenantFieldMap;
  searchFilters: any = [];
  pageModel = {};

  constructor(private bcSvc: BreadcrumbService, private ccNavigationSvc: CallCenterNavigationService, inj: Injector) {
    super(inj);
    this.sanitizer = inj.get(DomSanitizer);
    this.rPipe = inj.get(BucFieldRenderPipe);
    this.tabId = this.route.snapshot.queryParams.uniqueId;
    this.i18nDatePlaceholder = getCurrentLocaleDateFormat();
    this.flatpickrDateFormat = getFlatPickrDateFormat();
    this.bucSessionStorageService = new BucSessionService(this.sessionPrefix, `${this.sessionId}-${this.tabId}`);
  }

  ngOnInit() {
    this.initialize();
  }

  prepareBreadcrumbList() {
    const c = this.nlsMap['RETURN_SEARCH.GENERAL.LABEL_ADVANCED_SEARCH'];
    const r = getPathFromRoot(this.route.snapshot);
    this.bcSvc.updateLast(c, r, c, [r], { queryParams: this.route.snapshot.queryParams });
    this.breadCrumbList = this.bcSvc.get();
  }

  async initialize(clearForm = false) {
    let p;
    this.timezone = BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserTimeZone();
    await this._initTranslations();
    this.sectionTitle = this.nlsMap['RETURN_SEARCH.GENERAL.LABEL_SEARCH_BY_RETURN_INFO'];

    // async that do not require a wait
    (async () => this.setReplacementMapping([
      { key: 'enterprise', value: 'oobFieldsMap.enterprise.storage.value.selectedEnterprise' }
    ]))();

    this.initializeSession();
    this.fetchSessionEnterprise();
    this.readSessionValues(this.sessionPrefix, this.tabId, clearForm);
    await this._fetchFields();

    this.currLocale = getCurrentLocale();
    if (this.currLocale.startsWith('zh-')) {
      this.currLocale = 'zh';
    }

    await this.loadForm();
    this.fieldsContainer.custom = this.getCustomFields();
    this.initCustomTemplates(this.customTemplates);
    this.isPageInitialized = true;
    await this.updateGeneralUI();

    this.prepareReturnLineStatus();
    this.prepareShowDraftReturns(false);
    this.prepareReturnAge()

    this._setSearchByForCurrent();
    await this.updateUI();
    if (clearForm) {
      this.clearCustomFields();
    }
    else{
      this.prepareBreadcrumbList();
    }
    this.callbacks['returnAge'] = this.handleOrderAgeChange.bind(this);
    this.isScreenInitialized = true;
  }

  handleOrderAgeChange(){
    const { storage, internalConfig } = this.getOobField('returnAge');
    if(storage.value == 'Y'){
      internalConfig.helperText = this.nlsMap['RETURN_SEARCH.RETURN_AGE.HELPER_TEXT'];
    }else{
      internalConfig.helperText = '';
    }
  }

  protected async _initTranslations() {
    const keys = Object.keys(this.nlsMap);
    const json = await this.tSvc.get(keys).toPromise();
    keys.forEach(k => this.nlsMap[k] = json[k]);
  }

  initializeSession() {
    this.bucSessionStorageService.setItem('activeTab', 'return');
    this.bucSessionStorageService.setItem('returnPageNo', 1);
    this.searchCriteria = this.bucSessionStorageService.getItem('returnSearchCriteria') || [];
    this.selectedSavedSearch = this.bucSessionStorageService.getItem('selectedSavedReturnSearch');
  }

  protected _setSearchForDefault() { return; }

  async prepareOptions() { }

  public updateSearchCriteria() {
    if (this.searchSettings.searchByItems.length > 0) {
      this.searchCriteria = this._initGroupSearchCriteria(true);
      this.resetHiddenFields();
    }
  }

  prepareSearch() {
    this.bucSessionStorageService.setItem('appliedFiltersList', this.searchFilters);
    this.updateSearchCriteria();
    this.bucSessionStorageService.setItem('returnSearchCriteria', this.searchCriteria);
    this.bucSessionStorageService.setItem('returnSearchBy', this.searchSettings.searchBy);
    this.bucSessionStorageService.setItem('returnSearchByCtx', this.searchSettings.searchByCtx);
    this.bucSessionStorageService.setItem('isPageInitializedReturn', true);
    this.bucSessionStorageService.setItem('returnGroupPaths', this.grpHier.paths);

    const e = this.getEntStorageVal();
    // will be removed after selectedEnterprise call
    this.bucSessionStorageService.setItem('selectedReturnEnterprise', {
      selectedEnterprise: e.selectedEnterprise,
      selectedEnterpriseList: e.selectedEnterpriseList
    });
    if (this.selectedSavedSearch) {
      this.bucSessionStorageService.setItem('selectedSavedReturnSearch', this.selectedSavedSearch);
    } else {
      this.bucSessionStorageService.removeItem('selectedSavedReturnSearch');
    }
    this.saveCustomization(this.bucSessionStorageService, this.getOps());
    this.saveForm();
  }

  querySearch() {
    let invalid = false;
    this.searchCriteria
      .forEach(({ options }) => invalid = invalid || options.some(o => this.getOobField(o.fieldId).storage.invalid));

    if (invalid) {
      return;
    }
    this.prepareSearch();
    this.navigateToResults();
  }

  protected resultsRoute() {
    return Constants.RETURN_SEARCH_RESULT_ROUTE;
  }

  navigateToResults() {
    this.ccNavigationSvc.openUrlInSameTab(this.resultsRoute(), { searchTabId: this.tabId });
  }

  clearForm() {
    this.bucSessionStorageService.removeItem('returnSearchCriteria');
    this.bucSessionStorageService.setItem('returnSearchCriteria', []);
    this.bucSessionStorageService.removeItem('hasSearched');
    this.bucSessionStorageService.removeItem('selectedSavedReturnSearch');
    this.clearSearchCriteria();
    this.onEntClear();
    this.initialize(true);
  }

  prepForSave() {
    this.updateSearchCriteria();

    // bind a category for custom-fields
    const options = this.fieldsContainer.custom;
    const custom = Object.assign(new BucTableFilterCategoryModel({ title: '', id: '', options, expanded: true }), { type: 'custom', });

    // save
    this.savedSearchCriteria = cloneDeep([... this.searchCriteria, custom]);
  }

  raisedDateChange(event, option) {
    option.storage.value.date = event[0] ? BucDateTimeHelper.getMoment(event[0]).endOf('day').toISOString() : '';
    this.uncheckSavedSearchDropdown();
  }

  onTimeChange(event, option) {
    option.storage.value.time = event.time ? event.time : '';
    if (event.timePeriod) {
      option.storage.value.period = event.timePeriod;
    }
    this.uncheckSavedSearchDropdown();
  }

  onDateChange(event, option) {
    let value = event;
    // If event is { value: [], option: [] }
    if (typeof event === 'object') {
      value = event.value;
      if (event.option && event.option.length > 0) {
        event.option = event.option.map(d => d instanceof Date ?
          BucDateTimeHelper.getMomentInDifferentTimezone(getDateString(d), this.timezone).toISOString() : d)
      }
      option.storage.value.option = event.option;
    }
    if (value === undefined || value.length === 0) {
      option.storage.value.from = '';
      option.storage.value.to = '';
    } else if (value.length === 1) {
      option.storage.value.from = BucDateTimeHelper.getMomentInDifferentTimezone(getDateString(value[0]), this.timezone).toISOString();
      option.storage.value.to = '';
    } else if (value.length === 2) {
      option.storage.value.from = BucDateTimeHelper.getMomentInDifferentTimezone(getDateString(value[0]), this.timezone).toISOString();
      option.storage.value.to = BucDateTimeHelper.getMomentInDifferentTimezone(getDateString(value[1]), this.timezone).toISOString();
    }
    this.uncheckSavedSearchDropdown();
  }

  onEmptySearch(event, f){
    if(event == ''){
      f.storage.items.forEach(option => {
        option.selected = false;
      });
      f.storage.value = {
        ...f.storage.value,
        searchValue: '', // for search
        value: '' // for display
      };
      this.uncheckSavedSearchDropdown();
    }
  }

  onReturnLineStatusSelected(event, f){
    f.storage.items.forEach(option => {
      option.selected = false;
      if(option.value == event.item.value){
        option.selected = true;
      };
    });

    f.storage.value = {
      ...f.storage.value,
      searchValue: event.item.value, // for search
      value: event.item.content // for display
    };
    this.uncheckSavedSearchDropdown();
  }

  protected async _savedSearchCallbacks(criteria, cb) { }

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
        ctx: this.searchSettings.searchByCtx, map: this.oobFieldsMap, tenantFieldMap: this.tenantFieldMap
      }
      );
      if (canUpdate) {
        await this._updateByFilterItem(f);
      }
    }
  }
  async selectEnterprise(event: { item: EnterpriseItem }, field, ref: SelectEnterpriseComponent, update = true) {
    let changed = false;
    if (event.item) {
      if (field.storage.value.selectedEnterprise !== event.item.value) {
        this.onEntSelReInit(event, field, ref, update);
        changed = true;
      }
    } else {
      Object.assign(field.storage.value, { content: '', selectedEnterpriseList: [], selectedEnterprise: '' });
      changed = true;
    }

    if (update && changed) {
        this._updateByFiltersWKO(this.searchCriteria);
        this.updateSearchCriteria();
    }
    this.processForm();
  }

  onEntSearch(e, f, ref: SelectEnterpriseComponent) {
    if (!f.storage.isReset) {
      const c = { value: undefined };
      const invalid = !this._onSearchValid(e, ref.list, c) || !c.value;
      if (!invalid) {
        f.storage.onSearch = true;
        this.selectEnterprise({ item: c.value }, f, ref);
      }
    }
  }

}
