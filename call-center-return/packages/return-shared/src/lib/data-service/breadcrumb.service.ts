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
import { Router } from '@angular/router';
import {
  BucSessionService,
  CallCenterBreadcrumbAbstractService,
} from '@buc/common-components';
import { BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { get } from 'lodash';

@Injectable()
export class BreadcrumbService extends CallCenterBreadcrumbAbstractService {

  private globalSessionSvc: BucSessionService;

  constructor(public router: Router) {
    super(router);
  }

  protected async initSession(): Promise<void> {
    await super.initSession();
    this.globalSessionSvc = new BucSessionService(this.prefix, 'global');
  }

  getPreviousTabId() {
    let prevTabId = this.router.routerState.root.snapshot.queryParams?.prev;
    const session = BucSvcAngularStaticAppInfoFacadeUtil.getCurrentCCSessionId();
    if (prevTabId !== undefined) {
      const allCrumbs: any[] = this.globalSessionSvc.getItem('all');
      if (allCrumbs !== undefined) {
        const prevCrumb = allCrumbs.find(c => get(c, 'routeExtras.queryParams.session') === session
          && get(c, 'routeExtras.queryParams.uniqueId') === prevTabId);
        if (prevCrumb === undefined) {
          prevTabId = undefined;
        }
      } else {
        prevTabId = undefined;
      }
    }
    return prevTabId;
  }

  // add any method overrides if needed
}
