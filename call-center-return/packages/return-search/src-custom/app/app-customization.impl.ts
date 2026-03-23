import { SampleSharedComponent } from './features/return/return-search/sampleshared.component';

// Test: SampleSharedComponent should import from @call-center/return-shared
export class AppCustomizationImpl {
    static readonly components = [];
    static readonly providers = [SampleSharedComponent];
    static readonly imports = [];
}
