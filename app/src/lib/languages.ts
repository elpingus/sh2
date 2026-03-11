export interface AppLanguage {
  code: 'en' | 'tr' | 'de' | 'es' | 'pt' | 'pl' | 'ru';
  label: string;
  badge: string;
  icon: string;
}

export const APP_LANGUAGES: AppLanguage[] = [
  { code: 'en', label: 'English', badge: 'GB', icon: 'https://flagcdn.com/w40/gb.png' },
  { code: 'tr', label: 'Türkçe', badge: 'TR', icon: 'https://flagcdn.com/w40/tr.png' },
  { code: 'de', label: 'Deutsch', badge: 'DE', icon: 'https://flagcdn.com/w40/de.png' },
  { code: 'es', label: 'Español', badge: 'ES', icon: 'https://flagcdn.com/w40/es.png' },
  { code: 'pt', label: 'Português', badge: 'PT', icon: 'https://flagcdn.com/w40/pt.png' },
  { code: 'pl', label: 'Polski', badge: 'PL', icon: 'https://flagcdn.com/w40/pl.png' },
  { code: 'ru', label: 'Русский', badge: 'RU', icon: 'https://flagcdn.com/w40/ru.png' },
];

export function resolveLanguageCode(value: string) {
  const normalized = String(value || '').toLowerCase();
  const found = APP_LANGUAGES.find((lang) => normalized === lang.code || normalized.startsWith(`${lang.code}-`));
  return found?.code || 'en';
}
