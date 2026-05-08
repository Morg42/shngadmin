import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgOptimizedImage,
    TranslateModule.forChild(),
  ],
  exports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgOptimizedImage,
    TranslateModule,
  ],
})
export class SharedModule {}
