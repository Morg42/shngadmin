import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService, PrimeTemplate, SelectItem } from 'primeng/api';

import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Listbox } from 'primeng/listbox';
import { CodeEditorComponent } from '../../common/components/code-editor/code-editor.component';
import { FileEditorLayoutComponent } from '../../common/components/file-editor-layout/file-editor-layout.component';
import { FilesApiService } from '../../common/services/files-api.service';
import { LogService } from '../../common/services/log.service';
import { ServicesApiService } from '../../common/services/services-api.service';

@Component({
  selector: 'app-item-configuration',
  templateUrl: './item-configuration.component.html',
  styleUrls: ['./item-configuration.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    ButtonDirective,
    Listbox,
    FormsModule,
    CodeEditorComponent,
    Dialog,
    PrimeTemplate,
    InputText,
    NgStyle,
    TranslatePipe,
    FileEditorLayoutComponent,
  ],
})
export class ItemConfigurationComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private fileService = inject(FilesApiService);
  private dataService = inject(ServicesApiService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);
  private readonly messageService = inject(MessageService);

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  readonly codeEditor = viewChild<CodeEditorComponent>('codeeditor');

  readonly filelist = signal<string[]>([]);
  readonly itemFiles = signal<SelectItem[]>([]);
  selectedItemfile!: SelectItem;

  readonly myEditFilename = signal('');
  readonly myTextarea = signal('');
  readonly myTextareaOrig = signal('');

  readonly cmReadOnly = signal(true);

  editorHelp_display = false;
  readonly error_display = signal(false);
  readonly myTextOutput = signal('');
  newconfig_display = false;
  newFilename = '';
  add_enabled = false;
  fileExists = false;

  confirmdelete_display: boolean = false;
  delete_param!: {};

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // this.log.log('LoggingConfigurationComponent.ngOnInit');

    this.getItemFile('');

    this.setTitle(this.translate.instant('MENU.ITEM_CONFIGURATION'));
    this.loadFileList();
  }

  private loadFileList() {
    this.fileService
      .getfileList('items')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const files = <string[]>response;
        this.filelist.set(files);
        this.itemFiles.set(files.map((f) => <SelectItem>{ label: f, value: f }));
      });
  }

  newConfig() {
    this.newFilename = '';
    this.newconfig_display = true;
  }

  deleteConfig() {
    this.delete_param = { config: this.myEditFilename() };
    this.confirmdelete_display = true;
  }

  DeleteConfigConfirm() {
    // this.log.log('ItemConfigurationComponent.DeleteConfigConfirm:');

    // close confirm dialog
    this.confirmdelete_display = false;

    // delete on backend server
    this.fileService
      .deleteFile('items', this.myEditFilename())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response: unknown) => {
        if (response) {
          // close configuration dialog
          this.confirmdelete_display = false;
          this.log.log('ItemConfigurationComponent.DeleteConfigConfirm(): call ngOnInit()');
          this.ngOnInit();
        }
      });

    return true;
  }

  checkInput() {
    this.fileExists = false;
    this.add_enabled = false;
    if (this.newFilename.length > 0) {
      this.add_enabled = true;
      for (const fname of this.filelist()) {
        const fn = fname.slice(0, -5); // '.yaml' = 5 chars
        if (this.newFilename === fn) {
          this.add_enabled = false;
          this.fileExists = true;
        }
      }
    }
  }

  addFile() {
    this.newconfig_display = false;

    const text = '# ' + this.newFilename + '.yaml\n';
    this.myTextarea.set(text);
    this.myTextareaOrig.set(text);
    this.myEditFilename.set(this.newFilename);
    this.cmReadOnly.set(false);

    this.fileService
      .createFile('items', this.myEditFilename(), this.myTextarea())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.myTextareaOrig.set(this.myTextarea());
          this.loadFileList();
        },
        error: (err) => {
          if (err?.status === 409) {
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.instant('COMMON.FILE_EXISTS_TITLE'),
              detail: this.translate.instant('COMMON.FILE_EXISTS_HINT', {
                filename: this.myEditFilename(),
              }),
              life: 5000,
            });
          }
          this.myEditFilename.set('');
          this.myTextarea.set('');
          this.cmReadOnly.set(true);
        },
      });
  }

  itemFileSelected() {
    let filename = this.selectedItemfile.value;
    if (filename.toLowerCase().endsWith('.yaml')) {
      filename = filename.slice(0, -5);
      // this.log.log('itemFileSelected()' , {filename});
      this.getItemFile(filename);
    } else {
      this.myEditFilename.set('');
      this.cmReadOnly.set(true);
      this.myTextarea.set(this.translate.instant('ITEM_CONFIG.FILETYPE_UNSUPPORTED'));
    }
  }

  getItemFile(filename: string) {
    this.myEditFilename.set('');
    this.myTextarea.set('');
    this.cmReadOnly.set(true);
    if (filename === '') {
      return;
    }

    this.fileService
      .readFile('items', filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.myTextarea.set(response);
          this.myTextareaOrig.set(response);
          this.myEditFilename.set(filename);
          this.cmReadOnly.set(false);
        },
        error: () => {
          this.myTextarea.set(this.translate.instant('ITEM_CONFIG.FILE_NOT_FOUND'));
        },
      });
  }

  saveConfig() {
    // this.log.log('LoggingConfigurationComponent.saveConfig');

    this.dataService
      .CheckYamlText(this.myTextarea())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput.set(response as string);
        if (this.myTextOutput().startsWith('ERROR:')) {
          this.error_display.set(true);
        } else {
          this.fileService
            .saveFile('items', this.myEditFilename(), this.myTextarea())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.myTextareaOrig.set(this.myTextarea());
            });
        }
      });
  }
}
