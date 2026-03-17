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

import { ModuleWithProviders, NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { CommonCodeResponseMapper } from '../../mappers/configuration.mappers';
import { ConfigurationEffects } from './configuration.effects';
import { configurationReducers } from './configuration.reducers';
import { MASHUP_RESPONSE_MAPPERS } from '../mashup/mashup-rsp-processor.service';
import { Constants } from '../../common/return.constants';
import { BucBaseUtil } from '@buc/svc-angular';

@NgModule({
  imports: [
    StoreModule.forFeature('configData', configurationReducers),
    EffectsModule.forFeature([ConfigurationEffects]),
  ],
  providers: [ConfigurationEffects],
})
export class ConfigurationModule {

  static forRoot(input?: {
    additionalCommonCodeMashups: Array<string>
  }): ModuleWithProviders<ConfigurationModule> {
    const commonCodeMapper = new CommonCodeResponseMapper();
    const additionalCommonCodeMashups = !BucBaseUtil.isVoid(input) ? input.additionalCommonCodeMashups : [];
    return {
      ngModule: ConfigurationModule,
      providers: [
        {
          provide: MASHUP_RESPONSE_MAPPERS,
          useValue: Object.assign({
              [Constants.MASHUP_ID_FETCH_COMMON_CODE_LIST]: commonCodeMapper,
            },
            ...additionalCommonCodeMashups.map(a => ({[a]: commonCodeMapper}))
          ),
          multi: true,
        },
      ],
    };
  }
}
