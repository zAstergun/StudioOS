export type SupportedLanguage =
  | "pt-BR"
  | "en"
  | "es"
  | "zh-CN"
  | "fr"
  | "de"
  | "it"
  | "ar"
  | "id"
  | "ja"
  | "ko"
  | "nl"
  | "pt-PT"
  | "ru"
  | "vi";

export type Language = SupportedLanguage;

export type LanguageSetting = "system" | SupportedLanguage;

export interface LanguageOption {
  code: LanguageSetting;
  label: string;
  dir?: "ltr" | "rtl";
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: "system", label: "Idioma do Sistema" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "nl", label: "Nederlands" },
  { code: "pt-PT", label: "Português (Portugal)" },
  { code: "ru", label: "Русский" },
  { code: "vi", label: "Tiếng Việt" },
] as const;

export type TranslationDictionary = {
  [key: string]: any;
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    next: string;
    confirm: string;
    copy: string;
    copied: string;
    loading: string;
    search: string;
    filter: string;
    new: string;
    create: string;
    actions: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    status: string;
    online: string;
    offline: string;
    system_language: string;
    or: string;
    view_all: string;
    details: string;
    open: string;
  };
  nav: {
    brand_subtitle: string;
    overview: string;
    ranking: string;
    ranking_kicker: string;
    profile: string;
    login: string;
    projects: string;
    projects_kicker: string;
    saved: string;
    saved_kicker: string;
    history: string;
    history_kicker: string;
    groups: {
      creation: string;
      publishing: string;
      strategy: string;
      panel: string;
    };
    trash: string;
    signout: string;
    calibration_status: string;
    calibrated: string;
    pending: string;
    vip_badge: string;
  };
  tools: {
    rank: { name: string; kicker: string; desc: string };
    titulos: { name: string; kicker: string; desc: string };
    hooks: { name: string; kicker: string; desc: string };
    roteiro: { name: string; kicker: string; desc: string };
    thumbnail: { name: string; kicker: string; desc: string };
    receita: { name: string; kicker: string; desc: string };
    humanizador: { name: string; kicker: string; desc: string };
    score: { name: string; kicker: string; desc: string };
    mentor: { name: string; kicker: string; desc: string };
    membros: { name: string; kicker: string; desc: string };
    calibracao: { name: string; kicker: string; desc: string };
    config: { name: string; kicker: string; desc: string };
    wiki: { name: string; kicker: string; desc: string };
  };
  home: {
    badge: string;
    title: string;
    subtitle: string;
    cta_rank: string;
    cta_calibrate: string;
    cta_wiki: string;
    stats_tools: string;
    stats_privacy: string;
    stats_ai: string;
    quick_start: string;
    recent_activity: string;
    no_activity: string;
    community: string;
    community_sub: string;
    start_with_rank: string;
    read_wiki: string;
  };
  statusbar: {
    ready: string;
    processing: string;
    tokens: string;
    local_mode: string;
    active_profile: string;
    ai_status: string;
  };
  console: {
    title: string;
    prompt_placeholder: string;
    send: string;
    clear: string;
    copy_response: string;
    provider: string;
    model: string;
  };
  auth: {
    login_title: string;
    signup_title: string;
    recovery_title: string;
    reset_title: string;
    email: string;
    email_placeholder: string;
    password: string;
    password_placeholder: string;
    confirm_password: string;
    name: string;
    name_placeholder: string;
    channel: string;
    channel_placeholder: string;
    login_button: string;
    signup_button: string;
    recovery_button: string;
    reset_button: string;
    google_login: string;
    discord_login: string;
    demo_login: string;
    already_account: string;
    dont_have_account: string;
    forgot_password: string;
    back_to_login: string;
    check_inbox: string;
    invalid_credentials: string;
    email_not_confirmed: string;
    user_already_registered: string;
    password_min: string;
    rate_limit: string;
    invalid_email: string;
    network_error: string;
  };
  profile: {
    tabs: {
      general: string;
      security: string;
      preferences: string;
      activity: string;
    };
    edit_profile: string;
    save_profile: string;
    saving: string;
    share_profile: string;
    copy_link: string;
    link_copied: string;
    vip_badge: string;
    verified_creator: string;
    about: string;
    social_links: string;
    stats: {
      title: string;
      subscribers: string;
      views: string;
      videos: string;
      engagement: string;
    };
    featured_video: string;
    projects_section: string;
    achievements: string;
    comments: string;
    leave_comment: string;
    comment_placeholder: string;
    send_comment: string;
    security: {
      change_password: string;
      current_password: string;
      new_password: string;
      update_password_btn: string;
      change_email: string;
      new_email: string;
      update_email_btn: string;
      linked_accounts: string;
      link_google: string;
      link_discord: string;
      active_sessions: string;
      current_session: string;
      danger_zone: string;
      delete_account: string;
      delete_account_warn: string;
    };
    preferences: {
      title: string;
      notifications_title: string;
      email_notif: string;
      email_notif_desc: string;
      push_notif: string;
      push_notif_desc: string;
      system_title: string;
      language_label: string;
      language_header: string;
      save_btn: string;
      saved_title: string;
      saved_desc: string;
      system_default: string;
    };
  };
  projects: {
    title: string;
    new_project: string;
    search_placeholder: string;
    all_projects: string;
    active: string;
    completed: string;
    pipeline: string;
    stages: {
      backlog: string;
      script: string;
      recording: string;
      editing: string;
      ready: string;
      published: string;
    };
    task_count: string;
    add_task: string;
    task_title: string;
    task_desc: string;
    priority: string;
    priority_low: string;
    priority_medium: string;
    priority_high: string;
    priority_urgent: string;
    due_date: string;
    assignee: string;
    delete_project: string;
    delete_project_confirm: string;
    ai_assistant: string;
    ai_prompt: string;
    members: string;
    invite_member: string;
    invite_link: string;
    role_owner: string;
    role_editor: string;
    role_viewer: string;
  };
  ranking: {
    title: string;
    subtitle: string;
    podium: string;
    filter_all: string;
    points: string;
    projects_done: string;
    rank_position: string;
  };
  saved: {
    title: string;
    subtitle: string;
    empty: string;
    copy: string;
    delete: string;
    filter_all: string;
  };
  history: {
    title: string;
    subtitle: string;
    empty: string;
    restore: string;
    trash_bin: string;
    empty_trash: string;
    clear_all: string;
  };
  emails: {
    confirm_signup: {
      subject: string;
      badge: string;
      tagline: string;
      title: string;
      body: string;
      cta: string;
      otp_label: string;
      unlocks_title: string;
      unlock_1: string;
      unlock_2: string;
      unlock_3: string;
      disclaimer: string;
    };
    reset_password: {
      subject: string;
      badge: string;
      tagline: string;
      title: string;
      body: string;
      expiry_badge: string;
      expiry_text: string;
      cta: string;
      otp_label: string;
      not_requested_title: string;
      not_requested_text: string;
    };
    change_email: {
      subject: string;
      badge: string;
      tagline: string;
      title: string;
      body: string;
      current_email: string;
      new_email: string;
      cta: string;
      otp_label: string;
      warning: string;
      security_alert: string;
    };
    email_changed_notification: {
      subject: string;
      badge: string;
      tagline: string;
      title: string;
      body: string;
      old_email: string;
      active_email: string;
      cta: string;
      alert: string;
      emergency_cta: string;
    };
    footer: string;
  };
  footer: {
    desc: string;
    cta_rank: string;
    cta_wiki: string;
  };
};
