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
import { Observable } from 'rxjs';
import {
    BucCommOmsRestAPIService, 
    BucBEUsersService as UsersRuntimeService,
} from '@buc/svc-angular';
@Injectable({
    providedIn: 'root'
  })
export class ReturnListDataService {
    constructor(
        private usersService: UsersRuntimeService,
        public bucCommOmsRestAPIService: BucCommOmsRestAPIService) {
    }
    public async getCurrentUser(tenantId): Promise<any> {
        return this.getCurrentUserAsObs(tenantId).toPromise();
    }
    public getCurrentUserAsObs(ctxOrgId): Observable<any> {
        return this.usersService.getCurrentUser({ ctxOrgId }, null, '/cw/resources', null);
    }
}
