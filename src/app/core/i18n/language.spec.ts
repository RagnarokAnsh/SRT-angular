import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Translation, type TranslocoLoader, provideTransloco } from '@jsverse/transloco';

import { LANGUAGE_STORAGE_KEY, LanguageService } from './language';

/** Each language answers with its text, fails, or waits until released. */
const answers: Record<string, () => Promise<Translation>> = {};

@Injectable()
class FakeLoader implements TranslocoLoader {
  getTranslation(lang: string): Promise<Translation> {
    return answers[lang]();
  }
}

const english = () => Promise.resolve({ hello: 'Hello' });
const hindi = () => Promise.resolve({ hello: 'नमस्ते' });
const failing = () => Promise.reject(new Error('Failed to fetch dynamically imported module'));

function setup(browserLanguages: string[] = ['en-IN']) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(browserLanguages);
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({
        config: {
          availableLangs: ['en', 'hi'],
          defaultLang: 'en',
          fallbackLang: 'en',
          missingHandler: { useFallbackTranslation: true, logMissingKey: false },
        },
        loader: FakeLoader,
      }),
    ],
  });
  return TestBed.inject(LanguageService);
}

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    answers['en'] = english;
    answers['hi'] = hindi;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("starts in the first of the browser's languages that the app has", async () => {
    const service = setup(['en-IN', 'hi-IN']);
    await service.init();
    expect(service.current()).toBe('en');

    TestBed.resetTestingModule();
    const hindiFirst = setup(['hi-IN', 'en']);
    await hindiFirst.init();
    expect(hindiFirst.current()).toBe('hi');
    expect(document.documentElement.lang).toBe('hi');
  });

  it('a saved choice wins over the browser', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'hi');
    const service = setup(['en-IN']);
    await service.init();
    expect(service.current()).toBe('hi');
  });

  it("falls back to English when Hindi can't be loaded at start, instead of showing English as Hindi", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'hi');
    answers['hi'] = failing;
    const service = setup();
    await service.init();
    expect(service.current()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps the current language when a switch fails', async () => {
    const service = setup();
    await service.init();
    answers['hi'] = failing;
    expect(await service.use('hi')).toBe(false);
    expect(service.current()).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('the last choice wins when an earlier one is still loading', async () => {
    const service = setup();
    await service.init();
    let release!: () => void;
    answers['hi'] = () => new Promise((resolve) => (release = () => resolve({ hello: 'नमस्ते' })));
    const toHindi = service.use('hi');
    expect(await service.use('en')).toBe(true);
    release();
    expect(await toHindi).toBe(false);
    expect(service.current()).toBe('en');
  });

  it('switches and remembers the choice', async () => {
    const service = setup();
    await service.init();
    expect(await service.use('hi')).toBe(true);
    expect(service.current()).toBe('hi');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('hi');
  });
});
