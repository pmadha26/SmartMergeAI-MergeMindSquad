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

import { ActivatedRouteSnapshot } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Constants } from './common/return.constants';
import { BucBaseUtil, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { BucDateTimeHelper } from '@buc/common-components';
import { cloneDeepWith } from 'lodash';
import { TemplateRef } from '@angular/core';

export const LocaleMapBuc2Angular: { [bucLocale: string]: string } = {
  pt_BR: 'pt',
  zh_CN: 'zh-Hans',
  zh_TW: 'zh-Hant'
};
export const LocaleMapBuc2Moment: { [bucLocale: string]: string } = {
  pt_BR: 'pt-br',
  zh_CN: 'zh-cn',
  zh_TW: 'zh-tw'
};

/**
 * given a literal string, quote (escape) any regexp chars in it
 * @param literal string to quote regexp chars in
 */
export const regexEscape = (literal: string) => {
  return literal.replace(/[\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * retrieve value from an `input` object using given dot-notation `path`, i.e., given:
 * ```
 * path: 'a.b.c.d'
 * ```
 * and
 * ```
 * input: { a: { b: { c: { d: 'e' } } } }
 * ```
 *
 * return:
 * ```
 * 'e'
 * ```
 *
 * @param path dot notation specification of value to retrieve
 * @param input object to retrieve value from
 */
export const valueFromDot = (path: string, input: any): any => {
  return typeof input !== 'object' ? input : path.split('.').reduce((o, v) => o[v], input);
};

export const fmtDate = (dt: any, format = Constants.DATE_FORMAT, localTime = false) => {
  let curDate;
  let locMomTime;

  if (localTime) {
    const utcDT = BucDateTimeHelper.getMoment(dt).utc();
    locMomTime = BucDateTimeHelper.getMoment(undefined).
      year(utcDT.get('year')).month(utcDT.get('month')).date(utcDT.get('date')).hour(0).minute(0).
      second(0).millisecond(0);
  }
  curDate = localTime ? locMomTime : BucSvcAngularStaticAppInfoFacadeUtil.convertFromUTC(dt);
  if (curDate) {
    const tz = BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserTimeZone();
    return BucDateTimeHelper.getMomentWithTimezone(curDate, tz).format(format);
    // return curDate.format(format);
  }
  return '';
};

/**
 * retrieve value from an `input` object using given dot-notation `path`, i.e., given:
 * ```
 * path: 'a.b.c.d'
 * ```
 * and
 * ```
 * input: { a: { b: { c: { d: 'e' } } } }
 * ```
 *
 * return:
 * ```
 * 'e'
 * ```
 *
 * @param path dot notation specification of value to retrieve
 * @param input object to retrieve value from
 * @param output object to store result of retrieval in (false if leaf not reached; true otherwise)
 */
export const valueFromDotCheck = (path: string, input: any, output: { result: boolean }): any => {
  output.result = true;
  return path.split('.').reduce((o, v) => {
    if (output.result && o && o[v]) {
      return o[v];
    } else {
      output.result = false;
      return undefined;
    }
  }, input);
};

/**
 * convert a dot-notation `path` to object with `value` as the inner-most element's value, i.e., given:
 * ```
 * path: 'a.b.c.d'
 * ```
 * and
 * ```
 * value: { 'a-key': 'a-value' }
 * ```
 *
 * return:
 * ```
 * { a: { b: { c: { d: { 'a-key': 'a-value' } } } } }
 * ```
 *
 * @param path dot notation specification of object to generate
 * @param value value to set on the inner-most (last) element of `path`
 */
export const dot2Object = (path: string, value: any): any => {
  return path.split('.').reverse().reduce((v, k) => ({ [k.replace('[]', '')]: k.endsWith('[]') ? [v] : v }), value);
};

export const localeBuc2Angular = (bucLocale: string) => {
  return LocaleMapBuc2Angular[bucLocale] || bucLocale;
};

export const localeBuc2Moment = (bucLocale: string) => {
  return LocaleMapBuc2Moment[bucLocale] || bucLocale;
};

export function getPathFromRoot(route: ActivatedRouteSnapshot): any {
  const pathFromRoot = route.pathFromRoot;
  const payLoad = pathFromRoot.map(arSnapShot => arSnapShot.url.map(u => u.path).join('/')).join('/');
  return payLoad;
}

export const tableCancelText = async (translate: TranslateService): Promise<any> => {
  const cancelText = await translate.get('SHARED.TABLE.CANCEL').toPromise();
  return { CANCEL: cancelText };
};

export const convertToUTC = (dt: any, startOfDay: boolean, defaultFormat = Constants.MOMENT_DATE_FORMAT) => {
  return BucSvcAngularStaticAppInfoFacadeUtil.convertToUTC(dt, startOfDay, defaultFormat);
};

export const getTranslations = async (key, params, translate: TranslateService): Promise<any> => {
  return translate.get(key, params).toPromise();
};

export const getDefaultImageUrl = () => {
  let url = '/call-center-return/assets/call-center-return/images/default-image.svg';
  let deployUrl: string | URL = BucSvcAngularStaticAppInfoFacadeUtil.getEnvironmentObj().additionalProps.deployUrl as string;
  if (!BucBaseUtil.isVoid(deployUrl)) {
    try {
      deployUrl = new URL(deployUrl);
      url = deployUrl.origin + url;
    } catch (err) {}
  }
  return url;
}

export const cloneFieldDetailAttributes = (attrList) => {
  return cloneDeepWith(attrList, (v) => v instanceof TemplateRef ? v : undefined);
}
