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

import { createFeatureSelector, createSelector } from "@ngrx/store";
import { get } from "lodash";
import { AppState } from "../types/base-types";
import { CommonCode } from "./configuration.types";
import { Constants, Rules } from "../../common/return.constants";

export const selectConfigurations = (state: AppState) => state.configData;

export const getCommonCodes = createSelector(
    selectConfigurations,
    (configData: Record<string, Record<string, any>>)  => configData.commonCodes
);

export const getRuleDetails = createSelector(
    selectConfigurations,
    (configData: Record<string, Record<string, any>>)  => configData.ruleDetails
);

export const getPricingRules = createSelector(
    getRuleDetails,
    (ruleDetails: { RuleSetFieldName: string, RuleSetValue: string }[]) => {
        if (ruleDetails) {
            const ruleValueList = ruleDetails.filter(v => Rules.PricingRule.includes(v.RuleSetFieldName)).map(r => r.RuleSetValue);
            return ruleValueList.filter((v, i) => v && ruleValueList.indexOf(v) === i);
        }
        return []
    }
)

export const getOverrideNoteRule = createSelector(
    getRuleDetails,
    (ruleDetails: { RuleSetFieldName: string, RuleSetValue: string }[]) => {
        if (ruleDetails) {
            const ruleValueList = ruleDetails.filter(v => Rules.OverrideNoteRule.includes(v.RuleSetFieldName)).map(r => r.RuleSetValue);
            return ruleValueList.filter((v, i) => v && ruleValueList.indexOf(v) === i)[0];
        }
        return '';
    }
)

export const getExchangeTypeRules = createSelector(
    getRuleDetails,
    (ruleDetails: { RuleSetFieldName: string, RuleSetValue: string }[]) => {
        if (ruleDetails) {
            const ruleValueList = ruleDetails.filter(v => Rules.ExchangeTypeRule.includes(v.RuleSetFieldName)).reduce((prev, curr) => {
                prev[curr.RuleSetFieldName] = curr.RuleSetValue;
                return prev;
            }, {});
            return ruleValueList;
        }
    }
)

export const getReturnBundleRule = createSelector(
    getRuleDetails,
    (ruleDetails: { RuleSetFieldName: string, RuleSetValue: string }[]) => {
        if (ruleDetails) {
            const ruleValueList = ruleDetails.filter(v => Rules.ReturnBundleRule.includes(v.RuleSetFieldName)).reduce((prev, curr) => {
                prev[curr.RuleSetFieldName] = curr.RuleSetValue;
                return prev;
            }, {});
            return ruleValueList;
        }
    }
)
