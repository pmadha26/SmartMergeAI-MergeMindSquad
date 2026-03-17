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

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { BucCommonClassesAbstractEnvironmentClazz,
  BucCommonClassesApplicationDeploymentModeEnum,
  BucCommonClassesApplicationExecutionModeEnum, 
  BucConstants} from '@buc/svc-angular';


export class BaseEnvironment extends BucCommonClassesAbstractEnvironmentClazz {
  production = false;
  channelAppName = BucConstants.CALL_CENTER;
  applicationDeploymentMode = BucCommonClassesApplicationDeploymentModeEnum.ON_PREM;
  applicationExecutionMode = BucCommonClassesApplicationExecutionModeEnum.SINGLE_SPA;
  customization = false;
  moduleName = 'call-center-return';
  routeName = '';
}

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
