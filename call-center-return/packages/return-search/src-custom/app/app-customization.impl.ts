// TEST CASE 1: Missing import - SampleSharedComponent should be imported from @call-center/return-shared
// TEST CASE 2: Missing import - SummaryNotesPanelComponent should be imported from @call-center/return-shared
// TEST CASE 3: Wrong import - ItemImageComponent has wrong path
import { ItemImageComponent } from './wrong/path/item-image.component';
export class AppCustomizationImpl {
    static readonly components = [
        SampleSharedComponent,
        SummaryNotesPanelComponent,
        ItemImageComponent
    ];
    static readonly providers = [];
    static readonly imports = [];
}
// Made with Bob
