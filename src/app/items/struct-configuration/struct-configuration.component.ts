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
  selector: 'app-struct-configuration',
  templateUrl: './struct-configuration.component.html',
  styleUrls: ['./struct-configuration.component.css'],
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
export class StructConfigurationComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private fileService = inject(FilesApiService);
  private dataService = inject(ServicesApiService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);
  private readonly messageService = inject(MessageService);

  @ViewChild('codeeditor') codeEditor?: CodeEditorComponent;

  filelist!: string[];
  structFiles!: SelectItem[];
  selectedStructfile!: SelectItem;
  structsDir = './structs'; // updated from backend on init

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

  confirmdelete_display = false;
  delete_param!: {};

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.getStructFile('');

    this.structFiles = [];

    this.setTitle(this.translate.instant('MENU.ITEM_STRUCT_CONFIGURATION'));
    this.fileService
      .getfileList('structs')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const r = response as { dir: string; files: string[] };
        this.structsDir = r.dir;
        this.filelist = r.files;
        this.structFiles = this.filelist.map((fn) => <SelectItem>{ label: fn, value: fn });
        this.cdr.markForCheck();
      });
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
    this.confirmdelete_display = false;

    this.fileService
      .deleteFile('structs', this.myEditFilename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.myEditFilename = '';
        this.myTextarea = '';
        this.cmReadOnly = true;
        this.ngOnInit();
        this.cdr.markForCheck();
      });

    return true;
  }

  checkInput() {
    this.fileExists = false;
    this.add_enabled = false;
    if (this.newFilename.length > 0) {
      this.add_enabled = true;
      for (const fileNo in this.filelist) {
        const fn = this.filelist[fileNo].slice(0, -5); // strip '.yaml'
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
      .createFile('structs', this.myEditFilename, this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.myTextareaOrig = this.myTextarea;
          this.structFiles = [];
          this.fileService
            .getfileList('structs')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => {
              const r = response as { dir: string; files: string[] };
              this.structsDir = r.dir;
              this.filelist = r.files;
              this.structFiles = this.filelist.map((fn) => <SelectItem>{ label: fn, value: fn });
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

  structFileSelected() {
    let filename = this.selectedStructfile.value;
    if (filename.toLowerCase().endsWith('.yaml')) {
      filename = filename.slice(0, -5);
      this.getStructFile(filename);
    } else {
      this.myEditFilename = '';
      this.myTextarea = '';
      this.cmReadOnly = true;
      this.myTextarea = this.translate.instant('STRUCT_CONFIG.FILETYPE_UNSUPPORTED');
    }
  }

  getStructFile(filename: string) {
    this.myEditFilename = '';
    this.myTextarea = '';
    this.cmReadOnly = true;
    if (filename === '') {
      return;
    }

    this.fileService
      .readFile('structs', filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextarea = response;
        this.myTextareaOrig = response;
        if (this.myTextarea === '') {
          this.myTextarea = this.translate.instant('STRUCT_CONFIG.FILE_NOT_FOUND');
        } else {
          this.myEditFilename = filename;
          this.cmReadOnly = false;
        }
        this.cdr.markForCheck();
      });
  }

  saveConfig() {
    this.dataService
      .CheckYamlText(this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput = response as string;
        if (this.myTextOutput.startsWith('ERROR:')) {
          this.error_display = true;
        } else {
          this.fileService
            .saveFile('structs', this.myEditFilename, this.myTextarea)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.myTextareaOrig = this.myTextarea;
              this.cdr.markForCheck();
            });
        }
        this.cdr.markForCheck();
      });
  }
}
