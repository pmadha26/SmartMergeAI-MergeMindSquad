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

import { BaseEnvironment } from '@call-center/return-shared';
import { BucCommonClassesApplicationDeploymentModeEnum } from '@buc/svc-angular';

class OnPremEnvironment extends BaseEnvironment {
  applicationDeploymentMode = BucCommonClassesApplicationDeploymentModeEnum.ON_PREM;
  routeName = 'return-search';
  production = true;
}

export const environment = new OnPremEnvironment();
