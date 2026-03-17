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

import { Injectable } from '@angular/core';
import * as ConfigurationActions from './configuration.actions';
import * as MashupActions from '../mashup/mashup.actions';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map } from 'rxjs/operators';
import { BucCommOmsMashupService, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { Constants } from '../../common/return.constants';

@Injectable()
export class ConfigurationEffects {

    fetchCommonCode$ = createEffect(
        () => this.actions$.pipe(
            ofType(ConfigurationActions.fetchCommonCode),
            map(action => MashupActions.invokeMashup({
                mashupId: Constants.MASHUP_ID_FETCH_COMMON_CODE_LIST,
                mashupInput: {
                    CommonCode: {
                        CodeType: action.codeType,
                        DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
                        ...(action.enterpriseCode ? {CallingOrganizationCode: action.enterpriseCode} : {}),
                        ...(action.documentType ? {DocumentType: action.documentType} : {})
                    }
                }
            }))
        ),
        { dispatch: true }
    );

    fetchCommonCodes$ = createEffect(
        () => this.actions$.pipe(
            ofType(ConfigurationActions.fetchCommonCodes),
            map(action => MashupActions.invokeMultipleMashups(
                {
                    mashups: action.mashups.map(m => (
                        {
                            mashupId: m.mashupId,
                            mashupInput: {
                                CommonCode: {
                                    DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
                                    ...(m.enterpriseCode ? {CallingOrganizationCode: m.enterpriseCode} : {}),
                                    ...(m.documentType ? {DocumentType: m.documentType} : {})
                                }
                            }
                        }
                    ))
                }
            ))
        ),
        { dispatch: true }
    );

    fetchRuleDetails$ = createEffect(
        () => this.actions$.pipe(
            ofType(ConfigurationActions.fetchRuleSetValues),
            map((action) => {
                return MashupActions.invokeMultipleMashups({
                    mashups: action.ruleNames.map(rule => ({
                        mashupId: Constants.MASHUP_ID_FETCH_RULE_DETAILS,
                        mashupInput: {
                            Rules: {
                                CallingOrganizationCode: action.enterpriseCode,
                                DisplayLocalizedFieldInLocale: BucSvcAngularStaticAppInfoFacadeUtil.getOmsUserLocale(),
                                RuleSetFieldName: rule
                            }
                        }
                    })),
                    options: {
                        onSuccessAction: ConfigurationActions.fetchRuleSetValuesSuccess({})
                    }

                })
            }),
        ),
    );
    fetchRuleSetValuesSuccess$ = createEffect(
        () => this.actions$.pipe(
            ofType(ConfigurationActions.fetchRuleSetValuesSuccess),
            map((action) => {
                const mashupOutput: any[] = this.mashupService.getMashupOutputArray(action.apiOutput, Constants.MASHUP_ID_FETCH_RULE_DETAILS);
                const ruleDetails: { RuleSetFieldName: string, RuleSetValue: string }[] = mashupOutput.map(m => ({RuleSetFieldName: m.Rules.RuleSetFieldName, RuleSetValue: m.Rules.RuleSetValue}));
                return ConfigurationActions.setRuleDetails({ ruleDetails })

            }),
        ),
    );

    constructor(private actions$: Actions, private mashupService: BucCommOmsMashupService,) { }


}
