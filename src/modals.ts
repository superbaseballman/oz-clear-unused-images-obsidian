import { Modal, App, TFile } from 'obsidian';

export class LogsModal extends Modal {
    textToView: string;

    constructor(textToView: string, app: App) {
        super(app);
        this.textToView = textToView;
    }

    onOpen() {
        let { contentEl } = this;
        let myModal = this;

        // Header
        const headerWrapper = contentEl.createEl('div');
        headerWrapper.addClass('unused-images-center-wrapper');
        const headerEl = headerWrapper.createEl('h1', { text: 'Clear Unused Images - Logs' });
        headerEl.addClass('modal-title');

        // Information to show
        const logs = contentEl.createEl('div');
        logs.addClass('unused-images-logs');
        logs.innerHTML = this.textToView;

        // Close Button
        const buttonWrapper = contentEl.createEl('div');
        buttonWrapper.addClass('unused-images-center-wrapper');
        const closeButton = buttonWrapper.createEl('button', { text: 'Close' });
        closeButton.addClass('unused-images-button');
        closeButton.addEventListener('click', () => {
            myModal.close();
        });
    }
}

export class SelectiveDeleteModal extends Modal {
    unusedFiles: TFile[];
    app: App;

    constructor(unusedFiles: TFile[], app: App) {
        super(app);
        this.unusedFiles = unusedFiles;
        this.app = app;
    }

    onOpen() {
        let { contentEl } = this;
        let myModal = this;

        // Header
        const headerWrapper = contentEl.createEl('div');
        headerWrapper.addClass('unused-images-center-wrapper');
        const headerEl = headerWrapper.createEl('h1', { text: 'Unused Files - Selective Delete' });
        headerEl.addClass('modal-title');

        // File list container
        const fileListContainer = contentEl.createEl('div', { cls: 'unused-images-file-list' });
        fileListContainer.addClass('unused-images-logs');

        // Create checkboxes for each file
        this.unusedFiles.forEach((file, index) => {
            const fileItem = fileListContainer.createEl('div', { cls: 'unused-file-item' });
            fileItem.addClass('unused-file-item');

            // Checkbox
            const checkbox = fileItem.createEl('input', {
                type: 'checkbox',
                value: index.toString()
            });
            checkbox.addClass('file-checkbox');
            checkbox.checked = true; // Default to checked so all files would be deleted if user clicks "Delete Selected"

            // File name that is clickable to open the file
            const fileName = fileItem.createEl('span', { text: file.path });
            fileName.addClass('clickable-file-path');
            fileName.addEventListener('click', () => {
                // Try to open the file based on its type
                if (file.extension === 'md') {
                    // Open markdown file in the editor
                    this.app.workspace.getLeaf().openFile(file);
                } else {
                    // Open other file types using the default method
                    this.app.workspace.getLeaf().openFile(file);
                }
                // Optionally close the modal after opening the file
                // myModal.close();
            });
        });

        // Action Buttons
        const buttonWrapper = contentEl.createEl('div');
        buttonWrapper.addClass('unused-images-center-wrapper');
        buttonWrapper.addClass('modal-buttons');

        // Delete Selected Button
        const deleteButton = buttonWrapper.createEl('button', { text: 'Delete Selected' });
        deleteButton.addClass('unused-images-button');
        deleteButton.addClass('delete-button');
        deleteButton.addEventListener('click', async () => {
            const checkboxes = fileListContainer.querySelectorAll<HTMLInputElement>('.file-checkbox');
            const filesToDelete: TFile[] = [];
            checkboxes.forEach((checkbox, index) => {
                if (checkbox.checked) {
                    filesToDelete.push(this.unusedFiles[index]);
                }
            });

            if (filesToDelete.length > 0) {
                try {
                    // Perform deletion directly without confirmation
                    await this.deleteSelectedFiles(filesToDelete);
                } catch (error) {
                    console.error('Error deleting files:', error);
                    new (this.app as any).Notices(`Error deleting files: ${error.message}`);
                } finally {
                    // Always close the modal after attempting to delete
                    myModal.close();
                }
            } else {
                alert('No files selected for deletion.');
            }
        });

        // Select All/None Button
        const selectAllButton = buttonWrapper.createEl('button', { text: 'Select All' });
        selectAllButton.addClass('unused-images-button');
        selectAllButton.addClass('select-button');
        let isSelectingAll = true;
        selectAllButton.addEventListener('click', () => {
            const checkboxes = fileListContainer.querySelectorAll<HTMLInputElement>('.file-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = isSelectingAll;
            });
            selectAllButton.textContent = isSelectingAll ? 'Select None' : 'Select All';
            isSelectingAll = !isSelectingAll;
        });

        // Cancel Button
        const cancelButton = buttonWrapper.createEl('button', { text: 'Cancel' });
        cancelButton.addClass('unused-images-button');
        cancelButton.addClass('cancel-button');
        cancelButton.addEventListener('click', () => {
            myModal.close();
        });
    }

    async deleteSelectedFiles(filesToDelete: TFile[]) {
        const plugin = (this.app as any).plugins.plugins['oz-clear-unused-images'];
        const deleteOption = plugin?.settings.deleteOption || '.trash';

        // Import the fileIsInExcludedFolder function to respect exclusion settings
        const { fileIsInExcludedFolder } = await import('./util');

        let deletedCount = 0;
        for (const file of filesToDelete) {
            // Check if the file is in an excluded folder before deleting
            if (fileIsInExcludedFolder(file, plugin)) {
                console.log('File not referenced but excluded: ' + file.path);
                continue; // Skip this file, it's in an excluded folder
            }

            if (deleteOption === '.trash') {
                await this.app.vault.trash(file, false);
            } else if (deleteOption === 'system-trash') {
                await this.app.vault.trash(file, true);
            } else if (deleteOption === 'permanent') {
                await this.app.vault.delete(file);
            }
            deletedCount++;
        }

        new (this.app as any).Notices(`Successfully deleted ${deletedCount} file(s).`);
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
