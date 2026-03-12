import { Modal, App, TFile, Notice } from 'obsidian';

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

            // Ignore button
            const ignoreButton = fileItem.createEl('button', { text: '忽略此文件' });
            ignoreButton.addClass('ignore-button');
            ignoreButton.style.marginLeft = 'auto';
            ignoreButton.addEventListener('click', async () => {
                try {
                    // Get the plugin instance
                    const plugin = (this.app as any).plugins.plugins['oz-clear-unused-images'];
                    if (plugin) {
                        // Add file path to excludedFiles array
                        if (!plugin.settings.excludedFiles.includes(file.path)) {
                            plugin.settings.excludedFiles.push(file.path);
                            await plugin.saveSettings();
                            
                            new Notice(`已忽略文件：${file.path}`);
                            
                            // Close the modal and reopen it with updated file list
                            myModal.close();
                            
                            // Filter out the ignored file and show updated modal
                            const updatedFiles = this.unusedFiles.filter(f => f.path !== file.path);
                            if (updatedFiles.length > 0) {
                                const newModal = new SelectiveDeleteModal(updatedFiles, this.app);
                                newModal.open();
                            } else {
                                new Notice('所有文件都已被忽略或移除');
                            }
                        } else {
                            new Notice('该文件已在忽略列表中');
                        }
                    } else {
                        new Notice('无法找到插件实例');
                        console.error('Plugin instance not found. Plugin ID: oz-clear-unused-images');
                    }
                } catch (error) {
                    console.error('Error ignoring file:', error);
                    new Notice(`忽略文件时出错：${error.message}`);
                }
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
                    new Notice(`Error deleting files: ${error.message}`);
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
        const plugin = (this.app as any).plugins.plugins['oz-clear-unused-images-obsidian'];
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

        new Notice(`Successfully deleted ${deletedCount} file(s).`);
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
