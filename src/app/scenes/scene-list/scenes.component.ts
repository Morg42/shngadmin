import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Title } from '@angular/platform-browser';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { Bind } from 'primeng/bind';
import { Ripple } from 'primeng/ripple';
import { map, tap } from 'rxjs/operators';
import { SceneInfo } from '../../common/models/scene-info';
import { LogService } from '../../common/services/log.service';
import { ScenesApiService } from '../../common/services/scenes-api.service';

@Component({
  selector: 'app-scenes',
  templateUrl: './scenes.component.html',
  styleUrls: ['./scenes.component.css'],
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
  private translate = inject(TranslateService);
  private dataService = inject(ScenesApiService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  /** Scene list as a signal; the API service returns of({}) on error, so
   *  normalize anything non-array to an empty list. */
  readonly sceneList = toSignal(
    this.dataService.getScenes().pipe(
      tap((response) => this.log.log('getScenes', { response })),
      map((response) => (Array.isArray(response) ? (response as SceneInfo[]) : [])),
    ),
    { initialValue: [] as SceneInfo[] },
  );

  ngOnInit() {
    this.log.log('ScenesComponent.ngOnInit');
    this.titleService.setTitle(this.translate.instant('MENU.SCENE_LIST'));
  }
}
