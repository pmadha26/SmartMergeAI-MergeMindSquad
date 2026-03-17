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

import { Component, OnInit, Input } from '@angular/core';
import { Constants } from '../common/return.constants';
import { Router } from '@angular/router';
import { BucCommonClassesAbstractEnvironmentClazz } from '@buc/svc-angular';

@Component({
  selector: 'buc-sample-shared:not([extn])',
  templateUrl: './sample-shared.component.html',
  styleUrls: ['./sample-shared.component.scss']
})
export class SampleSharedComponent {

    @Input() isInitialized: boolean;

    public routeUrlMap = {
        
        'return-search': Constants.RETURN_SEARCH_ROUTE,
        
        'return-search-result': Constants.RETURN_SEARCH_RESULT_ROUTE,
        
        'return-details': Constants.RETURN_DETAILS_ROUTE
        
    };

    constructor(
        public environment: BucCommonClassesAbstractEnvironmentClazz,
        private router: Router
    ) { }

}
