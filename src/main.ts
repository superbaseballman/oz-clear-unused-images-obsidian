import { Plugin, TFile, Notice } from 'obsidian';
import { OzanClearImagesSettingsTab } from './settings';
import { OzanClearImagesSettings, DEFAULT_SETTINGS } from './settings';
import { LogsModal, SelectiveDeleteModal } from './modals';
import * as Util from './util';

export default class OzanClearImages extends Plugin {
    settings: OzanClearImagesSettings;
    ribbonIconEl: HTMLElement | undefined = undefined;

    async onload() {
        console.log('Clear Unused Images plugin loaded...');
        this.addSettingTab(new OzanClearImagesSettingsTab(this.app, this));
        await this.loadSettings();
        this.addCommand({
            id: 'clear-images-obsidian',
            name: 'Clear Unused Images',
            callback: () => this.clearUnusedAttachments('image'),
        });
        this.addCommand({
            id: 'clear-unused-attachments',
            name: 'Clear Unused Attachments',
            callback: () => this.clearUnusedAttachments('all'),
        });
        this.refreshIconRibbon();
    }

    onunload() {
        console.log('Clear Unused Images plugin unloaded...');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    refreshIconRibbon = () => {
        this.ribbonIconEl?.remove();
        if (this.settings.ribbonIcon) {
            this.ribbonIconEl = this.addRibbonIcon('image-file', 'Clear Unused Images', (event): void => {
                this.clearUnusedAttachments('image');
            });
        }
    };

    // Compare Used Images with all images and return unused ones
    clearUnusedAttachments = async (type: 'all' | 'image') => {
        var unusedAttachments: TFile[] = await Util.getUnusedAttachments(this.app, type);
        
        // Filter out files that are in excluded folders
        const filteredUnusedAttachments = unusedAttachments.filter(file => {
            return !Util.fileIsInExcludedFolder(file, this);
        });
        
        var len = filteredUnusedAttachments.length;
        if (len > 0) {
            // Show the selective delete modal instead of immediately deleting
            const modal = new SelectiveDeleteModal(filteredUnusedAttachments, this.app);
            modal.open();
        } else {
            new Notice(`All ${type === 'image' ? 'images' : 'attachments'} are used or in excluded folders. Nothing was deleted.`);
        }
    };
}
