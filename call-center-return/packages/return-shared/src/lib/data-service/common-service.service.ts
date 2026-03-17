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

import { BucBaseUtil, BucCommOmsRestAPIService, BucPageResourceMappingService, BucSvcAngularStaticAppInfoFacadeUtil } from '@buc/svc-angular';
import { Injectable } from '@angular/core';
import {
  BucNotificationModel,
  BucNotificationService,
  BucSessionService,
  COMMON,
  getArray
} from '@buc/common-components';
import { Observable, ReplaySubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Constants } from '../common/return.constants';
import { get } from 'lodash';

// @dynamic
@Injectable()
export class CommonService {

  private static appInitSubject: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  private static appInit = CommonService.appInitSubject.asObservable();

  private static staticRestApiSvc: BucCommOmsRestAPIService;
  private static resourceMap: BucPageResourceMappingService;
  private static bucNF: BucNotificationService = new BucNotificationService();

  public static onAppInit(): Observable<boolean> {
    return this.appInit;
  }

  public static appInitialized(initialized: boolean){
    CommonService.appInitSubject.next(initialized);
  }

  constructor(private restApiSvc: BucCommOmsRestAPIService, private bucPgResourceMap: BucPageResourceMappingService) {
    CommonService.staticRestApiSvc = this.restApiSvc;
    CommonService.resourceMap = this.bucPgResourceMap;
  }

  public static async getResourceIds(Scope: string, objectPath: string, errorMessage) {
    let resourceId;
    try {
      const scope = await CommonService.resourceMap.setScope(Scope).toPromise();
      resourceId = await CommonService.resourceMap.getResourceId(objectPath);
      if (objectPath === '') {
        return scope;
      }
    } catch (err) {
      const notification = new BucNotificationModel({
        statusType: 'error',
        statusContent:  errorMessage
      });
      CommonService.bucNF.send([notification]);
    }
    return resourceId;
  }
  
  /**
   * Returns single enterprise data to be used for the session, which is set at the home page.
   * Return null if all enterprises were selected.
   * @param route ActivatedRoute instance for reading home page details from query params
   */
  public static getSessionEnterprise(route: ActivatedRoute): any {
    const sessionId = BucSvcAngularStaticAppInfoFacadeUtil.getCurrentCCSessionId();
    let prefix = '';
    if (route.snapshot.queryParamMap.has(Constants.BREADCRUMB_ROOT)) {
      const homeTabId = route.snapshot.queryParamMap.get(Constants.BREADCRUMB_ROOT);
      prefix = `${sessionId}-${homeTabId}`;
    } else {
      prefix = sessionId;
    }
    const sessionService = new BucSessionService(Constants.CC_HOME_SESSION_KEY, prefix);
    const sessionEnterprise = sessionService.getItem('selectedEnterprise');
    return sessionEnterprise?.value !== Constants.ALL_ENTERPRISES ? sessionEnterprise : null;
  }

  public static isAnyVoid(obj: any, dotPaths: Array<string>): boolean {
    return dotPaths.some(d => BucBaseUtil.isVoid(get(obj, d)));
  }

  public static getLinesNotInShipment(shippingGroup: any) {
    const shipments: Array<any> = getArray(get(shippingGroup, 'Shipments.Shipment'));
    const linesAlreadyInShipments = COMMON.toMap(
      shipments.flatMap(shipment => getArray(get(shipment, 'ShipmentLines.ShipmentLine'))),
      'OrderLineKey'
    );
    const linesNotInShipments = getArray(get(shippingGroup, 'OrderLines.OrderLine'))
      .filter(ol => BucBaseUtil.isVoid(linesAlreadyInShipments[ol.OrderLineKey]));

    return linesNotInShipments;
  }
}