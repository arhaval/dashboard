/**
 * Turkish UI Dictionary
 * Centralized labels for the entire application
 */

export const tr = {
  // Navigation / Sidebar
  nav: {
    dashboard: 'Ana Sayfa',
    team: 'Ekip',
    workItems: 'İş Takibi',
    payments: 'Ödemeler',
    finance: 'Finans',
    social: 'Sosyal Medya',
    reports: 'Raporlar',
  },

  // Common actions
  actions: {
    add: 'Ekle',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    view: 'Görüntüle',
    filter: 'Filtrele',
    search: 'Ara',
    export: 'Dışa Aktar',
    import: 'İçe Aktar',
    refresh: 'Yenile',
    back: 'Geri',
    next: 'İleri',
    confirm: 'Onayla',
    close: 'Kapat',
    pay: 'Öde',
    approve: 'Onayla',
    reject: 'Reddet',
    submit: 'Gönder',
    reset: 'Sıfırla',
    apply: 'Uygula',
    clear: 'Temizle',
    selectAll: 'Tümünü Seç',
    deselectAll: 'Tümünü Kaldır',
    addMember: 'Üye Ekle',
    addWorkItem: 'İş Ekle',
    addPayment: 'Ödeme Ekle',
    addTransaction: 'İşlem Ekle',
    createPayment: 'Ödeme Oluştur',
  },

  // Confirmation dialogs
  confirm: {
    delete: 'Silmek istediğinize emin misiniz?',
    deleteTitle: 'Silme Onayı',
    deleteDescription: 'Bu işlem geri alınamaz.',
    deleteWorkItem: 'Bu iş kaydını silmek istediğinize emin misiniz?',
    deletePayment: 'Bu ödemeyi silmek istediğinize emin misiniz?',
    deleteTransaction: 'Bu işlemi silmek istediğinize emin misiniz?',
    deleteSocialMetric: 'Bu sosyal medya kaydını silmek istediğinize emin misiniz?',
    deleteUser: 'Bu kullanıcıyı silmek istediğinize emin misiniz?',
    yes: 'Evet, Sil',
    no: 'Hayır, İptal',
  },

  // Page titles
  pages: {
    dashboard: {
      title: 'Ana Sayfa',
      subtitle: 'Genel bakış ve özet bilgiler',
    },
    team: {
      title: 'Ekip Yönetimi',
      subtitle: 'Ekip üyelerini yönetin',
    },
    workItems: {
      title: 'İş Takibi',
      subtitle: 'Tüm iş kayıtlarını görüntüleyin ve yönetin',
      new: 'Yeni İş Ekle',
    },
    payments: {
      title: 'Ödemeler',
      subtitle: 'Ödeme işlemlerini yönetin',
    },
    finance: {
      title: 'Finans',
      subtitle: 'Gelir ve gider takibi',
    },
    social: {
      title: 'Sosyal Medya',
      subtitle: 'Platform istatistiklerini takip edin',
    },
    reports: {
      title: 'Raporlar',
      subtitle: 'Aylık performans raporları',
    },
  },

  // Work Item
  workItem: {
    type: {
      STREAM: 'Yayın',
      VOICE: 'Seslendirme',
      EDIT: 'Montaj',
    },
    status: {
      DRAFT: 'Taslak',
      APPROVED: 'Onaylandı',
      PAID: 'Ödendi',
    },
    fields: {
      type: 'Tür',
      status: 'Durum',
      date: 'Tarih',
      cost: 'Ücret',
      user: 'Kullanıcı',
      matchName: 'Maç Adı',
      duration: 'Süre (dk)',
      contentName: 'İçerik Adı',
      contentLength: 'İçerik Uzunluğu',
      notes: 'Notlar',
    },
    contentLength: {
      SHORT: 'Kısa',
      LONG: 'Uzun',
    },
  },

  // Payment
  payment: {
    status: {
      PENDING: 'Bekliyor',
      COMPLETED: 'Tamamlandı',
      CANCELLED: 'İptal Edildi',
    },
    fields: {
      amount: 'Tutar',
      date: 'Tarih',
      user: 'Kullanıcı',
      status: 'Durum',
      notes: 'Notlar',
      items: 'Kalemler',
    },
  },

  // Transaction (Finance)
  transaction: {
    type: {
      INCOME: 'Gelir',
      EXPENSE: 'Gider',
    },
    fields: {
      type: 'Tür',
      category: 'Kategori',
      amount: 'Tutar',
      date: 'Tarih',
      description: 'Açıklama',
    },
    categories: {
      teamPayments: 'Ekip Ödemeleri',
      advances: 'Avanslar',
      operations: 'Operasyon',
      equipment: 'Ekipman',
      sponsorship: 'Sponsorluk',
      ads: 'Reklam Gelirleri',
      other: 'Diğer',
    },
  },

  // Social Media
  social: {
    platforms: {
      TWITCH: 'Twitch',
      YOUTUBE: 'YouTube',
      INSTAGRAM: 'Instagram',
      X: 'X',
    },
    fields: {
      platform: 'Platform',
      month: 'Ay',
      followers: 'Takipçi',
      views: 'Görüntülenme',
      engagement: 'Etkileşim',
      subscribers: 'Abone',
      streamTime: 'Yayın Süresi',
      avgViewers: 'Ort. İzleyici',
      peakViewers: 'Zirve İzleyici',
    },
    growth: {
      growing: 'Büyüyor',
      stable: 'Sabit',
      declining: 'Düşüşte',
    },
  },

  // User roles
  roles: {
    ADMIN: 'Yönetici',
    PUBLISHER: 'Yayıncı',
    EDITOR: 'Editör',
    VOICE: 'Seslendirmen',
  },

  // Table headers
  table: {
    actions: 'İşlemler',
    noData: 'Veri bulunamadı',
    loading: 'Yükleniyor...',
    rowsPerPage: 'Sayfa başına satır',
    of: '/',
    page: 'Sayfa',
  },

  // Filters
  filters: {
    all: 'Tümü',
    status: 'Durum',
    type: 'Tür',
    user: 'Kullanıcı',
    dateRange: 'Tarih Aralığı',
    month: 'Ay',
    platform: 'Platform',
    search: 'Ara...',
  },

  // Messages
  messages: {
    success: {
      created: 'Başarıyla oluşturuldu',
      updated: 'Başarıyla güncellendi',
      deleted: 'Başarıyla silindi',
      saved: 'Başarıyla kaydedildi',
    },
    error: {
      generic: 'Bir hata oluştu',
      notFound: 'Bulunamadı',
      unauthorized: 'Yetkisiz erişim',
      forbidden: 'Bu işlem için yetkiniz yok',
      validation: 'Lütfen tüm alanları doğru doldurun',
    },
  },

  // Currency
  currency: {
    symbol: '₺',
    code: 'TRY',
  },

  // Date/Time
  dateTime: {
    today: 'Bugün',
    yesterday: 'Dün',
    thisWeek: 'Bu Hafta',
    thisMonth: 'Bu Ay',
    lastMonth: 'Geçen Ay',
  },
} as const;

// Type for the dictionary
export type TrDictionary = typeof tr;
