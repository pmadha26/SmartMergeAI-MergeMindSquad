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

import { Component, OnInit } from '@angular/core';
import { IbmIccReturnService } from '../services/ibm-icc-return.service';

/**
 * Example component demonstrating usage of IBM ICC Return Service
 * This component shows how to integrate the Java backend service
 * with the Angular frontend application
 */
@Component({
    selector: 'app-return-service-example',
    template: `
        <div class="return-service-example">
            <h2>IBM ICC Return Service Example</h2>
            
            <div class="validation-section">
                <h3>Validate Return Eligibility</h3>
                <input 
                    type="text" 
                    [(ngModel)]="orderHeaderKey" 
                    placeholder="Enter Order Header Key"
                />
                <button (click)="validateReturn()">Validate</button>
                
                <div *ngIf="validationResult" class="result">
                    <p><strong>Eligible:</strong> {{ validationResult.isEligible ? 'Yes' : 'No' }}</p>
                    <p><strong>Message:</strong> {{ validationResult.validationMessage }}</p>
                </div>
            </div>
            
            <div class="return-details-section">
                <h3>Get Return Order Details</h3>
                <input 
                    type="text" 
                    [(ngModel)]="returnOrderKey" 
                    placeholder="EXTN_RETURN_SERVICE.RETURN_ORDER_KEY  | translate"
                />
                <button (click)="getReturnDetails()">Get Details</button>
                
                <div *ngIf="returnDetails" class="result">
                    <p><strong>Success:</strong> {{ returnDetails.success ? 'Yes' : 'No' }}</p>
                    <p><strong>Timestamp:</strong> {{ returnDetails.timestamp }}</p>
                    <pre>{{ returnDetails.returnOrder | json }}</pre>
                </div>
            </div>
            
            <div class="error-section" *ngIf="errorMessage">
                <p class="error">{{ errorMessage }}</p>
            </div>
        </div>
    `,
    styles: [`
        .return-service-example {
            padding: 20px;
            font-family: Arial, sans-serif;
        }
        
        .validation-section,
        .return-details-section {
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        
        h2 {
            color: #333;
            margin-bottom: 20px;
        }
        
        h3 {
            color: #555;
            margin-bottom: 15px;
        }
        
        input {
            padding: 8px;
            margin-right: 10px;
            width: 300px;
            border: 1px solid #ccc;
            border-radius: 3px;
        }
        
        button {
            padding: 8px 16px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        
        button:hover {
            background-color: #0056b3;
        }
        
        .result {
            margin-top: 15px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 3px;
        }
        
        .error {
            color: #dc3545;
            font-weight: bold;
        }
        
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
        }
    `]
})
export class ReturnServiceExampleComponent implements OnInit {
    
    orderHeaderKey: string = '';
    returnOrderKey: string = '';
    validationResult: any = null;
    returnDetails: any = null;
    errorMessage: string = '';

    constructor(
        private ibmIccReturnService: IbmIccReturnService
    ) {}

    ngOnInit(): void {
        console.log('ReturnServiceExampleComponent initialized');
    }

    /**
     * Validate return eligibility for the entered order
     */
    validateReturn(): void {
        if (!this.orderHeaderKey) {
            this.errorMessage = 'Please enter an Order Header Key';
            return;
        }

        this.errorMessage = '';
        this.validationResult = null;

        this.ibmIccReturnService.validateReturnEligibility(this.orderHeaderKey)
            .subscribe({
                next: (result) => {
                    this.validationResult = result;
                    console.log('Validation result:', result);
                },
                error: (error) => {
                    this.errorMessage = `Error validating return: ${error.message}`;
                    console.error('Validation error:', error);
                }
            });
    }

    /**
     * Get return order details for the entered return order key
     */
    getReturnDetails(): void {
        if (!this.returnOrderKey) {
            this.errorMessage = 'Please enter a Return Order Key';
            return;
        }

        this.errorMessage = '';
        this.returnDetails = null;

        // Example return lines - in real scenario, these would come from user input or another API
        const sampleReturnLines = [
            {
                returnLineKey: 'RL001',
                orderLineKey: 'OL001',
                quantity: 1
            },
            {
                returnLineKey: 'RL002',
                orderLineKey: 'OL002',
                quantity: 2
            }
        ];

        this.ibmIccReturnService.invokeReturnOrderDetails(this.returnOrderKey, sampleReturnLines)
            .subscribe({
                next: (result) => {
                    this.returnDetails = result;
                    console.log('Return details:', result);
                },
                error: (error) => {
                    this.errorMessage = `Error fetching return details: ${error.message}`;
                    console.error('Return details error:', error);
                }
            });
    }

    /**
     * Example method showing how to use the service programmatically
     */
    async exampleProgrammaticUsage(): Promise<void> {
        try {
            // Example 1: Validate return eligibility
            const validation = await this.ibmIccReturnService
                .validateReturnEligibility('ORDER123')
                .toPromise();
            
            if (validation.isEligible) {
                console.log('Return is eligible:', validation.validationMessage);
            }

            // Example 2: Get return order details
            const details = await this.ibmIccReturnService
                .getReturnOrderDetails('RETURN456');
            
            console.log('Return order details retrieved:', details);

            // Example 3: Process return adjustments
            const adjustments = await this.ibmIccReturnService
                .processReturnAdjustments('RL001')
                .toPromise();
            
            console.log('Return adjustments:', adjustments);

            // Example 4: Get return reasons
            const reasons = await this.ibmIccReturnService
                .getReturnReasons('RL001')
                .toPromise();
            
            console.log('Return reasons:', reasons);

        } catch (error) {
            console.error('Error in programmatic usage:', error);
        }
    }
}
