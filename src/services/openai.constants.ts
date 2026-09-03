/**
 * OpenAI çağrılarının ortak sabitleri.
 *
 * Model adı tek yerde durur: üretim (Arhavalize) ve sınıflandırma aynı kaynağı
 * okur, iki dosyada ayrı varsayılan tutulmaz. Çağrı anında sessiz bir başka
 * modele düşülmez — hata modeli adıyla yüzeye çıkar.
 */
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-sol';

export const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
