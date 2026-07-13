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
  private fileService = inject(FilesApiService);
  private dataService = inject(ServicesApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  readonly codeEditor = viewChild<CodeEditorComponent>('codeeditor');

  myEditFilename = 'logging';
  readonly myTextarea = signal('');
  readonly myTextareaOrig = signal('');

  readonly editorHelp_display = signal(false);
  readonly error_display = signal(false);
  readonly myTextOutput = signal('');

  readonly saveResult = signal<LoggingConfigSaveResult | null>(null);

  ngOnInit() {
    this.titleService.setTitle(this.translate.instant('MENU.LOGGING_CONFIGURATION'));

    this.fileService
      .readFile('logging')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response2) => {
          this.myTextarea.set(response2);
          this.myTextareaOrig.set(response2);
        },
        error: () => {
          // error already logged by the service; nothing to update here
        },
      });
  }

  saveConfig() {
    this.saveResult.set(null);

    this.dataService
      .CheckYamlText(this.myTextarea())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput.set(response as string);
        if (this.myTextOutput().startsWith('ERROR:')) {
          this.error_display.set(true);
          return;
        }

        this.fileService
          .saveLoggingConfig(this.myTextarea())
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((result) => {
            this.saveResult.set(result);
            if (result.result === 'ok') {
              this.myTextareaOrig.set(this.myTextarea());
            }
          });
      });
  }
}
