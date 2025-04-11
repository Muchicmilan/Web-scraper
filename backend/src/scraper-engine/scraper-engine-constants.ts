export const COMMON_EXCLUDED_SELECTORS: ReadonlyArray<string> = [
  "header", "footer", "nav", ".nav", ".navbar", "aside", ".sidebar",
  ".comment", ".comments", ".advertisement", ".ad", ".ads", ".popup",
  ".modal", ".code-block", ".newsletter-form", ".newsletter-form-wrapper",
  "script", "style", "noscript", "iframe", ".hidden", "[hidden]",
  "[style*='display: none']",
];

export const AXIOS_REQUEST_TIMEOUT: number = 15000;

export const DEFAULT_USER_AGENT: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

export const MAX_DETAIL_PAGES_PER_JOB = 100;