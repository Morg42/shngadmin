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

import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { CodeEditorComponent } from '../../common/components/code-editor/code-editor.component';
import { FilesApiService } from '../../common/services/files-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';

@Component({
  selector: 'app-struct-configuration',
  templateUrl: './struct-configuration.component.html',
  styleUrls: ['./struct-configuration.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    ButtonDirective,
    CodeEditorComponent,
    FormsModule,
    Dialog,
    PrimeTemplate,
    TranslatePipe,
  ],
})
export class StructConfigurationComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private fileService = inject(FilesApiService);
  private dataService = inject(ServicesApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  @ViewChild('codeeditor') codeEditor?: CodeEditorComponent;

  myEditFilename!: string;
  myTextarea = '';
  myTextareaOrig = '';

  editorHelp_display = false;
  error_display = false;
  myTextOutput = '';

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // console.log('LoggingConfigurationComponent.ngOnInit');

    this.setTitle(this.translate.instant('ITEMS.STRUCT_CONFIGFILE'));

    this.myEditFilename = 'struct';

    this.fileService
      .readFile('structs')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextarea = response;
        this.myTextareaOrig = response;
        this.cdr.markForCheck();
      });
  }

  saveConfig() {
    // console.log('LoggingConfigurationComponent.saveConfig');

    this.dataService
      .CheckYamlText(this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput = response as string;
        if (this.myTextarea !== '' && this.myTextOutput.startsWith('ERROR:')) {
          this.error_display = true;
        } else {
          this.fileService
            .saveFile('structs', '', this.myTextarea)
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
