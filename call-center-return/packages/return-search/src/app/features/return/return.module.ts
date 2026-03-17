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

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { BucCommonClassesAllModuleClazz, BucCommonClassesAssetUrlHttpInterceptorService, BucMultiTranslateHttpLoader } from '@buc/svc-angular';
import { ReturnRoutingModule } from './return-routing.module';
import { ReturnSearchComponent } from './return-search/return-search.component';
import { ReturnSharedModule } from '@call-center/return-shared';
import {
  BucFeatureComponentsModule,
  OmsiCacheService,
  OmsOrdersService
} from '@buc/common-components';
import { IconModule, IconService, TooltipModule } from 'carbon-components-angular';
import Information16 from "@carbon/icons/es/information/16";
import { AppCustomizationImpl } from '../../app-customization.impl';
import { ExtReturnModule } from '../ext-return.module';
// components

const bundles: Array<any> = [
  {
    prefix: './assets/i18n/',
    suffix: '.json'
  }
];

@NgModule({
    declarations: [
        ReturnSearchComponent,
        ...AppCustomizationImpl.components
    ],
    imports: [
        CommonModule,
        ReturnRoutingModule,
        BucFeatureComponentsModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: (http: HttpClient) => new BucMultiTranslateHttpLoader(http, bundles, true),
                deps: [HttpClient]
            },
            isolate: true
        }),
        ReturnSharedModule,
        IconModule,
        TooltipModule,
        ...AppCustomizationImpl.imports,
        ExtReturnModule
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: BucCommonClassesAssetUrlHttpInterceptorService,
            multi: true
        },
        OmsiCacheService,
        OmsOrdersService,
        ...AppCustomizationImpl.providers
    ]
})
export class ReturnModule extends BucCommonClassesAllModuleClazz {
  constructor(private iconService: IconService, translateService: TranslateService) {
    super(translateService);
    iconService.registerAll([Information16]);
  }
}
