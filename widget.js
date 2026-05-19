/**
 * AI Chat Widget
 * ─────────────────────────────────────────────────────────────────────────────
 * Configure via window.ChatWidgetConfig before loading this script.
 *
 * EMBED ON ANY WEBSITE:
 *   <script>
 *     window.ChatWidgetConfig = {
 *       webhookUrl:    'https://n8n.srv1666459.hstgr.cloud/webhook/chatbot',
 *       businessName:  'Vertex HVAC Services',
 *       agentName:     'Vertex HVAC Assistant',
 *       primaryColor:  '#f05a28',
 *       greeting:      'Hi! How can I help you today?',
 *       quickReplies:  ['What are your hours?', 'Book an appointment'],
 *       position:      'bottom-right',
 *       poweredBy:     true,
 *       poweredByText: 'YourBrand AI',
 *       poweredByUrl:  'https://yourbrand.com',
 *       avatarEmoji:   '🔧',
 *       placeholder:   'Type a message...'
 *     };
 *   </script>
 *   <script src="widget.js"></script>
 */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────────────── */
  const raw = window.ChatWidgetConfig || {};
  const C = {
    webhookUrl:    raw.webhookUrl    || 'https://n8n.srv1666459.hstgr.cloud/webhook/chatbot-with-webhook',
    businessName:  raw.businessName  || 'Assistant',
    agentName:     raw.agentName     || (raw.businessName ? raw.businessName + ' Assistant' : 'AI Assistant'),
    primaryColor:  raw.primaryColor  || '#6366f1',
    greeting:      raw.greeting      || 'Hi! How can I help you today?',
    quickReplies:  Array.isArray(raw.quickReplies) ? raw.quickReplies : [],
    position:      raw.position      || 'bottom-right',
    poweredBy:     raw.poweredBy     !== undefined ? !!raw.poweredBy : true,
    poweredByText: raw.poweredByText || 'Creed AI',
    poweredByUrl:  raw.poweredByUrl  || '#',
    avatarEmoji:   raw.avatarEmoji   || '💬',
    placeholder:   raw.placeholder   || 'Enter a message...',
  };

  /* ── SESSION ID ──────────────────────────────────────────────────────────── */
  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

  /* ── COLOR UTILS ─────────────────────────────────────────────────────────── */
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };
  }
  const P = hexToRgb(C.primaryColor);
  const rgba = (a) => `rgba(${P.r},${P.g},${P.b},${a})`;

  /* ── STATE ───────────────────────────────────────────────────────────────── */
  let isOpen          = false;
  let isWaiting       = false;
  let quickRepliesOut = false;

  /* ── INJECT STYLES ───────────────────────────────────────────────────────── */
  function injectStyles() {
    const side   = C.position === 'bottom-left' ? 'left' : 'right';
    const origin = C.position === 'bottom-left' ? 'bottom left' : 'bottom right';

    const css = `
.cw-root {
  position: fixed;
  ${side}: 24px;
  bottom: 24px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── LAUNCHER ── */
.cw-launcher {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: ${C.primaryColor};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px ${rgba(0.45)}, 0 1px 4px ${rgba(0.3)};
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
  position: relative;
  margin-${side}: 0;
  margin-${side === 'left' ? 'right' : 'left'}: auto;
  outline: none;
}
.cw-launcher:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 28px ${rgba(0.6)}, 0 2px 6px ${rgba(0.35)};
}
.cw-launcher:focus-visible {
  box-shadow: 0 0 0 3px ${rgba(0.5)};
}
.cw-launcher-icon {
  position: absolute;
  transition: opacity 0.18s, transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
.cw-launcher-icon svg { display: block; fill: white; }
.cw-icon-chat  { opacity: 1; transform: scale(1) rotate(0deg); }
.cw-icon-close { opacity: 0; transform: scale(0.5) rotate(-45deg); }
.cw-launcher.open .cw-icon-chat  { opacity: 0; transform: scale(0.5) rotate(45deg); }
.cw-launcher.open .cw-icon-close { opacity: 1; transform: scale(1) rotate(0deg); }

.cw-pulse {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 14px;
  height: 14px;
  background: #22c55e;
  border-radius: 50%;
  border: 2px solid #0d1117;
  animation: cw-pulse 2.5s ease-in-out infinite;
  transition: opacity 0.2s;
}
.cw-launcher.open .cw-pulse { opacity: 0; }
@keyframes cw-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  60%     { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
}

/* ── WINDOW ── */
.cw-window {
  position: absolute;
  bottom: 70px;
  ${side}: 0;
  width: 360px;
  height: 530px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4);
  transform: scale(0.9) translateY(16px);
  opacity: 0;
  pointer-events: none;
  transform-origin: ${origin};
  transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
}
.cw-window.open {
  transform: scale(1) translateY(0);
  opacity: 1;
  pointer-events: all;
}

/* ── HEADER ── */
.cw-header {
  background: #161b22;
  border-bottom: 1px solid #21262d;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 11px;
  flex-shrink: 0;
  position: relative;
}
.cw-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${rgba(0.35)}, transparent);
}
.cw-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: ${rgba(0.12)};
  border: 1.5px solid ${rgba(0.35)};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px ${rgba(0.08)};
}
.cw-header-info { flex: 1; min-width: 0; }
.cw-header-name {
  font-weight: 600;
  font-size: 14px;
  color: #e6edf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.1px;
}
.cw-header-status {
  font-size: 11px;
  color: #22c55e;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 1px;
}
.cw-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  animation: cw-blink 2.5s ease-in-out infinite;
}
@keyframes cw-blink {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.5; }
}

/* ── MESSAGES ── */
.cw-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
}
.cw-messages::-webkit-scrollbar { width: 3px; }
.cw-messages::-webkit-scrollbar-track { background: transparent; }
.cw-messages::-webkit-scrollbar-thumb { background: #2d333b; border-radius: 2px; }

.cw-msg {
  display: flex;
  flex-direction: column;
  max-width: 82%;
  animation: cw-slide-in 0.22s cubic-bezier(0.34,1.2,0.64,1);
}
@keyframes cw-slide-in {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.cw-msg.user { align-self: flex-end; align-items: flex-end; }
.cw-msg.bot  { align-self: flex-start; align-items: flex-start; }

.cw-bubble {
  padding: 9px 13px;
  border-radius: 16px;
  font-size: 13.5px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}
.cw-msg.user .cw-bubble {
  background: ${C.primaryColor};
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px ${rgba(0.3)};
}
.cw-msg.bot .cw-bubble {
  background: #161b22;
  color: #e6edf3;
  border-bottom-left-radius: 4px;
  border: 1px solid #21262d;
}
.cw-msg-time {
  font-size: 10px;
  color: #484f58;
  margin-top: 3px;
  padding: 0 3px;
}

/* ── TYPING INDICATOR ── */
.cw-typing {
  padding: 0 12px 8px;
  display: none;
  flex-shrink: 0;
}
.cw-typing.visible { display: flex; animation: cw-slide-in 0.2s ease; }
.cw-typing-bubble {
  background: #161b22;
  border: 1px solid #21262d;
  padding: 10px 14px;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  display: flex;
  gap: 4px;
  align-items: center;
}
.cw-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #484f58;
  animation: cw-bounce 1.2s ease-in-out infinite;
}
.cw-dot:nth-child(2) { animation-delay: 0.18s; }
.cw-dot:nth-child(3) { animation-delay: 0.36s; }
@keyframes cw-bounce {
  0%,80%,100% { transform: translateY(0); opacity: 0.4; }
  40%         { transform: translateY(-6px); opacity: 1; }
}

/* ── QUICK REPLIES ── */
.cw-quick-replies {
  padding: 0 12px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}
.cw-qr {
  background: transparent;
  border: 1px solid #30363d;
  color: #c9d1d9;
  font-size: 12px;
  font-family: inherit;
  padding: 5px 13px;
  border-radius: 100px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.1s;
  white-space: nowrap;
  line-height: 1.4;
}
.cw-qr:hover {
  border-color: ${C.primaryColor};
  background: ${rgba(0.1)};
  color: #e6edf3;
  transform: translateY(-1px);
}

/* ── FOOTER / INPUT ── */
.cw-footer {
  border-top: 1px solid #21262d;
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
  background: #161b22;
}
.cw-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 10px;
  padding: 9px 12px;
  color: #e6edf3;
  font-family: inherit;
  font-size: 13.5px;
  resize: none;
  outline: none;
  min-height: 38px;
  max-height: 96px;
  line-height: 1.45;
  transition: border-color 0.15s;
}
.cw-input:focus { border-color: ${rgba(0.55)}; }
.cw-input::placeholder { color: #484f58; }
.cw-input:disabled { opacity: 0.45; cursor: not-allowed; }

.cw-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${C.primaryColor};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: filter 0.15s, transform 0.12s;
  box-shadow: 0 2px 8px ${rgba(0.35)};
  outline: none;
}
.cw-send-btn:hover:not(:disabled) { filter: brightness(1.12); transform: scale(1.06); }
.cw-send-btn:focus-visible { box-shadow: 0 0 0 3px ${rgba(0.4)}; }
.cw-send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
.cw-send-btn svg { width: 16px; height: 16px; fill: white; display: block; }

/* ── POWERED BY ── */
.cw-brand {
  text-align: center;
  padding: 5px 0 7px;
  font-size: 10.5px;
  color: #484f58;
  flex-shrink: 0;
  background: #161b22;
  letter-spacing: 0.1px;
}
.cw-brand a { color: ${rgba(0.7)}; text-decoration: none; }
.cw-brand a:hover { color: ${C.primaryColor}; }

/* ── MOBILE ── */
@media (max-width: 420px) {
  .cw-root { ${side}: 12px; bottom: 12px; }
  .cw-window {
    width: calc(100vw - 24px);
    height: calc(100dvh - 90px);
    ${side}: 0;
  }
}`;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── BUILD DOM ───────────────────────────────────────────────────────────── */
  function buildDOM() {
    const root = document.createElement('div');
    root.className = 'cw-root';
    root.setAttribute('data-cw', '');

    // Quick reply HTML
    const qrHtml = C.quickReplies.map(t =>
      `<button class="cw-qr" data-cw-qr="${t.replace(/"/g, '&quot;')}">${escHtml(t)}</button>`
    ).join('');

    const brandHtml = C.poweredBy
      ? `<div class="cw-brand">Powered by <a href="${C.poweredByUrl}" target="_blank" rel="noopener">${escHtml(C.poweredByText)}</a></div>`
      : '';

    root.innerHTML = `
      <button class="cw-launcher" id="cw-launcher" aria-label="Open chat" aria-expanded="false">
        <div class="cw-pulse"></div>
        <span class="cw-launcher-icon cw-icon-chat">
          <svg width="26" height="26" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </span>
        <span class="cw-launcher-icon cw-icon-close">
          <svg width="22" height="22" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </span>
      </button>

      <div class="cw-window" id="cw-window" role="dialog" aria-label="${escHtml(C.agentName)} chat window">
        <div class="cw-header">
          <div class="cw-avatar" aria-hidden="true">${C.avatarEmoji}</div>
          <div class="cw-header-info">
            <div class="cw-header-name">${escHtml(C.agentName)}</div>
            <div class="cw-header-status"><span class="cw-status-dot"></span>Online now</div>
          </div>
        </div>

        <div class="cw-messages" id="cw-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>

        <div class="cw-typing" id="cw-typing" aria-hidden="true">
          <div class="cw-typing-bubble">
            <div class="cw-dot"></div>
            <div class="cw-dot"></div>
            <div class="cw-dot"></div>
          </div>
        </div>

        <div class="cw-quick-replies" id="cw-quick-replies">${qrHtml}</div>

        <div class="cw-footer">
          <textarea
            class="cw-input"
            id="cw-input"
            placeholder="${escHtml(C.placeholder)}"
            rows="1"
            aria-label="Message input"
          ></textarea>
          <button class="cw-send-btn" id="cw-send" aria-label="Send message">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>

        ${brandHtml}
      </div>
    `;

    document.body.appendChild(root);
  }

  /* ── LOGIC ───────────────────────────────────────────────────────────────── */
  function initLogic() {
    const launcher = document.getElementById('cw-launcher');
    const win      = document.getElementById('cw-window');
    const msgList  = document.getElementById('cw-messages');
    const typing   = document.getElementById('cw-typing');
    const qrWrap   = document.getElementById('cw-quick-replies');
    const input    = document.getElementById('cw-input');
    const sendBtn  = document.getElementById('cw-send');

    // ── Toggle open/close ──
    launcher.addEventListener('click', function () {
      isOpen = !isOpen;
      launcher.classList.toggle('open', isOpen);
      launcher.setAttribute('aria-expanded', isOpen);
      win.classList.toggle('open', isOpen);

      if (isOpen && msgList.children.length === 0) {
        addMsg('bot', C.greeting);
      }
      if (isOpen) {
        setTimeout(function () { input.focus(); }, 300);
      }
    });

    // ── Quick reply clicks ──
    qrWrap.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-cw-qr]');
      if (btn) send(btn.getAttribute('data-cw-qr'));
    });

    // ── Send on Enter ──
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(input.value);
      }
    });

    // ── Auto-resize textarea ──
    input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 96) + 'px';
    });

    // ── Send button ──
    sendBtn.addEventListener('click', function () {
      send(input.value);
    });

    // ── Add message to UI ──
    function addMsg(role, text) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const div = document.createElement('div');
      div.className = 'cw-msg ' + role;
      div.innerHTML =
        '<div class="cw-bubble">' + escHtml(text) + '</div>' +
        '<div class="cw-msg-time">' + now + '</div>';
      msgList.appendChild(div);
      msgList.scrollTop = msgList.scrollHeight;

      // Hide quick replies after first user message
      if (role === 'user' && !quickRepliesOut) {
        quickRepliesOut = true;
        qrWrap.style.display = 'none';
      }
    }

    // ── Loading state ──
    function setLoading(on) {
      isWaiting         = on;
      sendBtn.disabled  = on;
      input.disabled    = on;
      typing.classList.toggle('visible', on);
      msgList.scrollTop = msgList.scrollHeight;
    }

    // ── Send message ──
    async function send(text) {
      text = (text || '').trim();
      if (!text || isWaiting) return;
      input.value = '';
      input.style.height = 'auto';
      addMsg('user', text);
      setLoading(true);

      try {
        let reply;
        if (C.webhookUrl) {
          const res = await fetch(C.webhookUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ sessionId: sessionId, message: text })
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          reply = data.response || data.message || data.text || JSON.stringify(data);
        } else {
          // Demo mode — no webhook configured
          await delay(1300);
          reply = demoReply(text);
        }
        setLoading(false);
        addMsg('bot', reply);
      } catch (err) {
        setLoading(false);
        addMsg('bot', 'Sorry, I\'m having trouble connecting right now. Please contact us directly for immediate help.');
        console.error('[ChatWidget]', err);
      }
    }

    // ── Demo mode replies ──
    function demoReply(msg) {
      const m = msg.toLowerCase();
      if (/hours?|open|close|time/.test(m))
        return 'Our hours are Monday\u2013Friday 7am\u20136pm and Saturday 8am\u20132pm. We also have 24/7 emergency availability!';
      if (/area|zip|locat|serv|cover/.test(m))
        return 'We serve the Kansas City metro area including zip codes 64101\u201364199. Tell me your zip and I can confirm!';
      if (/book|appoint|schedul|availab/.test(m))
        return 'Absolutely! You can book online at ' + (raw.bookingLink || 'our website') + ' or call us and we\'ll get you set up.';
      if (/price|cost|much|rate|fee/.test(m))
        return 'Pricing depends on the service. Our diagnostic fee starts at $89 and we always provide a written estimate before any work begins.';
      if (/emerg|urgent|tonight|now/.test(m))
        return 'Yes \u2014 we offer 24/7 emergency service. Call us right now and we\'ll dispatch a technician to you.';
      if (/furnace|hvac|heat|cool|ac|air/.test(m))
        return 'Yes, we handle all HVAC services including furnace repair and installation, AC service, and preventive tune-ups. Would you like to book a visit?';
      return 'Great question! Our team would be happy to help with that. Give us a call or book online and we\'ll get you sorted out quickly.';
    }
  }

  /* ── HELPERS ─────────────────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* ── INIT ────────────────────────────────────────────────────────────────── */
  function init() {
    injectStyles();
    buildDOM();
    initLogic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
