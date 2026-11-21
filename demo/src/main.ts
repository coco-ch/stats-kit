import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideStatsKit } from 'stats-kit/angular';
import { Demo } from './app/demo';

bootstrapApplication(Demo, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideStatsKit({ apiUrl: '/api/admin/audience', locale: 'en' }),
  ],
}).catch((e) => console.error(e));
