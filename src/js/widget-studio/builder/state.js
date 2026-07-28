/**
 * Widget Studio — Central Builder State
 */
import { FileSystem } from '../file-system/index.js';

export const state = {
    fs: new FileSystem(),
    openTabs: [],
    activeFileId: null,
    currentEditId: null,
    ctxTargetId: null,
    projectTreeOpen: true,
    importTargetParentId: null,
    suppressManifestSync: false,
};
