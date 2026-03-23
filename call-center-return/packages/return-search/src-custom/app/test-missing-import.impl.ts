import { SampleSharedComponent } from './features/return/return-search/sampleshared.component';

// Test file to verify auto-fix bot detects missing imports
// This file uses SampleSharedComponent but doesn't import it correctly
export class TestMissingImportImpl {
    // Using SampleSharedComponent - should suggest @call-center/return-shared
    static readonly components = [SampleSharedComponent];
    static readonly providers = [];
    static readonly imports = [];
}
