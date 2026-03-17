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

import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

@Injectable()
export class ErrorHandlerService {

    constructor(private translateService: TranslateService) {
    }

    handleMashupError(error, genericBundleKey = '') {
        let errorMsg = this.translateService.instant('commonMessages.ERROR_omsAPIFailedMsg');
        let errors = {
            ErrorDescription: '',
            ErrorCode: ''
        }
        if (error && error.mashupResponse) {
            if (error.mashupResponse.Errors?.Error?.length > 0) {
                errors = error.mashupResponse.Errors.Error[0];
            }else if(error && error.Errors?.Error?.length > 0){
                errors = error.Errors.Error[0];
            }
            errorMsg = errors.ErrorDescription;
            const errorCode = errors.ErrorCode;
            const bundleKey = 'APIERROR.' + errorCode;
            if (this.translateService.instant(bundleKey) !== bundleKey) {
                errorMsg = this.translateService.instant(bundleKey);
            }
            if (!errorCode && genericBundleKey) {
                errorMsg = this.translateService.instant(genericBundleKey);
            }
        }
        return errorMsg;
    }

}
