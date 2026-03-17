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

/**
 * Marker interface for entity
 */
export interface Entity {
    id: string;
    entity_type: string;
    rawData?: any;
}

export interface Item extends Entity {
    entity_type: 'item';
    id: string;
    name: string;
    isBundleItem: boolean;
    attributes: Array<Record<string, string>>;
}

export interface Organization extends Entity {
    entity_type: 'organization';
    organizationCode: string;
    organizationName: string;
}

export interface Amount { 
    value: string;
    currencyCode?: string;
}

export interface Customer extends Entity {
    entity_type: 'customer';
    givenName: string;
    surname?: string;
    middleName?: string;
    billToAddressId: string;
    shipToAddressId: string;
    email: string;
    phoneNo: string;
}

export interface EntityStore {
    byId: Record<string, Entity>,
    allIds: Array<string>,
};

export interface AppState {
    entities: Record<string, EntityStore>;
    uiState: Record<string, Record<string, any>>; // TODO: don't like any here. We should carve out a type for this
    configData: Record<string, Record<string, any>>;
}

export const INITIAL_STATE: AppState = {
    entities: {},
    uiState: {},
    configData: {}
};

export type SelectorFnParams = { params: Record<string, any>, entities: Record<string, Entity[]> } | Record<string, EntityStore>;
