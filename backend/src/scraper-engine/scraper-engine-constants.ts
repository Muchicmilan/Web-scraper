export const COMMON_EXCLUDED_SELECTORS: ReadonlyArray<string> = [
    "header",
    "footer",
    "nav",
    ".nav",
    ".navbar",
    "aside",
    ".sidebar",
    ".comment",
    ".comments",
    ".advertisement",
    ".ad",
    ".ads",
    ".popup",
    ".modal",
    ".code-block",
    ".newsletter-form",
    ".newsletter-form-wrapper",
    "script",
    "style",
    "noscript",
    "iframe",
    ".hidden",
    "[hidden]",
    "[style*='display: none']",
  ];
  
  export const DEFAULT_HEADING_SELECTORS: ReadonlyArray<string> = ["h1", "h2", "h3", "h4", "h5", "h6"];
  
  export const DEFAULT_TEXT_CONTAINER_SELECTORS: ReadonlyArray<string> = ["p", "span", "li", "div", "td", "article", "section"];
  
  export const DEFAULT_CONTENT_SELECTORS: ReadonlyArray<string> = [
    "article",
    "section",
    "main",
    ".content",
    ".main-content",
    ".post-body",
    ".entry-content",
    ".prose",
    "body"
    ];
  
  export const DEFAULT_MIN_CONTENT_LENGTH: number = 100;
  
  export const AXIOS_REQUEST_TIMEOUT: number = 15000;
  
  export const DEFAULT_USER_AGENT: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";