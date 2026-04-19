type UiFeedbackTone = "success" | "warning" | "danger";

const AUDIO_CONFIG: Record<UiFeedbackTone, { src: string; volume: number }> = {
  success: { src: "/audio/ui-success.ogg", volume: 0.18 },
  warning: { src: "/audio/ui-warning.ogg", volume: 0.14 },
  danger: { src: "/audio/ui-error.ogg", volume: 0.16 },
};

const audioCache = new Map<UiFeedbackTone, HTMLAudioElement>();
const lastPlayedAt = new Map<UiFeedbackTone, number>();
const PLAY_COOLDOWN_MS = 350;

export const playUiFeedback = (tone: UiFeedbackTone) => {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;

  const now = Date.now();
  const previousPlayAt = lastPlayedAt.get(tone) ?? 0;
  if (now - previousPlayAt < PLAY_COOLDOWN_MS) return;
  lastPlayedAt.set(tone, now);

  const config = AUDIO_CONFIG[tone];
  let audio = audioCache.get(tone);

  if (!audio) {
    audio = new Audio(config.src);
    audio.preload = "auto";
    audioCache.set(tone, audio);
  }

  audio.volume = config.volume;
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
};
