const getRuntimeQuery = () => {
  if (typeof window === "undefined" || typeof window.location?.search !== "string") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
};

const isDemoBuild = typeof __EWH_APP_MODE__ !== "undefined" && __EWH_APP_MODE__ === "demo";

export const isDemoStorageScope = isDemoBuild || getRuntimeQuery().get("demo") === "1";

export const applicationStorageScope = isDemoStorageScope ? "demo" : "production";

export const scopedStorageKey = (key: string) => `ewh-${applicationStorageScope}-${key}`;
