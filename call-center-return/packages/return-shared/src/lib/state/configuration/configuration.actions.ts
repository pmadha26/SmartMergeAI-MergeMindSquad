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

import { createAction, props } from "@ngrx/store";
import { CommonCode } from "./configuration.types";

export const setCommonCode = createAction('[configuration]-setCommonCode',
    props<{input: Array<{[codeType: string]: Array<CommonCode>}>}>());

export const fetchCommonCode = createAction('[configuration]-fetchCommonCode', props<{codeType: string, enterpriseCode?: string, documentType?: string}>());

export const fetchCommonCodes = createAction('[configuration]-fetchCommonCodes',
    props<{mashups: Array<{mashupId: string, enterpriseCode?: string, documentType?: string}>}>()
);

export const fetchRuleSetValues = createAction(
    '[Create return] fetch rule set values', props<{ enterpriseCode: string, ruleNames: string[] }>()
);  

export const fetchRuleSetValuesSuccess = createAction(
    '[Create return] fetch rule set values success', props<{ apiOutput?: any }>()
); 

export const setRuleDetails = createAction(
    '[Create return] set rule set values', props<{ ruleDetails: { RuleSetFieldName: string, RuleSetValue: string }[] }>()
); 
