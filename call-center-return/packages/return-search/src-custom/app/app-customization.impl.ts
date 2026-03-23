import { NewExampleComponent } from './features/return/return-search/newexample.component';

// Test file - NewExampleComponent should be detected as missing import
export class AppCustomizationImpl {
    static readonly components = [];
    static readonly providers = [NewExampleComponent];
    static readonly imports = [];
}
