import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGS: { code: string; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
  { code: 'el', label: 'Ελληνικά' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    try { localStorage.setItem('lang', lng); } catch {};
  };

  return (
    <select
      value={i18n.language || 'en'}
      onChange={handleChange}
      className="text-xs bg-neutral-900 border border-[#2F3336] text-white rounded px-2 py-1"
      aria-label="Language selector"
    >
      {LANGS.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
