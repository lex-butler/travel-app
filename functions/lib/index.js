"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUrlPreview = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const node_html_parser_1 = require("node-html-parser");
admin.initializeApp();
exports.getUrlPreview = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in to fetch URL previews');
    }
    const { url } = request.data;
    if (!url || typeof url !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'A valid URL string is required');
    }
    // Validate URL format
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error('Invalid protocol');
        }
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'URL must be a valid http/https URL');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TripSync/1.0; +https://tripsync.app)',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
        });
        clearTimeout(timeout);
        if (!response.ok) {
            return { title: null, image: null, description: null, siteName: parsedUrl.hostname };
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('text/html')) {
            return { title: null, image: null, description: null, siteName: parsedUrl.hostname };
        }
        const html = await response.text();
        const root = (0, node_html_parser_1.parse)(html);
        const getMeta = (prop) => root.querySelector(`meta[property="${prop}"]`)?.getAttribute('content')?.trim() ||
            root.querySelector(`meta[name="${prop}"]`)?.getAttribute('content')?.trim() ||
            null;
        const title = getMeta('og:title') ?? root.querySelector('title')?.text?.trim() ?? null;
        const image = getMeta('og:image') ?? null;
        const description = getMeta('og:description') ?? getMeta('description') ?? null;
        const siteName = getMeta('og:site_name') ?? parsedUrl.hostname;
        return { title, image, description, siteName };
    }
    catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new https_1.HttpsError('deadline-exceeded', 'URL fetch timed out');
        }
        // Don't throw — return nulls so the form still works in manual mode
        return { title: null, image: null, description: null, siteName: parsedUrl.hostname };
    }
});
//# sourceMappingURL=index.js.map