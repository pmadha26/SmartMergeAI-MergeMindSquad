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

import * as ConfigurationActions from './configuration.actions';
import { createReducer, createSelector, on } from "@ngrx/store";
import { AppState } from '../types/base-types';
import { BucBaseUtil } from '@buc/svc-angular';
import { CommonCode } from './configuration.types';
import { get } from 'lodash';

export const configurationReducers = createReducer({},
    on(ConfigurationActions.setCommonCode, (state: Record<string, any>, action) => ({
        ...state,
        commonCodes: Object.assign({}, state.commonCodes, ...action.input)
    })),
    on(ConfigurationActions.setRuleDetails, (state: Record<string, any>, action) => ({
        ...state,
        ruleDetails: Object.assign([], state.ruleSetValues, action.ruleDetails)
    }))
);

const selectCommonCodes = (state: AppState) => state.configData.commonCodes;

export const selectCommonCode = (codeType: string, documentType?: string, enterpriseCode?: string) => createSelector(
    selectCommonCodes,
    (commonCodesConfig) => {
        let commonCodes: Array<CommonCode> = get(commonCodesConfig, codeType, []);
        if (!BucBaseUtil.isVoid(documentType)) {
            commonCodes = commonCodes.filter(cc => cc.documentType == documentType);
        }
        if (!BucBaseUtil.isVoid(enterpriseCode)) {
            commonCodes = commonCodes.filter(cc => cc.organizationCode === enterpriseCode);
        }
        return commonCodes;
    }
);
