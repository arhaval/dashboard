/**
 * Platform bazlı içerik tipleri ve metrik alanları
 * Her platform için geçerli format seçenekleri + girilebilecek istatistikler
 */

export interface ContentTypeOption {
  value: string;
  label: string;
}

// ── Platform Metrik Alanları ──────────────────────────────────────────────────

export interface MetricField {
  /** Form alanı adı ve Record anahtarı */
  key: string;
  /** Kullanıcıya gösterilen Türkçe etiket */
  label: string;
  /** Emoji ikon */
  icon: string;
  /**
   * Verinin DB'de nerede saklandığı:
   * - 'views' | 'likes' | 'comments' | 'shares' | 'saves' → standart sütun
   * - 'jsonb' → platform_metrics JSONB sütunu (jsonbKey kullan)
   */
  column: 'views' | 'likes' | 'comments' | 'shares' | 'saves' | 'jsonb';
  /** platform_metrics JSONB içindeki anahtar (column === 'jsonb' ise zorunlu) */
  jsonbKey?: string;
  /** Ondalıklı değer kabul eder mi? (ör. CTR yüzdesi, izleme saati) */
  decimal?: boolean;
}

export const PLATFORM_METRICS: Record<string, MetricField[]> = {
  Instagram: [
    { key: 'views',    label: 'Görüntülenme',    icon: '👁️', column: 'views'    },
    { key: 'reach',    label: 'Erişim (Reach)',   icon: '📡', column: 'jsonb', jsonbKey: 'reach' },
    { key: 'likes',    label: 'Beğeni',            icon: '❤️', column: 'likes'    },
    { key: 'comments', label: 'Yorum',             icon: '💬', column: 'comments' },
    { key: 'saves',    label: 'Kaydetme',           icon: '🔖', column: 'saves'    },
    { key: 'shares',   label: 'Paylaşım',           icon: '↗️', column: 'shares'   },
  ],
  YouTube: [
    { key: 'views',              label: 'Görüntülenme',       icon: '👁️', column: 'views'    },
    { key: 'likes',              label: 'Beğeni',              icon: '👍', column: 'likes'    },
    { key: 'comments',           label: 'Yorum',               icon: '💬', column: 'comments' },
    { key: 'watch_time_minutes', label: 'İzleme Süresi (dk)',  icon: '⏱️', column: 'jsonb', jsonbKey: 'watch_time_minutes' },
    { key: 'subscribers_gained', label: 'Kazanılan Abone',     icon: '📈', column: 'jsonb', jsonbKey: 'subscribers_gained' },
    { key: 'ctr_percent',        label: 'Tıklama Oranı (%)',   icon: '🎯', column: 'jsonb', jsonbKey: 'ctr_percent', decimal: true },
  ],
  X: [
    { key: 'impressions',    label: 'Gösterim (Impression)', icon: '📊', column: 'views'    },
    { key: 'likes',          label: 'Beğeni',                 icon: '❤️', column: 'likes'    },
    { key: 'replies',        label: 'Yanıt (Reply)',           icon: '↩️', column: 'comments' },
    { key: 'retweets',       label: 'Retweet',                icon: '🔁', column: 'shares'   },
    { key: 'profile_visits', label: 'Profil Ziyareti',        icon: '👤', column: 'jsonb', jsonbKey: 'profile_visits' },
    { key: 'link_clicks',    label: 'Bağlantı Tıklaması',     icon: '🔗', column: 'jsonb', jsonbKey: 'link_clicks'    },
  ],
  Twitch: [
    { key: 'views',         label: 'İzlenme',            icon: '👁️', column: 'views'  },
    { key: 'peak_viewers',  label: 'Tepe İzleyici',      icon: '🔝', column: 'jsonb', jsonbKey: 'peak_viewers'  },
    { key: 'avg_viewers',   label: 'Ort. İzleyici',      icon: '📺', column: 'jsonb', jsonbKey: 'avg_viewers'   },
    { key: 'new_followers', label: 'Yeni Takipçi',       icon: '➕', column: 'jsonb', jsonbKey: 'new_followers' },
    { key: 'hours_watched', label: 'İzleme Saati (sa)',  icon: '⏱️', column: 'jsonb', jsonbKey: 'hours_watched', decimal: true },
  ],
  TikTok: [
    { key: 'views',          label: 'Görüntülenme',   icon: '👁️', column: 'views'    },
    { key: 'likes',          label: 'Beğeni',          icon: '❤️', column: 'likes'    },
    { key: 'comments',       label: 'Yorum',           icon: '💬', column: 'comments' },
    { key: 'shares',         label: 'Paylaşım',        icon: '↗️', column: 'shares'   },
    { key: 'saves',          label: 'Kaydetme',         icon: '🔖', column: 'saves'    },
    { key: 'profile_visits', label: 'Profil Ziyareti', icon: '👤', column: 'jsonb', jsonbKey: 'profile_visits' },
  ],
};

/** Platform'un metrik alanlarını döndürür. Bilinmeyen platform için temel set. */
export function getPlatformMetrics(platform: string): MetricField[] {
  return PLATFORM_METRICS[platform] ?? [
    { key: 'views',    label: 'Görüntülenme', icon: '👁️', column: 'views'    },
    { key: 'likes',    label: 'Beğeni',        icon: '❤️', column: 'likes'    },
    { key: 'comments', label: 'Yorum',          icon: '💬', column: 'comments' },
    { key: 'shares',   label: 'Paylaşım',       icon: '↗️', column: 'shares'   },
    { key: 'saves',    label: 'Kaydetme',        icon: '🔖', column: 'saves'    },
  ];
}

/**
 * Metrik alanlarını standart DB sütunları ile platform_metrics JSONB'ye ayırır.
 * Dönen obje doğrudan specialPostService.update() 'a geçilebilir.
 */
export function splitMetricFields(
  platform: string,
  fieldValues: Record<string, number>,
): {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  platform_metrics: Record<string, number>;
  engagement_rate: number;
} {
  const fields = getPlatformMetrics(platform);

  let views = 0, likes = 0, comments = 0, shares = 0, saves = 0;
  const platform_metrics: Record<string, number> = {};

  for (const field of fields) {
    const val = fieldValues[field.key] ?? 0;
    if (field.column === 'jsonb' && field.jsonbKey) {
      platform_metrics[field.jsonbKey] = val;
    } else if (field.column === 'views')    { views    = val; }
    else if   (field.column === 'likes')    { likes    = val; }
    else if   (field.column === 'comments') { comments = val; }
    else if   (field.column === 'shares')   { shares   = val; }
    else if   (field.column === 'saves')    { saves    = val; }
  }

  const engagement_rate =
    views > 0 ? Number((((likes + comments + saves) / views) * 100).toFixed(2)) : 0;

  return { views, likes, comments, shares, saves, platform_metrics, engagement_rate };
}

export const PLATFORM_CONTENT_TYPES: Record<string, ContentTypeOption[]> = {
  Instagram: [
    { value: 'instagram_reels',    label: 'Reels'           },
    { value: 'instagram_post',     label: 'Gönderi / Post'  },
    { value: 'instagram_carousel', label: 'Carousel'        },
    { value: 'instagram_story',    label: 'Story'           },
    { value: 'instagram_live',     label: 'Canlı Yayın'     },
  ],
  YouTube: [
    { value: 'youtube_long',       label: 'Uzun Video'      },
    { value: 'youtube_shorts',     label: 'Shorts'          },
    { value: 'youtube_live',       label: 'Canlı Yayın'     },
  ],
  X: [
    { value: 'x_tweet',            label: 'Tweet'           },
    { value: 'x_thread',           label: 'Thread'          },
    { value: 'x_image_tweet',      label: 'Görsel Tweet'    },
    { value: 'x_video_tweet',      label: 'Video Tweet'     },
  ],
  Twitch: [
    { value: 'twitch_highlight',   label: 'Highlight'       },
    { value: 'twitch_clip',        label: 'Clip'            },
    { value: 'twitch_stream',      label: 'Stream'          },
  ],
  TikTok: [
    { value: 'tiktok_video',       label: 'Video'           },
    { value: 'tiktok_duet',        label: 'Duet'            },
    { value: 'tiktok_stitch',      label: 'Stitch'          },
  ],
};

/** Seçili platformlara göre benzersiz içerik tiplerini döndürür */
export function getContentTypes(platforms: string[]): ContentTypeOption[] {
  if (platforms.length === 0) {
    // Platform seçilmemişse tüm seçenekleri göster
    const all = Object.values(PLATFORM_CONTENT_TYPES).flat();
    const seen = new Set<string>();
    return all.filter(o => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }

  const seen  = new Set<string>();
  const result: ContentTypeOption[] = [];

  platforms.forEach(platform => {
    (PLATFORM_CONTENT_TYPES[platform] ?? []).forEach(opt => {
      if (!seen.has(opt.value)) {
        seen.add(opt.value);
        result.push(opt);
      }
    });
  });

  return result;
}

/** value'dan label döndürür (tablo/kart gösterimi için) */
export function getContentTypeLabel(value: string): string {
  for (const opts of Object.values(PLATFORM_CONTENT_TYPES)) {
    const found = opts.find(o => o.value === value);
    if (found) return found.label;
  }
  return value; // bilinmeyense ham value göster
}
