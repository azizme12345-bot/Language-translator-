export interface Language {
  code: string;
  name: string;
  bcp47: string;
}

export const LANGUAGES: Language[] = [
  { code: "auto", name: "Auto-detect", bcp47: "en-US" },
  { code: "en", name: "English", bcp47: "en-US" },
  { code: "ur", name: "Urdu", bcp47: "ur-PK" },
  { code: "hi", name: "Hindi", bcp47: "hi-IN" },
  { code: "es", name: "Spanish", bcp47: "es-ES" },
  { code: "fr", name: "French", bcp47: "fr-FR" },
  { code: "de", name: "German", bcp47: "de-DE" },
  { code: "it", name: "Italian", bcp47: "it-IT" },
  { code: "pt", name: "Portuguese", bcp47: "pt-BR" },
  { code: "zh", name: "Chinese (Simplified)", bcp47: "zh-CN" },
  { code: "ja", name: "Japanese", bcp47: "ja-JP" },
  { code: "ko", name: "Korean", bcp47: "ko-KR" },
  { code: "ar", name: "Arabic", bcp47: "ar-SA" },
  { code: "ru", name: "Russian", bcp47: "ru-RU" },
  { code: "tr", name: "Turkish", bcp47: "tr-TR" },
  { code: "nl", name: "Dutch", bcp47: "nl-NL" },
  { code: "pl", name: "Polish", bcp47: "pl-PL" },
  { code: "id", name: "Indonesian", bcp47: "id-ID" },
  { code: "vi", name: "Vietnamese", bcp47: "vi-VN" },
  { code: "th", name: "Thai", bcp47: "th-TH" },
];

export function getSpeechLang(code: string): string {
  const found = LANGUAGES.find((l) => l.code === code);
  return found?.bcp47 || "en-US";
}

