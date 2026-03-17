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

import { Optional, SkipSelf, ModuleWithProviders, NgModule } from '@angular/core';
import { CCNotificationService, ExtensionModule } from '@buc/common-components';
import { BreadcrumbService } from '../data-service/breadcrumb.service';
import { CommonService } from '../data-service/common-service.service';
import { ErrorHandlerService } from '../data-service/error-handler.service';
import { PaymentDataService } from '../data-service/payment-data.service';

@NgModule({
  declarations: [],
  imports: [ExtensionModule.forRoot()],
  exports: []
})
export class SharedRootProvidersModule {

  static forRoot(): ModuleWithProviders<SharedRootProvidersModule> {
    return {
      ngModule: SharedRootProvidersModule,
      providers: [
        CommonService,
        BreadcrumbService,
        CCNotificationService,
        ErrorHandlerService,
        PaymentDataService
      ]
    };
  }

  constructor(@Optional() @SkipSelf() parentModule: SharedRootProvidersModule) {
    if (parentModule) {
      throw new Error('SharedRootProvidersModule is already loaded. Import it in the AppModule or main module only');
    }
  }
}
