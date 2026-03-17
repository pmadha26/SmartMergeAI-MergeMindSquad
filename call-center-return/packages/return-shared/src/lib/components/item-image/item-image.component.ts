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

import { Component, Input, TemplateRef, ViewChild } from "@angular/core";
import { getDefaultImageUrl } from "../../functions";
import { ModalService } from "carbon-components-angular";
import { TranslateService } from "@ngx-translate/core";
import { CommonBinaryOptionModalComponent } from "@buc/common-components";
import { RelatedLine } from "../../state/types/return.interface";

@Component({
  selector: 'call-center-return-item-image:not([extn])',
  templateUrl: './item-image.component.html',
  styleUrls: ['./item-image.component.scss']
})
export class ItemImageComponent {

  @Input() public imageUrl: string;
  @Input() public itemDescription: string;
  @Input() public itemId: string;
  @Input() public primeLineNo: string;
  @Input() public isBundleParent: boolean;
  @Input() public isBundleComponent: boolean;
  @Input() public isDerviedFromBundleComponent: boolean;
  @Input() public itemDetailsTemplate: TemplateRef<any>;
  @Input() public relatedLines: RelatedLine[] = [];
  @Input() public parentLine: {lineNo: string, itemDesc: string} = {lineNo: '', itemDesc: ''};
  @Input() public kitCode: string;


  @ViewChild('relatedLinesTmpl', { static: false }) relatedLinesTemplate: TemplateRef<any>;
  componentId = 'ItemImageComponent';
  public defaultImageUrl: string = getDefaultImageUrl();

  constructor(private modalService: ModalService, private translate: TranslateService) {}

  openRelatedItemsModal() {
    const modalContent = this.relatedLines.map(i => ({
      lineNo: i.primeLineNo,
      itemName:  {
        itemImageUrl: i.itemImageUrl,
        itemId: i.itemId,
        itemDescription: i.itemDescription,
        defaultImageUrl: this.defaultImageUrl,
      },
    }))
    const modalData = {
      modalText: {
        header: this.translate.instant('RETURN_LINE.LABEL_RELATED_PRODUCTS_MODAL_HEADER', {
          lineNo: this.primeLineNo,
          itemDesc: this.itemDescription
        }),
        size: 'sm',
        className: 'relatedLines',
        template: this.relatedLinesTemplate,
        templateData: {
          modalContent,
      
        }
      },
      optionOne: {
        text: 'Close',
        cbValue: true,
        tid: 'close-related-products',
      },
      optionTwo : null
    };
    this.modalService.create({
      component: CommonBinaryOptionModalComponent,
      inputs: modalData
    });
  }
}
