import { provideZonelessChangeDetection } from '@angular/core';

/** Providers added to every TestBed (see `providersFile` in angular.json). */
const testProviders = [provideZonelessChangeDetection()];

export default testProviders;
