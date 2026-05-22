import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
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
  ],
})
export class ItemConfigurationComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private fileService = inject(FilesApiService);
  private dataService = inject(ServicesApiService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);
  private readonly messageService = inject(MessageService);

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  @ViewChild('codeeditor') codeEditor?: CodeEditorComponent;

  filelist!: string[];
  itemFiles!: SelectItem[];
  selectedItemfile!: SelectItem;

  myEditFilename = '';
  myTextarea = '';
  myTextareaOrig = '';

  cmReadOnly = true;

  editorHelp_display = false;
  error_display = false;
  myTextOutput = '';
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

    this.itemFiles = [];

    this.setTitle(this.translate.instant('MENU.ITEM_CONFIGURATION'));
    this.fileService
      .getfileList('items')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.filelist = <string[]>response;
        for (let i = 0; i < this.filelist.length; i++) {
          //
          // I get it. The sample code here and in the docs is wrong, it should read like this:
          //
          // fails
          //   this.cities.push({name:'New York', code: 'NY'});
          //
          // correct
          //   this.cities = [...this.cities, {name:'New York', code: 'NY'}];
          //
          this.itemFiles = [
            ...this.itemFiles,
            <SelectItem>{ label: this.filelist[i], value: this.filelist[i] },
          ];
        }
        this.cdr.markForCheck();
      });
    // this.getItemFile('q21_09Bad');
  }

  newConfig() {
    this.newFilename = '';
    this.newconfig_display = true;
  }

  deleteConfig() {
    this.delete_param = { config: this.myEditFilename };
    this.confirmdelete_display = true;
  }

  DeleteConfigConfirm() {
    // this.log.log('ItemConfigurationComponent.DeleteConfigConfirm:');

    // close confirm dialog
    this.confirmdelete_display = false;

    // delete on backend server
    this.fileService
      .deleteFile('items', this.myEditFilename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response: unknown) => {
        if (response) {
          // close configuration dialog
          this.confirmdelete_display = false;
          this.log.log('ItemConfigurationComponent.DeleteConfigConfirm(): call ngOnInit()');
          this.ngOnInit();
          //            this.restart_core_button = true;
          this.cdr.markForCheck();
        }
      });

    return true;
  }

  checkInput() {
    this.fileExists = false;
    this.add_enabled = false;
    if (this.newFilename.length > 0) {
      this.add_enabled = true;
      for (const filenno in this.filelist) {
        const fn = this.filelist[filenno].slice(0, -5); // '.yaml' = 5 chars
        if (this.newFilename === fn) {
          this.add_enabled = false;
          this.fileExists = true;
        }
      }
    }
  }

  addFile() {
    this.newconfig_display = false;

    this.myTextarea = '# ' + this.newFilename + '.yaml\n';
    this.myTextareaOrig = this.myTextarea;
    this.myEditFilename = this.newFilename;
    this.cmReadOnly = false;

    this.fileService
      .createFile('items', this.myEditFilename, this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.myTextareaOrig = this.myTextarea;
          this.itemFiles = [];
          this.fileService
            .getfileList('items')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => {
              this.filelist = <string[]>response;
              for (let i = 0; i < this.filelist.length; i++) {
                this.itemFiles = [
                  ...this.itemFiles,
                  <SelectItem>{ label: this.filelist[i], value: this.filelist[i] },
                ];
              }
              this.cdr.markForCheck();
            });
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (err?.status === 409) {
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.instant('COMMON.FILE_EXISTS_TITLE'),
              detail: this.translate.instant('COMMON.FILE_EXISTS_HINT', {
                filename: this.myEditFilename,
              }),
              life: 5000,
            });
          }
          this.myEditFilename = '';
          this.myTextarea = '';
          this.cmReadOnly = true;
          this.cdr.markForCheck();
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
      this.myEditFilename = '';
      this.myTextarea = '';
      this.cmReadOnly = true;
      this.myTextarea = this.translate.instant('ITEM_CONFIG.FILETYPE_UNSUPPORTED');
    }
  }

  getItemFile(filename: string) {
    this.myEditFilename = '';
    this.myTextarea = '';
    this.cmReadOnly = true;
    if (filename === '') {
      return;
    }

    this.fileService
      .readFile('items', filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextarea = response;
        this.myTextareaOrig = response;
        if (this.myTextarea === '') {
          this.myTextarea = this.translate.instant('ITEM_CONFIG.FILE_NOT_FOUND');
        } else {
          this.myEditFilename = filename;
          this.cmReadOnly = false;
        }
        this.cdr.markForCheck();
      });
  }

  saveConfig() {
    // this.log.log('LoggingConfigurationComponent.saveConfig');

    this.dataService
      .CheckYamlText(this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput = response as string;
        if (this.myTextOutput.startsWith('ERROR:')) {
          this.error_display = true;
        } else {
          this.fileService
            .saveFile('items', this.myEditFilename, this.myTextarea)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response2) => {
              this.myTextareaOrig = this.myTextarea;
              this.cdr.markForCheck();
            });
        }
        this.cdr.markForCheck();
      });
  }
}
