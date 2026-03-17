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

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { BucSvcAngularModule, BucBEUsersService, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { BucCommonComponentsModule, BucFeatureComponentsModule } from '@buc/common-components';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import {
  BucCommonClassesAllModuleClazz,
  BucCommShellStaticPatternIframeService,
  BucCommBEHttpInterceptorService,
  BucMultiTranslateHttpLoader
} from '@buc/svc-angular';
import { BreadcrumbService, SharedRootProvidersModule, CommonService } from '@call-center/return-shared';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { environment } from '../environments/environment';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { LayerModule } from 'carbon-components-angular';

const bundles: Array<any> = [
  { prefix: './assets/i18n/', suffix: '.json' }
];

@NgModule({ declarations: [
        AppComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        BrowserAnimationsModule,
        CommonModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (http: HttpClient) => new BucMultiTranslateHttpLoader(http, bundles, true),
                deps: [HttpClient]
            },
            isolate: true
        }),
        BucCommonComponentsModule,
        BucSvcAngularModule.forRoot(environment),
        SharedRootProvidersModule.forRoot(),
        StoreModule.forRoot({}),
        EffectsModule.forRoot([]),
        AppRoutingModule,
        BucFeatureComponentsModule,
        LayerModule], providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: BucCommBEHttpInterceptorService,
            multi: true
        },
        BucBEUsersService,
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule extends BucCommonClassesAllModuleClazz {
  constructor(
    translateService: TranslateService,
    bucCommShellStaticPatternIframeService: BucCommShellStaticPatternIframeService,
    private bcSvc: BreadcrumbService,
    private commonSvc: CommonService) {
    super(translateService, bucCommShellStaticPatternIframeService, environment.routeName);
    BucSvcAngularStaticAppInfoFacadeUtil.setStandaloneModeActivationDelayInMS(0);
  }
}
