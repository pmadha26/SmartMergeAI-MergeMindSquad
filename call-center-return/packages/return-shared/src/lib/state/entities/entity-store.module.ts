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

import { ModuleWithProviders, NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { EntityStoreService } from './entity-store.service';
import { entityReducer } from './entity.reducer';
import { MashupResponseMapper, MashupResponseProcessorService, MASHUP_RESPONSE_MAPPERS } from '../mashup/mashup-rsp-processor.service';
import { MashupEffects } from '../mashup/mashup.effects';

@NgModule({
    imports: [
        StoreModule.forFeature('entities', entityReducer),
        EffectsModule.forFeature([
            MashupEffects
        ])
    ]
})
export class EntityStoreModule { 
    static forRoot(responseMappers: Record<string, MashupResponseMapper> = {}): ModuleWithProviders<EntityStoreModule> {
        return {
            ngModule: EntityStoreModule,
            providers: [
                EntityStoreService,
                MashupResponseProcessorService,
                {
                    provide: MASHUP_RESPONSE_MAPPERS,
                    useValue: responseMappers,
                    multi: true
                },
                MashupEffects,
            ]
        };
    }
}
