/**
 * Platform bazlı içerik tipleri
 * Her platform için geçerli format seçenekleri
 */

export interface ContentTypeOption {
  value: string;
  label: string;
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
