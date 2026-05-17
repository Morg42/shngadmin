import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

import { Title } from '@angular/platform-browser';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { Bind } from 'primeng/bind';
import { Ripple } from 'primeng/ripple';
import { SceneInfo } from '../../common/models/scene-info';
import { SystemInfo } from '../../common/models/system-info';
import { LogService } from '../../common/services/log.service';
import { ScenesApiService } from '../../common/services/scenes-api.service';

@Component({
  selector: 'app-scenes',
  templateUrl: './scenes.component.html',
  styleUrls: ['./scenes.component.css'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Accordion,
    AccordionPanel,
    Ripple,
    AccordionHeader,
    AccordionContent,
    TranslatePipe,
  ],
})
export class ScenesComponent implements OnInit {
  sceneList: SceneInfo[] = [];

  systeminfo: SystemInfo = <SystemInfo>{};

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private messageService = inject(MessageService);
  private dataService = inject(ScenesApiService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.log.log('ScenesComponent.ngOnInit');
    this.setTitle(this.translate.instant('MENU.SCENE_LIST'));

    this.dataService
      .getScenes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.sceneList = response as SceneInfo[];
        //          this.schedulerinfo.sort(function (a, b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)});
        this.log.log('getScenes', { response });
        this.cdr.markForCheck();
      });
  }
}
