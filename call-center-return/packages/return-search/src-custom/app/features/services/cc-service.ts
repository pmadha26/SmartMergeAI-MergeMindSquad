/*
 * IBM Confidential
 * OCO Source Materials
 * 5737-D18, 5725-D10
 *
 * (C) Copyright International Business Machines Corp. 2026
 *
 * The source code for this program is not published or otherwise divested
 * of its trade secrets, irrespective of what has been deposited with the
 * U.S. Copyright Office.
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BucCommOmsRestAPIService } from '@buc/svc-angular';

/**
 * Service to interact with IBM ICC Return Service (Java backend)
 * This service provides methods to process return orders and validate return eligibility
 */
@Injectable({
    providedIn: 'root'
})
export class IbmIccReturnService {
    
    private readonly SERVICE_NAME = 'IBMICCReturnService';
    private readonly RETURN_DETAILS_API = 'invokeReturnOrderDetails';
    private readonly VALIDATE_ELIGIBILITY_API = 'validateReturnEligibility';

    constructor(
        private bucCommOmsRestAPIService: BucCommOmsRestAPIService
    ) {}

    /**
     * Invoke return order details processing
     * @param returnOrderKey The return order key
     * @param returnLines Array of return line items
     * @returns Observable with processed return order details
     */
    public invokeReturnOrderDetails(returnOrderKey: string, returnLines: any[]): Observable<any> {
        returnLines.map(returnLine => {
            returnLine.returnLineKey = returnLine.returnLineKey || this.bucCommOmsRestAPIService.generateUUID();
            return returnLine;
        });
        return this.bucCommOmsRestAPIService.post(
            `/returns/${returnOrderKey}/details`,
            returnLines
        );
    }

    }

   
}
