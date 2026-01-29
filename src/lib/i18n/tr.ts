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
      metricsSaved: 'Metrikler başarıyla kaydedildi!',
    },
    error: {
      generic: 'Bir hata oluştu',
      notFound: 'Bulunamadı',
      unauthorized: 'Yetkisiz erişim',
      forbidden: 'Bu işlem için yetkiniz yok',
      validation: 'Lütfen tüm alanları doğru doldurun',
      loginRequired: 'Giriş yapmalısınız',
      invalidCredentials: 'Geçersiz e-posta veya şifre',
      unexpected: 'Beklenmeyen bir hata oluştu',
      failedToCreate: 'Oluşturulamadı',
      failedToSave: 'Kaydedilemedi',
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

  // Auth / Login
  auth: {
    signIn: 'Giriş Yap',
    signOut: 'Çıkış Yap',
    email: 'E-posta',
    password: 'Şifre',
    emailPlaceholder: 'ornek@arhaval.com',
    passwordPlaceholder: 'Şifrenizi girin',
    invalidEmail: 'Geçerli bir e-posta adresi girin',
    passwordRequired: 'Şifre gereklidir',
    profile: 'Profil',
    welcomeBack: 'Tekrar Hoş Geldiniz',
    loginSubtitle: 'Devam etmek için giriş yapın',
  },

  // Header / User Menu
  header: {
    profile: 'Profil',
    signOut: 'Çıkış Yap',
    signIn: 'Giriş Yap',
  },

  // Dashboard
  dashboard: {
    title: 'Ana Sayfa',
    subtitle: 'Operasyonlarınızın genel görünümü',
    totalWorkItems: 'Toplam İş Kaydı',
    pendingPayments: 'Bekleyen Ödemeler',
    teamMembers: 'Ekip Üyeleri',
    revenue: 'Gelir',
    thisMonth: 'Bu ay',
    awaitingProcessing: 'İşlem bekliyor',
    activeUsers: 'Aktif kullanıcılar',
    recentActivity: 'Son Aktiviteler',
    activityPlaceholder: 'Aktivite akışı burada görünecek',
    quickActions: 'Hızlı İşlemler',
    quickActionsPlaceholder: 'Hızlı işlemler burada görünecek',
  },

  // Team
  team: {
    title: 'Ekip',
    subtitle: 'Ekip üyelerini yönetin',
    addMember: 'Üye Ekle',
    noMembers: 'Ekip üyesi bulunamadı',
    totalMembers: 'Toplam Üye',
    active: 'Aktif',
    inactive: 'Pasif',
    admins: 'Yöneticiler',
    name: 'Ad Soyad',
    email: 'E-posta',
    role: 'Rol',
    status: 'Durum',
    joined: 'Katılım',
    you: '(Siz)',
    fullName: 'Ad Soyad',
    password: 'Şifre',
    minChars: 'Min. 8 karakter',
    creating: 'Oluşturuluyor...',
  },

  // Work Items
  work: {
    addItem: 'İş Ekle',
    createItem: 'İş Kaydı Oluştur',
    noItems: 'İş kaydı bulunamadı',
    workType: 'İş Türü',
    workDate: 'İş Tarihi',
    workDateRequired: 'İş tarihi gereklidir',
    matchName: 'Maç Adı',
    matchNameRequired: 'Maç adı gereklidir',
    matchNamePlaceholder: 'örn: Takım A vs Takım B',
    duration: 'Süre (dakika)',
    durationRequired: 'Süre en az 1 dakika olmalıdır',
    durationPlaceholder: 'örn: 90',
    contentName: 'İçerik Adı',
    contentNameRequired: 'İçerik adı gereklidir',
    contentNamePlaceholder: 'örn: Bölüm 1 - Giriş',
    contentLength: 'İçerik Uzunluğu',
    contentLengthRequired: 'İçerik uzunluğu gereklidir',
    selectLength: 'Uzunluk seçin',
    notesOptional: 'Notlar (isteğe bağlı)',
    notesPlaceholder: 'Ek notlar...',
  },

  // Filters
  filter: {
    allStatus: 'Tüm Durumlar',
    allTypes: 'Tüm Türler',
    allUsers: 'Tüm Kullanıcılar',
    allCategories: 'Tüm Kategoriler',
    clearFilters: 'Filtreleri Temizle',
    draft: 'Taslak',
    approved: 'Onaylandı',
    paid: 'Ödendi',
    pending: 'Bekliyor',
    cancelled: 'İptal Edildi',
    stream: 'Yayın',
    voice: 'Seslendirme',
    edit: 'Montaj',
    income: 'Gelir',
    expense: 'Gider',
  },

  // Social Metrics Form
  metricsForm: {
    title: 'Aylık Metrik Ekle/Güncelle',
    month: 'Ay',
    platform: 'Platform',
    followersTotal: 'Toplam Takipçi',
    subscribersTotal: 'Toplam Abone',
    saving: 'Kaydediliyor...',
    saveMetrics: 'Metrikleri Kaydet',
    metrics: 'Metrikleri',
    // Platform-specific fields
    totalStreamTime: 'Toplam Yayın Süresi (dk)',
    avgViewers: 'Ortalama İzleyici',
    peakViewers: 'Zirve İzleyici',
    uniqueViewers: 'Tekil İzleyici',
    liveViews: 'Canlı İzlenme',
    uniqueChatters: 'Tekil Sohbet',
    subsTotal: 'Toplam Abone',
    videoViews: 'Video İzlenme',
    shortsViews: 'Shorts İzlenme',
    totalLikes: 'Toplam Beğeni',
    totalComments: 'Toplam Yorum',
    avgLiveViewers: 'Ort. Canlı İzleyici',
    peakLiveViewers: 'Zirve Canlı İzleyici',
    views: 'Görüntülenme',
    likes: 'Beğeni',
    comments: 'Yorum',
    saves: 'Kaydetme',
    shares: 'Paylaşım',
    impressions: 'Gösterim',
    engagementRate: 'Etkileşim Oranı (%)',
    replies: 'Yanıt',
    profileVisits: 'Profil Ziyareti',
  },
} as const;

// Type for the dictionary
export type TrDictionary = typeof tr;
