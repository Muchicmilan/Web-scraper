export const COMMON_EXCLUDED_SELECTORS = [
    "header", "footer", "nav", ".nav", ".navbar", "aside", ".sidebar",
    ".comment", ".comments", ".advertisement", ".ad", ".ads", ".popup",
    ".modal", ".code-block", ".newsletter-form", ".newsletter-form-wrapper",
    "script", "style", "noscript", "iframe", ".hidden", "[hidden]",
    "[style*='display: none']",
];
export const PUPPETEER_TIMEOUT = 300000;
export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
export const MAX_DETAIL_PAGES_PER_JOB = 100;
export const DEFAULT_POOL_OPTIONS = {
    maxPoolSize: 5,
    minPoolSize: 2,
    idleTimeoutMs: 60000,
    retryLimit: 3
};
export const BROWSER_PROCESS_LIST_ITEM_FUNCTION_STRING = `
            (listItemElement, primaryMappings, pageUrl) => {
                // --- Embedded Extraction Logic ---
                function set(obj, path, value) {
                    const keys = Array.isArray(path) ? path : path.split('.');
                    let current = obj;
                    for (let i = 0; i < keys.length - 1; i++) {
                        const key = keys[i];
                        if (current[key] === undefined || current[key] === null) current[key] = {};
                        current = current[key];
                    }
                    if (keys.length > 0) current[keys[keys.length - 1]] = value;
                }
                function extractData(targetElement, mappings) {
                    if (!targetElement) return {};
                    const resultData = {};
                    for (const mapping of mappings) {
                        if (!mapping || !mapping.fieldName || !mapping.selector || !mapping.extractFrom) continue;
                        let value = undefined;
                        try {
                            const elementsToQuery = (mapping.selector === ':scope' || mapping.selector === '*')
                                ? [targetElement]
                                : Array.from(targetElement.querySelectorAll(mapping.selector));
                            if (elementsToQuery.length > 0) {
                                if (mapping.extractFrom === 'text') {
                                    const textParts = [];
                                    elementsToQuery.forEach(elem => {
                                        const text = elem.innerText?.trim();
                                        if (text) textParts.push(text);
                                    });
                                    if (textParts.length > 0) value = textParts.join(' ').replace(/\\s+/g, ' ').trim();
                                } else {
                                    const firstTarget = elementsToQuery[0];
                                    if (mapping.extractFrom === 'attribute' && mapping.attributeName) {
                                        value = firstTarget.getAttribute(mapping.attributeName)?.trim();
                                        if (value && (mapping.attributeName === 'href' || mapping.attributeName === 'src')) {
                                            try { value = new URL(value, pageUrl).href; } catch (e) {}
                                        }
                                    } else if (mapping.extractFrom === 'html') {
                                        value = firstTarget.innerHTML?.trim();
                                    }
                                }
                            }
                        } catch (e) { console.error('[Browser Context] Error processing selector "' + mapping.selector + '" for field "' + mapping.fieldName + '": ' + e.message); }
                        if (value !== undefined && value !== null && value !== '') set(resultData, mapping.fieldName, value);
                    }
                    return resultData;
                }
                // --- End Embedded Extraction Logic ---

                const listData = extractData(listItemElement, primaryMappings);
                let detailUrl = null;
                try {
                    const links = Array.from(listItemElement.querySelectorAll('a'));
                    const baseDomain = new URL(pageUrl).hostname.toLowerCase();
                    for (const link of links) {
                        const href = link.getAttribute('href')?.trim();
                        if (href && href !== '#' && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                            try {
                                const absoluteURL = new URL(href, pageUrl);
                                if (absoluteURL.protocol.startsWith('http') && absoluteURL.hostname.toLowerCase() === baseDomain) {
                                    detailUrl = absoluteURL.href;
                                    break;
                                }
                            } catch (e) {}
                        }
                    }
                } catch (e) {
                    console.error('[Browser Context] Error extracting links: ' + e.message);
                    return { listData, detailUrl: null, error: 'Link extraction failed: ' + e.message };
                }
                return { listData, detailUrl };
            }
        `;
