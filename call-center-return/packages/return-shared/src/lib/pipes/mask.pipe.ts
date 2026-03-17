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

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bucMask'
})
export class BucMaskPipe implements PipeTransform {

  transform(value: any, maskLength = 8, displayLength = 4): unknown {
    // with show mask toggle  (for non title/title display)
    if(value.length <= 4){
      return value
    }

    const mask = '*'.repeat(maskLength);
    return mask + value.slice(value.length - displayLength);
  }

}
