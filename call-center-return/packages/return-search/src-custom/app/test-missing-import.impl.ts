import { SampleSharedComponent } from './features/return/return-search/sampleshared.component';

// Test file to verify auto-fix bot detects missing imports
// This file uses SampleSharedComponent but doesn't import it
export class TestMissingImportImpl {
    // Using SampleSharedComponent without importing it
    static readonly components = [SampleSharedComponent];
    static readonly providers = [];
    static readonly imports = [];
}
// Made with Bob
