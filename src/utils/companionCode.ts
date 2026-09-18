/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const COMPANION_MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "TryGC WhatsApp Task Bridge Companion",
  "version": "1.2.0",
  "description": "Continuous background monitoring companion for WhatsApp Web to capture authorized Adel requests and voice notes.",
  "permissions": ["storage"],
  "host_permissions": [
    "https://web.whatsapp.com/*",
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "48": "icon48.png"
  }
}`;

export const COMPANION_CONTENT_JS = `/**
 * TryGC WhatsApp Task Automation Hub - WhatsApp Web Content Script
 * Robust, selector-resilient message & voice-note capture engine.
 * Avoids generated unstable class names. Uses data-pre-plain-text, ARIA, and DOM metadata.
 */

(function () {
  const HUB_WEBHOOK_URL = 'http://localhost:3000/api/capture/webhook';
  const PROCESSED_MSG_IDS = new Set();
  let currentActiveChat = '';

  console.log('%c[TryGC WhatsApp Bridge] Initialized and monitoring...', 'background: #6366f1; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;');

  // 1. Detect Current Active WhatsApp Group Name from Chat Header
  function getActiveChatGroupName() {
    try {
      // Strategy A: Main chat header element
      const header = document.querySelector('header [title]') || 
                     document.querySelector('#main header span[dir="auto"]') ||
                     document.querySelector('header span[title]');
      if (header) {
        return header.getAttribute('title') || header.textContent.trim();
      }
      // Strategy B: Fallback header text
      const mainHeader = document.querySelector('#main header');
      if (mainHeader) {
        const titleEl = mainHeader.querySelector('[dir="auto"]');
        if (titleEl) return titleEl.textContent.trim();
      }
    } catch (e) {
      console.warn('[TryGC] Error resolving active chat:', e);
    }
    return '';
  }

  // 2. Parse Message Metadata from WhatsApp Web DOM Container
  function parseMessageElement(el) {
    try {
      // WhatsApp message containers usually have data-id or sit in row containers
      const dataId = el.getAttribute('data-id') || el.closest('[data-id]')?.getAttribute('data-id');
      if (dataId && PROCESSED_MSG_IDS.has(dataId)) return null;

      // Strategy 1: data-pre-plain-text is WhatsApp's canonical plain text sender & timestamp info
      // Format: "[10:18 AM, 9/18/2026] Adel HAMMAD Egy: "
      const prePlainElement = el.querySelector('[data-pre-plain-text]') || (el.hasAttribute('data-pre-plain-text') ? el : null);
      let sender = '';
      let timeText = '';
      let prePlainText = '';

      if (prePlainElement) {
        prePlainText = prePlainElement.getAttribute('data-pre-plain-text') || '';
        const match = prePlainText.match(/\\[([^\\]]+)\\]\\s*([^:]+):/);
        if (match) {
          timeText = match[1].trim();
          sender = match[2].trim();
        }
      }

      // Strategy 2: Fallback sender detection from accessibility / aria-label or sender titles
      if (!sender) {
        const senderSpan = el.querySelector('[data-testid="message-author"]') || 
                           el.querySelector('span[aria-label][dir="auto"]') ||
                           el.querySelector('div[aria-label]');
        if (senderSpan) {
          sender = senderSpan.getAttribute('aria-label') || senderSpan.textContent.trim();
        }
      }

      // Voice Note Detection
      const audioEl = el.querySelector('audio');
      const pttButton = el.querySelector('[data-testid="audio-play"]') || 
                        el.querySelector('button[aria-label*="Play"]') || 
                        el.querySelector('button[aria-label*="تشغيل"]') ||
                        el.querySelector('[data-icon="audio-play"]') ||
                        el.querySelector('[data-icon="ptt-play"]');
      const isVoice = Boolean(audioEl || pttButton || el.querySelector('[data-testid="ptt-playback-slider"]'));

      let durationSeconds = 0;
      const durationSpan = el.querySelector('span[data-testid="audio-duration"]') ||
                           el.querySelector('span[aria-label*="second"]') ||
                           el.querySelector('span[aria-label*="ثانية"]');
      if (durationSpan) {
        const text = durationSpan.textContent.trim();
        const [m, s] = text.split(':').map(Number);
        if (!isNaN(m) && !isNaN(s)) durationSeconds = m * 60 + s;
      }

      // Text Message Detection
      let messageText = '';
      const textContainer = el.querySelector('.selectable-text span') || 
                            el.querySelector('[data-testid="selectable-text"]') ||
                            el.querySelector('span[dir="ltr"], span[dir="rtl"]');
      if (textContainer) {
        messageText = textContainer.innerText || textContainer.textContent || '';
      }

      if (!sender && !prePlainText && !messageText && !isVoice) return null;

      const group = getActiveChatGroupName();
      if (!group) return null;

      const msgKey = dataId || (sender + '_' + (messageText || 'audio') + '_' + Date.now());
      if (PROCESSED_MSG_IDS.has(msgKey)) return null;
      PROCESSED_MSG_IDS.add(msgKey);

      return {
        sourceMessageId: msgKey,
        group,
        sender: sender || 'Unknown WhatsApp User',
        type: isVoice ? 'voice' : 'text',
        text: messageText,
        voiceDuration: durationSeconds || (isVoice ? 15 : undefined),
        rawMetadata: {
          prePlainText,
          dataId,
          ariaLabel: el.getAttribute('aria-label') || '',
          hasAudioElement: Boolean(audioEl),
          timestampString: timeText,
        },
      };
    } catch (err) {
      console.warn('[TryGC] Error parsing DOM message:', err);
      return null;
    }
  }

  // 3. Transmit Payload to TryGC Hub Webhook
  async function dispatchToHub(payload) {
    try {
      console.log('[TryGC WhatsApp Bridge] Dispatching message:', payload);
      const res = await fetch(HUB_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log('[TryGC WhatsApp Bridge] Hub response:', data);
    } catch (err) {
      console.error('[TryGC WhatsApp Bridge] Failed to send to Hub (is hub running at localhost:3000?):', err);
    }
  }

  // 4. Continuous Observer using MutationObserver
  function scanVisibleMessages() {
    const chatContainer = document.querySelector('#main') || document.querySelector('[data-testid="conversation-panel-wrapper"]');
    if (!chatContainer) return;

    // Scan message elements
    const messageElements = chatContainer.querySelectorAll('div[data-id], div[role="row"], div.message-in, div.message-out');
    messageElements.forEach((el) => {
      const parsed = parseMessageElement(el);
      if (parsed) {
        dispatchToHub(parsed);
      }
    });
  }

  const observer = new MutationObserver(() => {
    scanVisibleMessages();
  });

  // Start observing once WhatsApp UI is loaded
  const interval = setInterval(() => {
    const main = document.querySelector('#main') || document.querySelector('#app');
    if (main) {
      clearInterval(interval);
      observer.observe(main, { childList: true, subtree: true });
      console.log('[TryGC WhatsApp Bridge] Attached MutationObserver to WhatsApp Web chat tree.');
      // Initial sweep
      scanVisibleMessages();
    }
  }, 2000);

  // Periodic heartbeat sweep every 5 seconds
  setInterval(scanVisibleMessages, 5000);
})();
`;

export const TAMPERMONKEY_USER_SCRIPT = `// ==UserScript==
// @name         TryGC WhatsApp Task Bridge Companion
// @namespace    https://trygc.com/
// @version      1.2.0
// @description  Automatic background monitor for WhatsApp Web to capture authorized Adel HAMMAD requests & voice notes.
// @author       TryGC Engineering
// @match        https://web.whatsapp.com/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==

${COMPANION_CONTENT_JS}
`;
