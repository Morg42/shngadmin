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
import { Message } from 'primeng/message';
import { CodeEditorComponent } from '../../common/components/code-editor/code-editor.component';
import { FilesApiService, LoggingConfigSaveResult } from '../../common/services/files-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';

@Component({
  selector: 'app-logging-configuration',
  templateUrl: './logging-configuration.component.html',
  styleUrls: ['./logging-configuration.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    ButtonDirective,
    CodeEditorComponent,
    FormsModule,
    Dialog,
    Message,
    PrimeTemplate,
    TranslatePipe,
  ],
})
export class LoggingConfigurationComponent implements OnInit {
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

  saveResult: LoggingConfigSaveResult | null = null;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // console.log('LoggingConfigurationComponent.ngOnInit');

    this.myEditFilename = 'logging';

    this.setTitle(this.translate.instant('MENU.LOGGING_CONFIGURATION'));

    this.fileService
      .readFile('logging')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response2) => {
        this.myTextarea = response2;
        this.myTextareaOrig = response2;
        this.cdr.markForCheck();
      });
  }

  saveConfig() {
    this.saveResult = null;

    this.dataService
      .CheckYamlText(this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput = response as string;
        if (this.myTextOutput.startsWith('ERROR:')) {
          this.error_display = true;
          this.cdr.markForCheck();
          return;
        }

        this.fileService
          .saveLoggingConfig(this.myTextarea)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((result) => {
            this.saveResult = result;
            if (result.result === 'ok') {
              this.myTextareaOrig = this.myTextarea;
            }
            this.cdr.markForCheck();
          });
      });
  }
}
