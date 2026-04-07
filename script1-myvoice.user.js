// ==UserScript==
// @name         MyVoice → Asana Bridge UNIVERSAL
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  MyVoice to Asana - configurable for any FC site
// @author       Atlas
// @match        https://myvoice.pxt.amazon.dev/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      api.groq.com
// @connect      generativelanguage.googleapis.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var LOG = function(m) {
        console.log('%c[MV→Asana] ' + m, 'color:#ff9900;font-weight:bold');
    };

    // ═══════════════════════════════════════════════════════
    //  STORAGE KEYS
    // ═══════════════════════════════════════════════════════
    var CFG_ASANA_URL    = 'mv_cfg_asana_url';
    var CFG_SECTION      = 'mv_cfg_section_name';
    var CFG_SETUP_DONE   = 'mv_cfg_setup_done';
    var SENT_KEY         = 'mv_asana_sent_ids';
    var GROQ_KEY_STORE   = 'mv_groq_api_key';
    var GEMINI_KEY_STORE = 'mv_gemini_api_key';
    var DEBOUNCE_MS      = 1200;

    // ═══════════════════════════════════════════════════════
    //  READ CONFIG
    // ═══════════════════════════════════════════════════════
    function getConfig() {
        return {
            asanaUrl:    GM_getValue(CFG_ASANA_URL,  ''),
            sectionName: GM_getValue(CFG_SECTION,    'My Voice'),
            setupDone:   GM_getValue(CFG_SETUP_DONE, false),
        };
    }

    // ═══════════════════════════════════════════════════════
    //  STYLES
    // ═══════════════════════════════════════════════════════
    GM_addStyle([
        '.mv-btn{',
        '  display:inline-flex!important;align-items:center!important;gap:5px!important;',
        '  padding:4px 12px!important;margin-left:8px!important;background:#f06a35!important;',
        '  color:#fff!important;border:none!important;border-radius:6px!important;',
        '  font-size:11px!important;font-weight:600!important;cursor:pointer!important;',
        '  z-index:9999!important;font-family:sans-serif!important;',
        '  transition:background 0.2s!important;vertical-align:middle!important;}',
        '.mv-btn:hover{background:#d4551f!important;}',
        '.mv-btn.sent{background:#27ae60!important;cursor:default!important;pointer-events:none!important;}',
        '#mv-cfg-btn{position:fixed!important;bottom:20px!important;right:20px!important;',
        '  width:42px!important;height:42px!important;background:#f06a35!important;',
        '  color:#fff!important;border:none!important;border-radius:50%!important;',
        '  font-size:20px!important;cursor:pointer!important;z-index:2147483640!important;',
        '  box-shadow:0 3px 12px rgba(240,106,53,0.4)!important;transition:transform 0.2s!important;}',
        '#mv-cfg-btn:hover{transform:scale(1.12) rotate(30deg)!important;}',
        '.mv-ov{position:fixed!important;inset:0!important;background:rgba(0,0,0,0.55)!important;',
        '  z-index:2147483645!important;display:flex!important;align-items:center!important;',
        '  justify-content:center!important;}',
        '.mv-dlg{background:#fff!important;border-radius:14px!important;padding:26px 30px!important;',
        '  max-width:620px!important;width:92vw!important;',
        '  box-shadow:0 12px 48px rgba(0,0,0,0.22)!important;',
        '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;',
        '  color:#1e1e1e!important;max-height:90vh!important;overflow-y:auto!important;}',
        '.mv-dlg h2{margin:0 0 16px!important;font-size:18px!important;color:#f06a35!important;',
        '  display:flex!important;align-items:center!important;gap:8px!important;}',
        '.mv-dlg h3{margin:0 0 12px!important;font-size:14px!important;color:#333!important;',
        '  border-bottom:2px solid #f5ddd0!important;padding-bottom:8px!important;}',
        '.mv-f{margin-bottom:15px!important;}',
        '.mv-f label{display:block!important;font-size:11px!important;font-weight:700!important;',
        '  color:#666!important;text-transform:uppercase!important;letter-spacing:.5px!important;',
        '  margin-bottom:5px!important;}',
        '.mv-f input,.mv-f textarea{width:100%!important;border:1.5px solid #ddd!important;',
        '  border-radius:8px!important;padding:9px 12px!important;font-size:13px!important;',
        '  box-sizing:border-box!important;',
        '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;',
        '  resize:vertical!important;color:#222!important;line-height:1.5!important;}',
        '.mv-f input:focus,.mv-f textarea:focus{outline:none!important;border-color:#f06a35!important;',
        '  box-shadow:0 0 0 3px rgba(240,106,53,0.15)!important;}',
        '.mv-note{font-size:11px!important;color:#999!important;margin-top:4px!important;}',
        '.mv-note a{color:#f06a35!important;}',
        '.mv-infobox{background:#fef9f5!important;border:1px solid #f5ddd0!important;',
        '  border-radius:8px!important;padding:12px 14px!important;',
        '  font-size:12px!important;color:#555!important;line-height:1.7!important;}',
        '.mv-infobox.setup{background:#e8f4fd!important;border-color:#bee3f8!important;',
        '  color:#2c5282!important;margin-bottom:16px!important;}',
        '.mv-acts{display:flex!important;gap:10px!important;',
        '  justify-content:flex-end!important;margin-top:20px!important;}',
        '.mv-ghost{padding:9px 20px!important;border:1px solid #ddd!important;',
        '  background:#fff!important;border-radius:8px!important;',
        '  cursor:pointer!important;font-size:13px!important;color:#555!important;}',
        '.mv-ghost:hover{background:#f5f5f5!important;}',
        '.mv-primary{padding:9px 24px!important;background:#f06a35!important;color:#fff!important;',
        '  border:none!important;border-radius:8px!important;cursor:pointer!important;',
        '  font-size:13px!important;font-weight:700!important;min-width:180px!important;}',
        '.mv-primary:hover{background:#d4551f!important;}',
        '.mv-primary:disabled{background:#ccc!important;cursor:wait!important;}',
        '.mv-danger{padding:9px 20px!important;background:#e74c3c!important;color:#fff!important;',
        '  border:none!important;border-radius:8px!important;cursor:pointer!important;',
        '  font-size:13px!important;}',
        '.mv-danger:hover{background:#c0392b!important;}',
        '@keyframes mv-spin{to{transform:rotate(360deg)}}',
        '.mv-spin{display:inline-block!important;width:13px!important;height:13px!important;',
        '  border:2px solid #fff!important;border-top-color:transparent!important;',
        '  border-radius:50%!important;animation:mv-spin 0.7s linear infinite!important;',
        '  vertical-align:middle!important;margin-right:5px!important;}',
        '.mv-badge{display:inline-flex!important;align-items:center!important;',
        '  background:#e8f5e9!important;color:#2e7d32!important;font-size:10px!important;',
        '  font-weight:700!important;padding:2px 7px!important;border-radius:10px!important;',
        '  margin-left:6px!important;}',
        '.mv-badge.cfg{background:#e8f4fd!important;color:#2c5282!important;}',
        '.mv-orig{background:#f7f7f7!important;border-left:3px solid #ddd!important;',
        '  padding:10px 14px!important;font-size:12px!important;color:#555!important;',
        '  border-radius:0 6px 6px 0!important;margin-bottom:14px!important;',
        '  max-height:110px!important;overflow-y:auto!important;',
        '  white-space:pre-wrap!important;line-height:1.5!important;}',
        '.mv-wk-wrap{display:flex!important;align-items:stretch!important;gap:8px!important;}',
        '.mv-wk-tag{background:#f06a35!important;color:#fff!important;font-weight:700!important;',
        '  font-size:13px!important;padding:9px 12px!important;border-radius:8px!important;',
        '  white-space:nowrap!important;flex-shrink:0!important;',
        '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;',
        '  border:1.5px solid #d4551f!important;',
        '  display:flex!important;align-items:center!important;}',
        '.mv-wk-wrap input{flex:1!important;min-width:0!important;margin:0!important;}',
        '.mv-divider{border:none!important;border-top:1px solid #eee!important;margin:18px 0!important;}',
    ].join('\n'));

    // ═══════════════════════════════════════════════════════
    //  UTILITY
    // ═══════════════════════════════════════════════════════
    function esc(s) {
        return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function getISOWeek(date) {
        var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - y) / 86400000) + 1) / 7);
    }

    function parseRelativeTime(relText) {
        var t = (relText || '').trim().toLowerCase();
        var now = new Date();
        var match = t.match(/^(\d+)\s*(s|mo|m|h|d|w|y)/);
        if (!match) return now;
        var num = parseInt(match[1], 10);
        var unit = match[2];
        var ms = 0;
        if (unit === 's')       ms = num * 1000;
        else if (unit === 'mo') ms = num * 30 * 86400 * 1000;
        else if (unit === 'm')  ms = num * 60 * 1000;
        else if (unit === 'h')  ms = num * 3600 * 1000;
        else if (unit === 'd')  ms = num * 86400 * 1000;
        else if (unit === 'w')  ms = num * 7 * 86400 * 1000;
        else if (unit === 'y')  ms = num * 365 * 86400 * 1000;
        return new Date(now.getTime() - ms);
    }

    function getSentIds() {
        try { return JSON.parse(GM_getValue(SENT_KEY, '[]')); } catch(e) { return []; }
    }

    function markSent(id) {
        var ids = getSentIds();
        if (ids.indexOf(id) === -1) ids.push(id);
        GM_setValue(SENT_KEY, JSON.stringify(ids));
    }

    function stripWkTag(s) {
        return (s||'').replace(/^\[WK\d{1,2}\]\s*/i, '').trim();
    }

    function encodeTaskForURL(taskData) {
        try {
            var json = JSON.stringify(taskData);
            var encoded = btoa(unescape(encodeURIComponent(json)));
            return encodeURIComponent(encoded);
        } catch(e) { return null; }
    }

    // ═══════════════════════════════════════════════════════
    //  SETUP DIALOG (first run only)
    // ═══════════════════════════════════════════════════════
    function showSetupDialog(onComplete) {
        var overlay = document.createElement('div');
        overlay.className = 'mv-ov';
        var box = document.createElement('div');
        box.className = 'mv-dlg';
        box.innerHTML =
            '<h2>' +
            '<svg width="22" height="22" viewBox="0 0 32 32" fill="none">' +
            '<circle cx="16" cy="8" r="5" fill="#f06a35"/>' +
            '<circle cx="8" cy="22" r="5" fill="#f06a35"/>' +
            '<circle cx="24" cy="22" r="5" fill="#f06a35"/>' +
            '</svg>Setup MyVoice → Asana</h2>' +
            '<div class="mv-infobox setup">' +
            '👋 <b>Welcome!</b> Configure your personal settings once. ' +
            'Everything is saved locally in your browser.' +
            '</div>' +
            '<h3>🔗 Asana Settings</h3>' +
            '<div class="mv-f">' +
            '<label>Asana Project URL</label>' +
            '<input type="url" id="setup-asana-url" ' +
            'placeholder="https://app.asana.com/1/.../list/..."/>' +
            '<div class="mv-note">' +
            'Open your Asana project → click List view → copy the URL from the browser address bar.' +
            '</div></div>' +
            '<div class="mv-f">' +
            '<label>Asana Section Name</label>' +
            '<input type="text" id="setup-section" value="My Voice" ' +
            'placeholder="e.g. My Voice, Gemba, Actions"/>' +
            '<div class="mv-note">' +
            'The exact name of the section in Asana where tasks will be created. ' +
            'Capitalisation and spaces must match exactly.' +
            '</div></div>' +
            '<hr class="mv-divider"/>' +
            '<h3>🤖 AI Settings (optional but recommended)</h3>' +
            '<div class="mv-f">' +
            '<label>🟢 Groq API Key — Free</label>' +
            '<input type="password" id="setup-groq" placeholder="gsk_..."/>' +
            '<div class="mv-note">' +
            'Get your free key at ' +
            '<a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a> ' +
            '→ Sign in with Google → Create API Key. No credit card needed.' +
            '</div></div>' +
            '<div class="mv-f">' +
            '<label>🔵 Gemini API Key — Fallback (optional)</label>' +
            '<input type="password" id="setup-gemini" placeholder="AIza..."/>' +
            '</div>' +
            '<div id="setup-error" style="color:#e74c3c;font-size:12px;min-height:16px;margin-bottom:8px"></div>' +
            '<div class="mv-acts">' +
            '<button class="mv-primary" id="setup-save">✅ Save and Start</button>' +
            '</div>';
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById('setup-save').onclick = function() {
            var asanaUrl  = document.getElementById('setup-asana-url').value.trim();
            var section   = document.getElementById('setup-section').value.trim();
            var groqKey   = document.getElementById('setup-groq').value.trim();
            var geminiKey = document.getElementById('setup-gemini').value.trim();
            var errEl     = document.getElementById('setup-error');

            if (!asanaUrl) {
                errEl.textContent = '❌ Please enter your Asana project URL.';
                return;
            }
            if (!asanaUrl.includes('asana.com')) {
                errEl.textContent = '❌ Invalid URL. It must contain asana.com.';
                return;
            }
            if (!section) {
                errEl.textContent = '❌ Please enter the Asana section name.';
                return;
            }

            GM_setValue(CFG_ASANA_URL,  asanaUrl);
            GM_setValue(CFG_SECTION,    section);
            GM_setValue(CFG_SETUP_DONE, true);
            if (groqKey)   GM_setValue(GROQ_KEY_STORE,   groqKey);
            if (geminiKey) GM_setValue(GEMINI_KEY_STORE, geminiKey);

            LOG('Setup complete. Asana: ' + asanaUrl);
            overlay.remove();
            onComplete();
        };
    }

    // ═══════════════════════════════════════════════════════
    //  EXTRACT COMMENT DATA FROM DOM
    // ═══════════════════════════════════════════════════════
    function extractData(card) {
        var bodyEl = card.querySelector(
            'div[data-test-component="StencilText"][style*="white-space: pre-line"]'
        );
        var body = bodyEl ? (bodyEl.textContent || '').trim() : '';
        if (!body) {
            var allST = card.querySelectorAll('div[data-test-component="StencilText"]');
            var maxLen = 0;
            for (var i = 0; i < allST.length; i++) {
                var t = (allST[i].textContent || '').trim();
                if (t.length > maxLen && t.length > 30) { maxLen = t.length; body = t; }
            }
        }

        var authorLogin = '';
        var avatarEl = card.querySelector('[data-test-id^="Avatar_"]');
        if (avatarEl) {
            authorLogin = (avatarEl.getAttribute('data-test-id') || '')
                .replace('Avatar_', '').trim();
        }
        if (!authorLogin) {
            var links = card.querySelectorAll('a[data-test-component="StencilLink"]');
            for (var j = 0; j < links.length; j++) {
                var lt = (links[j].textContent || '').trim();
                if (lt.endsWith('@')) { authorLogin = lt.replace('@', '').trim(); break; }
            }
        }

        var authorName = '';
        var nameEl = card.querySelector('div[data-test-component="StencilText"][role="link"]');
        if (nameEl) authorName = (nameEl.textContent || '').trim();

        var status = '';
        var statusEl = card.querySelector('div[data-test-component="StencilText"].css-c109xt');
        if (statusEl) status = (statusEl.textContent || '').trim();
        else {
            var ft = card.textContent || '';
            if (ft.indexOf('Closed') !== -1) status = 'Closed';
            else if (ft.indexOf('Open') !== -1) status = 'Open';
        }

        var assignedTo = '';
        var am = (card.textContent || '').match(/Assigned to:\s*([a-zA-Z0-9_]+)/i);
        if (am) assignedTo = am[1].trim();

        var cardId = '';
        var viewEl = card.querySelector('div[data-test-component="StencilReactView"][id]');
        if (viewEl) cardId = viewEl.getAttribute('id') || '';
        if (!cardId && body) {
            cardId = btoa(encodeURIComponent(body.substring(0, 40)))
                .replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
        }

        var commentDate = new Date();
        var timeEl = card.querySelector('div[data-test-component="StencilText"].css-185s50y');
        if (timeEl) {
            commentDate = parseRelativeTime((timeEl.textContent || '').trim());
        }
        var commentWeek    = getISOWeek(commentDate);
        var commentWeekTag = '[WK' + (commentWeek < 10 ? '0' : '') + commentWeek + ']';

        return {
            body: body, authorLogin: authorLogin, authorName: authorName,
            assignedTo: assignedTo, status: status, cardId: cardId,
            weekTag: commentWeekTag, isoWeek: commentWeek,
            commentDate: commentDate.toISOString().split('T')[0],
        };
    }

    // ═══════════════════════════════════════════════════════
    //  AI — GROQ
    // ═══════════════════════════════════════════════════════
    function callGroq(body, authorLogin) {
        var apiKey = GM_getValue(GROQ_KEY_STORE, '');
        if (!apiKey) return Promise.reject(new Error('Groq not configured'));
        var prompt =
            'You are an assistant analysing requests from Amazon warehouse employees.\n\n' +
            'TEXT (written by ' + authorLogin + '):\n"""\n' + body + '\n"""\n\n' +
            'Generate TWO outputs in the same language as the text above:\n' +
            '1. TITLE: max 8 words, key concept only, no greetings, no emoji.\n' +
            '2. DESCRIPTION: third person professional tone. Start with "' +
            authorLogin + ' reports that..." or "' + authorLogin + ' requests that..."\n\n' +
            'Format exactly:\nTITLE: [here]\nDESCRIPTION: [here]';

        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://api.groq.com/openai/v1/chat/completions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey,
                },
                data: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 400,
                    temperature: 0.25,
                }),
                onload: function(res) {
                    try {
                        var data = JSON.parse(res.responseText);
                        if (data.choices && data.choices[0]) {
                            resolve(data.choices[0].message.content.trim());
                        } else if (data.error) {
                            reject(new Error('Groq: ' + data.error.message));
                        } else {
                            reject(new Error('Groq: empty response'));
                        }
                    } catch(e) { reject(e); }
                },
                onerror: function() { reject(new Error('Groq: network error')); },
            });
        });
    }

    function callGemini(body, authorLogin) {
        var apiKey = GM_getValue(GEMINI_KEY_STORE, '');
        if (!apiKey) return Promise.reject(new Error('Gemini not configured'));
        var prompt =
            'Amazon employee (' + authorLogin + ') wrote:\n' + body + '\n\n' +
            'TITLE: [max 8 words, key concept]\n' +
            'DESCRIPTION: [' + authorLogin + ' reports/requests that... third person]';

        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.25, maxOutputTokens: 400 },
                }),
                onload: function(res) {
                    try {
                        var data = JSON.parse(res.responseText);
                        if (data.candidates && data.candidates[0]) {
                            resolve(data.candidates[0].content.parts[0].text.trim());
                        } else if (data.error) {
                            reject(new Error('Gemini: ' + data.error.message));
                        } else {
                            reject(new Error('Gemini: empty response'));
                        }
                    } catch(e) { reject(e); }
                },
                onerror: function() { reject(new Error('Gemini: network error')); },
            });
        });
    }

    function parseAIResponse(raw, authorLogin, bodyFallback) {
        var titleMatch = raw.match(/TITLE:\s*(.+)/i);
        var descMatch  = raw.match(/DESCRIPTION:\s*([\s\S]+)/i);
        var title = titleMatch
            ? stripWkTag(titleMatch[1].trim().replace(/^["'\-\s]+|["'\-\s]+$/g, ''))
            : '';
        var desc = descMatch ? descMatch[1].trim() : '';
        if (!title) title = stripWkTag(bodyFallback.substring(0, 60));
        if (!desc)  desc  = authorLogin + ' reports: ' + bodyFallback;
        return { title: title, desc: desc };
    }

    function offlineGenerate(body, authorLogin) {
        var t = body.toLowerCase();
        var title = '';
        var patterns = [
            { keys: ['jack stand'],                   out: 'Missing jack stand in area'         },
            { keys: ['safety', 'sicurezza'],          out: 'Safety issue reported'              },
            { keys: ['floor', 'pavimento', 'slipp'],  out: 'Floor condition issue'              },
            { keys: ['shift', 'turno', 'schedule'],   out: 'Shift schedule request'             },
            { keys: ['broken', 'guasto', 'rotto'],    out: 'Equipment malfunction reported'     },
            { keys: ['suggestion', 'proposta'],       out: 'Process improvement suggestion'     },
            { keys: ['protection', 'protezione'],     out: 'Protection equipment request'       },
            { keys: ['shuttle'],                      out: 'Shuttle organisation issue'         },
            { keys: ['transpallet', 'pallet jack'],   out: 'Pallet jack issue reported'         },
            { keys: ['radio'],                        out: 'Radio communication improvement'    },
            { keys: ['temperature', 'temperatura'],   out: 'Temperature issue in area'          },
            { keys: ['noise', 'rumore'],              out: 'Noise issue reported'               },
            { keys: ['training', 'formazione'],       out: 'Training request'                   },
        ];
        for (var i = 0; i < patterns.length; i++) {
            for (var j = 0; j < patterns[i].keys.length; j++) {
                if (t.indexOf(patterns[i].keys[j]) !== -1) { title = patterns[i].out; break; }
            }
            if (title) break;
        }
        if (!title) {
            var words = body.split(/\s+/).filter(function(w) { return w.length > 4; });
            title = words.slice(0, 5).join(' ').substring(0, 55);
        }
        var cleanBody = body
            .replace(/^(buongiorno|buonasera|ciao|salve|hello|hi|good morning|good evening)[,!\.\s]+/i, '')
            .replace(/[🙂😊👍🤗😀]/g, '').trim();
        var desc = authorLogin + ' reports that ' +
            cleanBody.charAt(0).toLowerCase() + cleanBody.slice(1);
        if (desc.length > 500) desc = desc.substring(0, 497) + '...';
        return { title: title, desc: desc, provider: 'offline' };
    }

    async function generateContent(body, authorLogin) {
        if (GM_getValue(GROQ_KEY_STORE, '')) {
            try {
                var rawG = await callGroq(body, authorLogin);
                var pg = parseAIResponse(rawG, authorLogin, body);
                pg.provider = 'groq';
                return pg;
            } catch(e) { LOG('Groq failed: ' + e.message); }
        }
        if (GM_getValue(GEMINI_KEY_STORE, '')) {
            try {
                var rawGm = await callGemini(body, authorLogin);
                var pgm = parseAIResponse(rawGm, authorLogin, body);
                pgm.provider = 'gemini';
                return pgm;
            } catch(e) { LOG('Gemini failed: ' + e.message); }
        }
        return offlineGenerate(body, authorLogin);
    }

    // ═══════════════════════════════════════════════════════
    //  PREVIEW DIALOG
    // ═══════════════════════════════════════════════════════
    async function showPreview(data, onConfirm) {
        var cfg = getConfig();
        var providerLabel = { groq: '🟢 GROQ', gemini: '🔵 GEMINI', offline: '🟡 OFFLINE' };
        var overlay = document.createElement('div');
        overlay.className = 'mv-ov';
        var box = document.createElement('div');
        box.className = 'mv-dlg';

        box.innerHTML =
            '<h2>' +
            '<svg width="22" height="22" viewBox="0 0 32 32" fill="none">' +
            '<circle cx="16" cy="8" r="5" fill="#f06a35"/>' +
            '<circle cx="8" cy="22" r="5" fill="#f06a35"/>' +
            '<circle cx="24" cy="22" r="5" fill="#f06a35"/>' +
            '</svg>Asana Task Preview' +
            '<span class="mv-badge cfg">📂 ' + esc(cfg.sectionName) + '</span>' +
            '</h2>' +
            '<div class="mv-orig">' +
            '<strong style="color:#aaa;font-size:10px;text-transform:uppercase">Original comment:</strong><br>' +
            esc(data.body) + '</div>' +
            '<div class="mv-f">' +
            '<label>Task Name <span id="mv-title-badge" class="mv-badge" style="display:none">AI</span></label>' +
            '<div class="mv-wk-wrap">' +
            '<span class="mv-wk-tag" title="Week of comment: ' + esc(data.commentDate) + '">' +
            esc(data.weekTag) + '</span>' +
            '<input type="text" id="mv-name" placeholder="Generating..." maxlength="250"/>' +
            '</div>' +
            '<div class="mv-note">Comment week: <b>' + esc(data.weekTag) + '</b> (estimated: ' + esc(data.commentDate) + ')</div>' +
            '</div>' +
            '<div class="mv-f">' +
            '<label>Description <span id="mv-desc-badge" class="mv-badge" style="display:none">AI</span></label>' +
            '<textarea id="mv-desc" rows="5" placeholder="Generating..."></textarea>' +
            '</div>' +
            '<div class="mv-f">' +
            '<label>Assignee (Amazon login)</label>' +
            '<input type="text" id="mv-assignee" value="' + esc(data.assignedTo) + '" placeholder="e.g. franrago"/>' +
            '<div class="mv-note">Auto-detected from "Assigned to:" field</div>' +
            '</div>' +
            '<div class="mv-infobox">' +
            '👤 <b>' + esc(data.authorName) + '</b> (' + esc(data.authorLogin) + ')' +
            ' &bull; 📊 ' + esc(data.status || 'N/A') +
            ' &bull; 🗓️ ' + esc(data.weekTag) +
            '</div>' +
            '<div class="mv-acts">' +
            '<button class="mv-ghost" id="mv-cancel">Cancel</button>' +
            '<button class="mv-primary" id="mv-send" disabled>' +
            '<span class="mv-spin"></span>Generating AI...</button>' +
            '</div>' +
            '<div id="mv-status" style="text-align:center;margin-top:10px;font-size:12px;color:#999;min-height:16px"></div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var nameInput  = document.getElementById('mv-name');
        var descInput  = document.getElementById('mv-desc');
        var sendBtn    = document.getElementById('mv-send');
        var statusEl   = document.getElementById('mv-status');
        var titleBadge = document.getElementById('mv-title-badge');
        var descBadge  = document.getElementById('mv-desc-badge');

        document.getElementById('mv-cancel').onclick = function() { overlay.remove(); };
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

        try {
            statusEl.textContent = '🤖 AI is processing...';
            var result = await generateContent(data.body, data.authorLogin);
            nameInput.value = stripWkTag(result.title);
            descInput.value = result.desc;
            var pl = providerLabel[result.provider] || result.provider.toUpperCase();
            titleBadge.textContent = pl; descBadge.textContent = pl;
            titleBadge.style.display = 'inline-flex'; descBadge.style.display = 'inline-flex';
            statusEl.innerHTML = '✅ <span style="color:#27ae60">Generated with ' + pl + '! Edit if needed.</span>';
        } catch(e) {
            nameInput.placeholder = 'Enter a short title...';
            descInput.value = data.authorLogin + ' reports: ' + data.body;
            statusEl.innerHTML = '⚠️ <span style="color:#e67e22">AI unavailable. Fill in manually.</span>';
        }

        sendBtn.disabled = false;
        sendBtn.textContent = '🚀 Open Asana and Create Task';

        sendBtn.onclick = function() {
            var rawTitle = nameInput.value.trim();
            if (!rawTitle) { nameInput.style.borderColor = '#e74c3c'; nameInput.focus(); return; }
            var taskData = {
                name:        data.weekTag + ' ' + stripWkTag(rawTitle),
                desc:        descInput.value.trim(),
                assignee:    document.getElementById('mv-assignee').value.trim(),
                commentId:   data.cardId,
                sectionName: cfg.sectionName,
            };
            overlay.remove();
            onConfirm(taskData);
        };
    }

    // ═══════════════════════════════════════════════════════
    //  SETTINGS DIALOG
    // ═══════════════════════════════════════════════════════
    function showSettings() {
        var cfg = getConfig();
        var overlay = document.createElement('div');
        overlay.className = 'mv-ov';
        var box = document.createElement('div');
        box.className = 'mv-dlg';
        box.style.maxWidth = '520px';

        box.innerHTML =
            '<h2>⚙️ Settings</h2>' +
            '<h3>🔗 Asana Configuration</h3>' +
            '<div class="mv-f">' +
            '<label>Asana Project URL</label>' +
            '<input type="url" id="cfg-asana-url" value="' + esc(cfg.asanaUrl) + '" ' +
            'placeholder="https://app.asana.com/..."/>' +
            '<div class="mv-note">URL from your Asana project browser address bar.</div>' +
            '</div>' +
            '<div class="mv-f">' +
            '<label>Asana Section Name</label>' +
            '<input type="text" id="cfg-section" value="' + esc(cfg.sectionName) + '" ' +
            'placeholder="e.g. My Voice"/>' +
            '</div>' +
            '<hr class="mv-divider"/>' +
            '<h3>🤖 AI Provider</h3>' +
            '<div class="mv-infobox" style="margin-bottom:14px;font-size:12px;line-height:1.8">' +
            '1. 🟢 <b>Groq</b> — Free → ' +
            '<a href="https://console.groq.com/keys" target="_blank" style="color:#f06a35">console.groq.com/keys</a><br>' +
            '2. 🔵 <b>Gemini</b> — Fallback<br>' +
            '3. 🟡 <b>Offline</b> — Always available' +
            '</div>' +
            '<div class="mv-f">' +
            '<label>🟢 Groq API Key</label>' +
            '<input type="password" id="cfg-groq" value="' + esc(GM_getValue(GROQ_KEY_STORE,'')) + '" placeholder="gsk_..."/>' +
            '<div class="mv-note">' + (GM_getValue(GROQ_KEY_STORE,'') ? '✅ Configured' : '⚠️ Not configured') + '</div>' +
            '</div>' +
            '<div class="mv-f">' +
            '<label>🔵 Gemini API Key</label>' +
            '<input type="password" id="cfg-gemini" value="' + esc(GM_getValue(GEMINI_KEY_STORE,'')) + '" placeholder="AIza..."/>' +
            '<div class="mv-note">' + (GM_getValue(GEMINI_KEY_STORE,'') ? '✅ Configured' : '⚠️ Not configured') + '</div>' +
            '</div>' +
            '<hr class="mv-divider"/>' +
            '<h3>🗂️ Management</h3>' +
            '<div class="mv-f">' +
            '<div style="display:flex;align-items:center;gap:14px">' +
            '<span class="mv-note">' + getSentIds().length + ' comments already sent</span>' +
            '<button class="mv-ghost" id="cfg-reset-sent" style="font-size:11px;padding:5px 14px">🗑️ Reset history</button>' +
            '</div></div>' +
            '<div class="mv-acts">' +
            '<button class="mv-ghost" id="cfg-cancel">Close</button>' +
            '<button class="mv-danger" id="cfg-reset-all" style="margin-right:auto">🔄 Full Reset</button>' +
            '<button class="mv-primary" id="cfg-save">💾 Save</button>' +
            '</div>' +
            '<div id="cfg-status" style="text-align:center;margin-top:10px;font-size:12px;min-height:16px"></div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById('cfg-cancel').onclick = function() { overlay.remove(); };
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

        document.getElementById('cfg-reset-sent').onclick = function() {
            GM_setValue(SENT_KEY, '[]');
            this.textContent = '✅ Done!';
            document.querySelectorAll('.mv-btn.sent').forEach(function(b) {
                b.classList.remove('sent');
                b.textContent = '⬆ Send to Asana';
            });
        };

        document.getElementById('cfg-reset-all').onclick = function() {
            if (!confirm('Full reset? This will delete your Asana URL, API keys and send history.')) return;
            [CFG_ASANA_URL, CFG_SECTION, CFG_SETUP_DONE, GROQ_KEY_STORE, GEMINI_KEY_STORE, SENT_KEY]
                .forEach(function(k) { GM_setValue(k, ''); });
            overlay.remove();
            alert('Reset complete. Reload the page to start setup again.');
            location.reload();
        };

        document.getElementById('cfg-save').onclick = function() {
            var asanaUrl = document.getElementById('cfg-asana-url').value.trim();
            var section  = document.getElementById('cfg-section').value.trim();
            var groq     = document.getElementById('cfg-groq').value.trim();
            var gemini   = document.getElementById('cfg-gemini').value.trim();
            var st       = document.getElementById('cfg-status');

            if (!asanaUrl || !asanaUrl.includes('asana.com')) {
                st.innerHTML = '<span style="color:#e74c3c">❌ Invalid Asana URL.</span>'; return;
            }
            if (!section) {
                st.innerHTML = '<span style="color:#e74c3c">❌ Section name required.</span>'; return;
            }
            GM_setValue(CFG_ASANA_URL,  asanaUrl);
            GM_setValue(CFG_SECTION,    section);
            GM_setValue(CFG_SETUP_DONE, true);
            if (groq)   GM_setValue(GROQ_KEY_STORE,   groq);
            if (gemini) GM_setValue(GEMINI_KEY_STORE, gemini);

            st.innerHTML = '<span style="color:#27ae60">✅ Saved!</span>';
            setTimeout(function() { overlay.remove(); }, 800);
        };
    }

    // ═══════════════════════════════════════════════════════
    //  INJECT BUTTON ON EACH COMMENT
    // ═══════════════════════════════════════════════════════
    function injectButton(card) {
        if (card.querySelector('.mv-btn')) return;
        var viewEl = card.querySelector('div[data-test-component="StencilReactView"][id]');
        var cardId = viewEl ? (viewEl.getAttribute('id') || '') : '';
        if (!cardId) {
            var bEl = card.querySelector('div[data-test-component="StencilText"][style*="white-space: pre-line"]');
            if (bEl) cardId = btoa(encodeURIComponent((bEl.textContent||'').substring(0,40)))
                .replace(/[^a-zA-Z0-9]/g,'').substring(0,20);
        }
        if (!cardId) return;

        var alreadySent = getSentIds().indexOf(cardId) !== -1;
        var btn = document.createElement('button');
        btn.className   = 'mv-btn' + (alreadySent ? ' sent' : '');
        btn.textContent = alreadySent ? '✅ Sent' : '⬆ Send to Asana';

        btn.addEventListener('click', function(e) {
            e.stopPropagation(); e.preventDefault();
            if (btn.classList.contains('sent')) return;
            var cfg = getConfig();
            if (!cfg.setupDone || !cfg.asanaUrl) {
                showSetupDialog(function() {
                    var data = extractData(card);
                    data.cardId = cardId;
                    showPreview(data, sendToAsana.bind(null, cardId, btn));
                });
                return;
            }
            var data = extractData(card);
            data.cardId = cardId;
            showPreview(data, sendToAsana.bind(null, cardId, btn));
        });

        var headerRow = card.querySelector('div[data-test-component="StencilReactRow"].css-128w7sf');
        if (headerRow && headerRow.parentElement) {
            headerRow.parentElement.appendChild(btn);
        } else {
            var fc = card.firstElementChild;
            if (fc) fc.appendChild(btn); else card.appendChild(btn);
        }
    }

    function sendToAsana(cardId, btn, taskData) {
        var cfg = getConfig();
        var encoded = encodeTaskForURL(taskData);
        if (!encoded) { alert('Error encoding task. Please try again.'); return; }
        var targetUrl = cfg.asanaUrl + '?mvtask=' + encoded;
        LOG('Opening Asana: ' + taskData.name);
        window.open(targetUrl, '_blank');
        setTimeout(function() {
            markSent(cardId);
            btn.textContent = '✅ Sent';
            btn.classList.add('sent');
        }, 1500);
    }

    // ═══════════════════════════════════════════════════════
    //  OBSERVER + SCAN
    // ═══════════════════════════════════════════════════════
    function scanCards() {
        var list = document.querySelector('#comments-list');
        if (!list) return;
        var cards = list.querySelectorAll('li');
        if (!cards.length) cards = list.querySelectorAll(':scope > *');
        cards.forEach(injectButton);
    }

    function startObserver() {
        var target =
            document.getElementById('comments-list') ||
            document.getElementById('StencilTabPanel-fully-controlled-tabs-Comments-panel') ||
            document.getElementById('StencilReactMainWithSkipLink') ||
            document.body;
        var debounce;
        new MutationObserver(function() {
            clearTimeout(debounce);
            debounce = setTimeout(scanCards, DEBOUNCE_MS);
        }).observe(target, { childList: true, subtree: true });
        scanCards();
    }

    // ═══════════════════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════════════════
    function init() {
        LOG('v4.0 Universal started');
        var cfgBtn = document.createElement('button');
        cfgBtn.id = 'mv-cfg-btn';
        cfgBtn.textContent = '⚙️';
        cfgBtn.title = 'MyVoice → Asana Settings';
        cfgBtn.addEventListener('click', showSettings);
        document.body.appendChild(cfgBtn);

        var cfg = getConfig();
        if (!cfg.setupDone || !cfg.asanaUrl) {
            LOG('Setup not completed, showing wizard...');
            setTimeout(function() {
                showSetupDialog(function() { startObserver(); });
            }, 1500);
        } else {
            LOG('Config OK: ' + cfg.asanaUrl.substring(0, 50));
            var attempts = 0;
            var interval = setInterval(function() {
                attempts++;
                var list = document.querySelector('#comments-list');
                if (list || attempts > 30) { clearInterval(interval); startObserver(); }
            }, 500);
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 2000);
    } else {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 2000); });
    }

})();
