import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideStatsKit } from 'stats-kit/angular';
import { Demo } from './app/demo';

bootstrapApplication(Demo, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    // relative address (no leading slash): resolved against <base href>, so the demo also works under a sub-path
    provideStatsKit({ apiUrl: 'api/admin/audience', locale: 'en' }),
  ],
}).catch((e) => console.error(e));
