/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional single password; embedded at build time — casual gate only, not strong security. */
  readonly VITE_ACCESS_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
