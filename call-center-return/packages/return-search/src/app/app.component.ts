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

import { Component, OnInit, Renderer2, Inject, ViewContainerRef } from '@angular/core';
import {
  BucCommonClassesAppComponentClazz, BucSvcAngularStaticAppInfoFacadeUtil, SingleSpaStandaloneModeHelperClazzService
} from '@buc/svc-angular';
import { DOCUMENT, registerLocaleData } from '@angular/common';
import { CommonService, Constants,localeBuc2Angular } from '@call-center/return-shared';
import { ActivatedRoute } from '@angular/router';
import { CCNotificationService } from '@buc/common-components';

@Component({
  selector: 'return-search-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends BucCommonClassesAppComponentClazz implements OnInit {
  // Obtained from superclass: isBucTenantChangeSuccess, isBucJwtRefreshSuccess, isInitialState

  constructor(
    singleSpaStandaloneModeHelperClazzService: SingleSpaStandaloneModeHelperClazzService,
    private renderer2: Renderer2,
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
    private ccNotificationService: CCNotificationService,
    private viewContainerRef: ViewContainerRef,
  ) {
    super(singleSpaStandaloneModeHelperClazzService);
  }

  ngOnInit() {
    this.ccNotificationService.registerViewContainerRef(this.viewContainerRef);
    this.route.queryParams.subscribe(qparams => {
      const sessionId = qparams[Constants.SESSION];
      if (sessionId) {
        BucSvcAngularStaticAppInfoFacadeUtil.setCurrentCCSessionId(sessionId);
      }
    });
  }

  handleBucTenantChange(msg) {
    CommonService.appInitialized(true);
    this.localeInitializer();
  }

  handleBucTenantChangeFailure(errorObj) {
    console.warn('bucTenantChangeFailure$.', errorObj);
  }

  handleBucJwtRefresh(msg) {
  }

  handleBucJwtRefreshFailure(errorObj) {
    console.warn('bucJwtRefreshFailure$.', errorObj);
  }

  localeInitializer(): Promise<any> {
    const lcl: string = localeBuc2Angular(BucSvcAngularStaticAppInfoFacadeUtil.getUserLanguage());
    return import(/* webpackInclude: /(de|en|es|fr|it|ja|ko|nl|pl|pt|ru|tr|zh-Hans|zh-Hant)\.mjs$/ */`../../../../node_modules/@angular/common/locales/${lcl}.mjs`)
    .then(m => registerLocaleData(m.default));
  }
}
