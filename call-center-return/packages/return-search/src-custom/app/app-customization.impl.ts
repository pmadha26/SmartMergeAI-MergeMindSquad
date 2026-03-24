/**
 * DEMO FILE: Testing All SmartMergeAI Validation Features
 * This file intentionally contains various issues to demonstrate the validator
 */

import { IbmIccReturnService } from 'packages/return-search/src/app/features/return/services/ibm-icc-return.service';
import { SummaryNotesPanelComponent } from '@call-center/return-shared';
import { ReturnSearchComponent } from 'call-center-return/packages/return-search/src/app/features/return/return-search/return-search.component';
import { ItemImageComponent } from '@call-center/return-shared';



// ❌ TEST 2: TYPO DETECTION - SERVICE should be SERVICE,
        const API_SERIVCE_URL = 'https://api.example.com';

// ❌ TEST 3: TYPO DETECTION - RETURN should be RETURN,
        const RETUNR_STATUS = 'pending';

export class AppCustomizationImpl {
    // ❌ TEST 4: MISSING IMPORT - TestComponent not imported,
        static readonly components = [
        SummaryNotesPanelComponent,
        ReturnSearchComponent,// ❌ TEST 1: MISSING FILE - Wrong path (doesn't exist)
        ItemImageComponent,
        TestComponent,  // Missing import,
        AnotherMissingComponent  // Missing import
    ];

    // ❌ TEST 5: MISSING IMPORT - TestService not imported,
        static readonly providers = [
        TestService,  // Missing import,
        MissingProviderService,  // Missing import,
        IbmIccReturnService
    ];

    static readonly imports = [];

}

