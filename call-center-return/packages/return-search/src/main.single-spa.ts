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

import { enableProdMode, NgZone } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Router, NavigationStart } from '@angular/router';
import { BucBaseUtil, SingleSpaProps, singleSpaPropsSubject } from '@buc/svc-angular';
import { singleSpaAngular, getSingleSpaExtraProviders } from 'single-spa-angular';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { set } from 'lodash';

if (environment.production) {
  enableProdMode();
}

declare var  __webpack_public_path__: string;

const lifecycles = singleSpaAngular({
  bootstrapFunction: (singleSpaProps: SingleSpaProps) => {
    singleSpaPropsSubject.next(singleSpaProps);
    if (!BucBaseUtil.isVoid(singleSpaProps.deployUrl)) {
      __webpack_public_path__ = singleSpaProps.deployUrl;
    }
    set(environment, 'additionalProps.deployUrl', __webpack_public_path__);
    return platformBrowserDynamic(getSingleSpaExtraProviders()).bootstrapModule(AppModule);
  },
  template: '<return-search-root />',
  Router,
  NavigationStart,
  NgZone
});

export const bootstrap = lifecycles.bootstrap;
export const mount = lifecycles.mount;
export const unmount = lifecycles.unmount;
