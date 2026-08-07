const getRuntimeQuery = () => {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
};

export const isDemoStorageScope = import.meta.env.VITE_APP_MODE === "demo" || getRuntimeQuery().get("demo") === "1";

export const applicationStorageScope = isDemoStorageScope ? "demo" : "production";

export const scopedStorageKey = (key: string) => `ewh-${applicationStorageScope}-${key}`;
