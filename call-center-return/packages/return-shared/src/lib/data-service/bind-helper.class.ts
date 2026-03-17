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

import { getArray, BucDateTimeHelper } from '@buc/common-components';
import { convertToUTC, valueFromDotCheck } from '../functions';
import { Constants } from '../common/return.constants';
import moment from 'moment';

export class BindHelper {

  static findValue(cMap, cId, dotPath: string, container: any): any {
    const crit = cMap[cId];
    const ck = { result: false };
    if (crit) {
      const v = valueFromDotCheck(dotPath, crit, ck);
      container.value = ck.result ? v : undefined;
    }
    return ck.result;
  }

  static dropdownQueryBinder(src, id: string, key: string, output): void {
    const c = { value: undefined };
    if (BindHelper.findValue(src, id, 'value.content', c)) {
      Object.assign(output, { [key]: c.value });
      Object.assign(output, { [`${key}QryType`]: BindHelper.findValue(src, id, 'value.qryType', c) ? c.value : '' });
    }
  }

  static valueLikeBinder(src, id: string, key: string, output): void {
    const c = { value: undefined };
    const path = 'value';
    if (BindHelper.findValue(src, id, path, c)) {
      Object.assign(output, { [key]: c.value });
      Object.assign(output, { [`${key}QryType`]: 'LIKE' });
    }
  }

  static valueFLikeBinder(src, id: string, key: string, output): void {
    const c = { value: undefined };
    const path = 'value';
    if (BindHelper.findValue(src, id, path, c)) {
      Object.assign(output, { [key]: c.value });
      Object.assign(output, { [`${key}QryType`]: 'FLIKE' });
    }
  }

  static valueEqualsBinder(src, id: string, key: string, output): void {
    const c = { value: undefined };
    const path = 'value';
    if (BindHelper.findValue(src, id, path, c)) {
      Object.assign(output, { [key]: c.value });
      Object.assign(output, { [`${key}QryType`]: 'EQ' });
    }
  }

  static valueFromCustomMapBinder(src, id: string, key: string, output, map: { [key: string]: string }): void {
    const c = { value: undefined };
    if (BindHelper.findValue(src, id, 'value', c)) {
      const b = map[c.value];
      Object.assign(output, { [key]: b === undefined ? c.value : b });
    }
  }

  static valueBinder(src, id: string, key: string, output, withCheck?: string, dotPath?: string): any {
    const c = { value: undefined };
    const path = dotPath || 'value';
    if (BindHelper.findValue(src, id, path, c) && (withCheck === undefined || c.value)) {
      Object.assign(output, { [key]: withCheck === undefined ? c.value : withCheck });
    }
  }

  static valueFromMapBinder(src, id: string, key: string, output): void {
    const c = { value: undefined };
    const m = BindHelper.findValue(src, id, 'items', c) ? c.value : {};
    if (BindHelper.findValue(src, id, 'value', c) && m[c.value] !== undefined) {
      Object.assign(output, { [key]: m[c.value] });
    }
  }

  static dateRangeBinder(src, id: string, key: string, output, qryType?: string): void {
    const c = { value: undefined };
    const from = BindHelper.findValue(src, id, 'value.from', c)
      ? convertToUTC(c.value, true, Constants.ISO_DATETIME_FORMAT)
      : undefined;
    const to = BindHelper.findValue(src, id, 'value.to', c)
      ? convertToUTC(c.value, false, Constants.ISO_DATETIME_FORMAT)
      : undefined;
    const qry =
      qryType === undefined
        ? BindHelper.findValue(src, id, 'value.qryType', c)
          ? c.value
          : undefined
        : qryType;
    const option = BindHelper.findValue(src, id, 'value.option', c)
      ? c.value
      : undefined;

    if (from !== undefined) {
      Object.assign(output, { [`From${key}`]: from });
    }
    if (to !== undefined) {
      Object.assign(output, { [`To${key}`]: to });
    }
    if (qry !== undefined && (to !== undefined || from !== undefined)) {
      Object.assign(output, { [`${key}QryType`]: qry });
    }
    if (option !== undefined) {
      output = { ...output, option };
    }
  }

  static dateTimeRangeBinder(src, id: string, key: string, output, qryType?: string): void {
    const c = { value: undefined };
    const from = BindHelper.findValue(src, id, 'value.from', c)
      ? BucDateTimeHelper.getMoment(c.value).utc()
      : undefined;
    const to = BindHelper.findValue(src, id, 'value.to', c)
      ? BucDateTimeHelper.getMoment(c.value).utc()
      : undefined;
    const qry =
      qryType === undefined
        ? BindHelper.findValue(src, id, 'value.qryType', c)
          ? c.value
          : undefined
        : qryType;
    const option = BindHelper.findValue(src, id, 'value.option', c)
      ? c.value
      : undefined;

    if (from !== undefined) {
      Object.assign(output, { [`From${key}`]: from });
    }
    if (to !== undefined) {
      Object.assign(output, { [`To${key}`]: to });
    }
    if (qry !== undefined && (to !== undefined || from !== undefined)) {
      Object.assign(output, { [`${key}QryType`]: qry });
    }
    if (option !== undefined) {
      output = { ...output, option };
    }
  }


  static rangeBinder(src, id: string, key: string, output, qryType?: string): void {
    const c = { value: undefined };
    const from = BindHelper.findValue(src, id, 'value.from', c) ? c.value : undefined;
    const to = BindHelper.findValue(src, id, 'value.to', c) ? c.value : undefined;
    const qry = qryType === undefined ? (BindHelper.findValue(src, id, 'value.qryType', c) ? c.value : undefined) : qryType;

    if (from !== undefined) {
      Object.assign(output, { [`From${key}`]: from });
    }
    if (to !== undefined) {
      Object.assign(output, { [`To${key}`]: to });
    }
    if (qry !== undefined && (to !== undefined || from !== undefined)) {
      Object.assign(output, { [`${key}QryType`]: qry });
    }
  }

  static nodeBinder(src, id: string, key: string, output, multiple = false): void {
    const c = { value: undefined };
    if (BindHelper.findValue(src, id, 'value.selectedNode', c) && c.value.length > 0) {
      Object.assign(output, { [key]: c.value[0] });
    }
  }

  static cqExpProjector(src, id: string, Name: string, elemKey: string, QryType: string = 'EQ'): void {
    const c = { value: undefined };
    let rc;
    if (BindHelper.findValue(src, id, 'value', c)) {
      rc = getArray(c.value).map(e => ({ Name, QryType, Value: e[elemKey] }));
    }
    return rc;
  }

  static dateTimeBinder(src, id: string, key: string, output): void {
    let dateValue;
    let timeValue = '00:00';
    const c = { value: undefined };
    const dateTimeDetails = BindHelper.findValue(src, id, 'value', c) ? c.value : {};
    timeValue = dateTimeDetails.time ? dateTimeDetails.time : timeValue;
    if (dateTimeDetails.date) {
      dateValue = moment(dateTimeDetails.date.toString()).format(Constants.MOMENT_DATE_FORMAT);
      if (dateTimeDetails.time && dateTimeDetails.period === 'PM') {
        const tm = dateTimeDetails.time.split(':');
        let hours = Number(tm[0]);
        hours = hours + 12;
        tm[0] = hours;
        timeValue = tm.join(':');
      }
      const dateAndTime = [dateValue, timeValue].join(' ');
      Object.assign(output, { [key]: new Date(dateAndTime) });
    }
  }
}
