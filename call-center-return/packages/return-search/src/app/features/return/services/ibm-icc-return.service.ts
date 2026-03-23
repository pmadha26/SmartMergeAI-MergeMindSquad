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
        const inputXml = this.buildReturnOrderXml(returnOrderKey, returnLines);

        return this.bucCommOmsRestAPIService.post(
            `/services/${this.SERVICE_NAME}/${this.RETURN_DETAILS_API}`,
            inputXml,
            {
                headers: {
                    'Content-Type': 'application/xml'
                }
            }
        ).pipe(
            map(response => this.parseReturnOrderResponse(response))
        );
    }

    /**
     * Validate return eligibility for an order
     * @param orderHeaderKey The order header key
     * @returns Observable with validation results
     */
    public validateReturnEligibility(orderHeaderKey: string): Observable<any> {
        const inputXml = this.buildValidationXml(orderHeaderKey);

        return this.bucCommOmsRestAPIService.post(
            `/services/${this.SERVICE_NAME}/${this.VALIDATE_ELIGIBILITY_API}`,
            inputXml,
            {
                headers: {
                    'Content-Type': 'application/xml'
                }
            }
        ).pipe(
            map(response => this.parseValidationResponse(response))
        );
    }

    /**
     * Get return order details with enhanced information
     * @param returnOrderKey The return order key
     * @returns Promise with return order details
     */
    public async getReturnOrderDetails(returnOrderKey: string): Promise<any> {
        try {
            const returnLines = await this.fetchReturnLines(returnOrderKey);
            return this.invokeReturnOrderDetails(returnOrderKey, returnLines).toPromise();
        } catch (error) {
            console.error('Error fetching return order details:', error);
            throw error;
        }
    }

    /**
     * Build XML input for return order processing
     * @param returnOrderKey The return order key
     * @param returnLines Array of return lines
     * @returns XML string
     */
    private buildReturnOrderXml(returnOrderKey: string, returnLines: any[]): string {
        let xml = `<ReturnOrder ReturnOrderKey="${returnOrderKey}">`;
        xml += '<ReturnLines>';

        returnLines.forEach(line => {
            xml += `<ReturnLine ReturnLineKey="${line.returnLineKey}">`;
            if (line.orderLineKey) {
                xml += `<OrderLineKey>${line.orderLineKey}</OrderLineKey>`;
            }
            if (line.quantity) {
                xml += `<Quantity>${line.quantity}</Quantity>`;
            }
            xml += '</ReturnLine>';
        });

        xml += '</ReturnLines>';
        xml += '</ReturnOrder>';

        return xml;
    }

    /**
     * Build XML input for return eligibility validation
     * @param orderHeaderKey The order header key
     * @returns XML string
     */
    private buildValidationXml(orderHeaderKey: string): string {
        return `<Order OrderHeaderKey="${orderHeaderKey}"/>`;
    }

    /**
     * Parse return order response from XML
     * @param response XML response
     * @returns Parsed object
     */
    private parseReturnOrderResponse(response: any): any {
        // Parse XML response and convert to JSON object,// This is a simplified implementation - actual parsing would depend on XML structure
        return {
            success: true,
            returnOrder: response,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Parse validation response from XML
     * @param response XML response
     * @returns Parsed validation object
     */
    private parseValidationResponse(response: any): any {
        // Parse XML response and convert to JSON object,
        return {
            isEligible: response?.IsEligible === 'Y',
            validationMessage: response?.ValidationMessage || '',
            orderHeaderKey: response?.OrderHeaderKey || ''
        };
    }

    /**
     * Fetch return lines for a given return order
     * @param returnOrderKey The return order key
     * @returns Promise with return lines array
     */
    private async fetchReturnLines(returnOrderKey: string): Promise<any[]> {
        // This would typically call another API to fetch return lines,// Placeholder implementation
        return [];
    }

    /**
     * Process return adjustments for a return line
     * @param returnLineKey The return line key
     * @returns Observable with adjustment details
     */
    public processReturnAdjustments(returnLineKey: string): Observable<any> {
        return this.bucCommOmsRestAPIService.get(
            `/returns/lines/${returnLineKey}/adjustments`
        );
    }

    /**
     * Get return reasons for a return line
     * @param returnLineKey The return line key
     * @returns Observable with return reasons
     */
    public getReturnReasons(returnLineKey: string): Observable<any> {
        return this.bucCommOmsRestAPIService.get(
            `/returns/lines/${returnLineKey}/reasons`
        );
    }
}

// Made with Bob
