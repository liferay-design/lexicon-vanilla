/* ============================================================
   navigation.js — behaviour for the Top Bar · Side Menu · Global Menu
   satellites (components.css › NAVIGATION SATELLITES).

   OPT-IN: include it only on pages that use those satellites.
     <script src="navigation.js"></script>
   It only wires up the classes it finds (.side-menu, .top-bar__toggle,
   .global-menu-anchor …) and never touches anything else, so pages that
   don't include it — or don't use these satellites — are unaffected.
   Works over file:// (no fetch, no modules). Safe in <head> or <body>.

   Body state classes: .side-menu-pinned · .side-menu-peek · .global-menu-open

   Events (bubble from the component; listen on document):
     'side-menu:select'   detail: { item, label }  — a .side-menu__item was chosen
     'global-menu:select' detail: { item }         — a .global-menu__item was chosen
   The kit only sets the active state / closes menus; what a selection
   *does* (navigate, swap content) is up to the page.

   Opt-in attributes:
     data-follow-side-menu on .top-bar__title → its text follows the chosen item.

   API (window.LexiconNav): setPinned(bool) · isPinned() · refresh()
   ============================================================ */
(function () {
  'use strict';
  if (window.LexiconNav) return;

  var MOBILE = '(max-width: 767px)';
  var body;
  var refreshers = [];

  function on(el, type, fn, opts) { if (el) el.addEventListener(type, fn, opts); }
  function emit(el, name, detail) {
    el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail }));
  }

  // ── Side Menu: pin / peek, groups, items, close, scrim, tooltip ─────
  function initSideMenu() {
    var panel = document.querySelector('.side-menu:not(.side-menu--static)');
    var toggle = document.querySelector('.top-bar__toggle');
    var mq = window.matchMedia(MOBILE);
    var hideTimer = null;

    function pinned() { return body.classList.contains('side-menu-pinned'); }

    function syncToggle() {
      if (!toggle) return;
      var p = pinned();
      var use = toggle.querySelector('.top-bar__toggle-icon use');
      if (use) use.setAttribute('href', p ? '#product-menu-open' : '#product-menu-closed');
      var label = p ? 'Close Menu' : 'Pin Menu';
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('aria-expanded', String(p));
      var tip = toggle.parentElement && toggle.parentElement.querySelector('.top-bar__toggle-tip');
      if (tip) tip.textContent = label;
    }

    function setPinned(on) {
      body.classList.toggle('side-menu-pinned', !!on);
      if (on) body.classList.remove('side-menu-peek');
      syncToggle();
    }

    function peek(on) {
      if (pinned()) return;
      if (on && mq.matches) return;            // no hover peek on mobile
      body.classList.toggle('side-menu-peek', on);
      if (!on && panel) emit(panel, 'side-menu:collapse', {});
    }
    function scheduleHide() { clearTimeout(hideTimer); hideTimer = setTimeout(function () { peek(false); }, 250); }
    function cancelHide() { clearTimeout(hideTimer); }

    // Collapsible groups + item selection (delegated: navs may be re-rendered).
    document.addEventListener('click', function (e) {
      var header = e.target.closest('.side-menu__group-header');
      if (header) {
        header.setAttribute('aria-expanded', String(header.getAttribute('aria-expanded') === 'false'));
        return;
      }
      var item = e.target.closest('.side-menu__item');
      if (!item) return;
      var menu = item.closest('.side-menu');
      menu.querySelectorAll('.side-menu__item.is-active').forEach(function (el) { el.classList.remove('is-active'); });
      item.classList.add('is-active');
      var label = item.textContent.trim();
      document.querySelectorAll('.top-bar__title[data-follow-side-menu]').forEach(function (t) { t.textContent = label; });
      emit(item, 'side-menu:select', { item: item, label: label });
      if (menu === panel && mq.matches) { setPinned(false); body.classList.remove('side-menu-peek'); }
    });

    if (!panel || !toggle) return { setPinned: function () {}, isPinned: function () { return false; } };

    [toggle, panel].forEach(function (el) {
      on(el, 'mouseenter', function () { cancelHide(); peek(true); });
      on(el, 'mouseleave', scheduleHide);
    });

    on(toggle, 'click', function (e) {
      if (pinned()) {
        setPinned(false);
        // Pointer still over trigger/panel → degrade to overlay, don't vanish.
        if (!mq.matches && (toggle.matches(':hover') || panel.matches(':hover'))) body.classList.add('side-menu-peek');
      } else {
        setPinned(true);
        if (e.detail === 0) panel.focus();   // keyboard open → next Tab lands on Close
      }
    });

    on(panel.querySelector('.side-menu__close'), 'click', function (e) {
      setPinned(false);
      body.classList.remove('side-menu-peek');
      if (e.detail === 0) toggle.focus();
    });
    on(document.querySelector('.side-menu-scrim'), 'click', function () {
      setPinned(false);
      body.classList.remove('side-menu-peek');
    });

    on(panel, 'focusin', function () { cancelHide(); peek(true); });
    on(panel, 'focusout', function (e) { if (!panel.contains(e.relatedTarget)) scheduleHide(); });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('side-menu-peek')) peek(false);
    });

    // Toggle tooltip: delayed show, self-dismiss, reset on click.
    var tip = toggle.parentElement && toggle.parentElement.querySelector('.top-bar__toggle-tip');
    if (tip) {
      var showT = null, hideT = null, pointerFocus = false;
      var show = function () {
        tip.classList.add('is-visible');
        clearTimeout(hideT);
        hideT = setTimeout(function () { tip.classList.remove('is-visible'); }, 3000);
      };
      var hide = function () { clearTimeout(showT); clearTimeout(hideT); tip.classList.remove('is-visible'); };
      var defer = function () { clearTimeout(showT); showT = setTimeout(show, 400); };
      on(toggle, 'mouseenter', defer);
      on(toggle, 'mouseleave', hide);
      on(toggle, 'mousedown', function () { pointerFocus = true; });
      on(toggle, 'focus', function () { if (!pointerFocus) show(); pointerFocus = false; });
      on(toggle, 'blur', hide);
      on(toggle, 'click', function () { hide(); if (toggle.matches(':hover')) defer(); });
    }

    syncToggle();
    return { setPinned: setPinned, isPinned: pinned };
  }

  // ── Side Menu user menu (footer, opens upward) ───────────────────
  function initUserMenus() {
    document.querySelectorAll('.side-menu__user').forEach(function (wrap) {
      var trigger = wrap.querySelector('.side-menu__user-trigger');
      if (!trigger) return;
      function isOpen() { return wrap.classList.contains('is-open'); }
      function setOpen(v) { wrap.classList.toggle('is-open', v); trigger.setAttribute('aria-expanded', String(v)); }
      on(trigger, 'click', function () { setOpen(!isOpen()); });
      on(document, 'click', function (e) { if (isOpen() && !wrap.contains(e.target)) setOpen(false); });
      on(document, 'keydown', function (e) { if (e.key === 'Escape' && isOpen()) { setOpen(false); trigger.focus(); } });
      wrap.querySelectorAll('.dropdown__item').forEach(function (it) { on(it, 'click', function () { setOpen(false); }); });
      // A peeked menu retracting resets it, so re-peeking never shows it stale.
      on(document, 'side-menu:collapse', function () { setOpen(false); });
    });
  }

  // ── Side Menu scroll shadows ─────────────────────────────────────
  function initScrollShadows() {
    document.querySelectorAll('.side-menu').forEach(function (panel) {
      var scroller = panel.querySelector('.side-menu__body');
      if (!scroller) return;
      function update() {
        panel.classList.toggle('is-clipped-top', scroller.scrollTop > 1);
        panel.classList.toggle('is-clipped-bottom', scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1);
      }
      on(scroller, 'scroll', update, { passive: true });
      on(window, 'resize', update);
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(update);
        Array.prototype.forEach.call(scroller.children, function (c) { ro.observe(c); });
      }
      refreshers.push(update);
      update();
    });
  }

  // ── Global Menu ──────────────────────────────────────────────────
  function initGlobalMenus() {
    var scrim = document.querySelector('.global-menu-scrim');
    document.querySelectorAll('.global-menu-anchor').forEach(function (anchor) {
      var trigger = anchor.querySelector('.global-menu-trigger');
      var menu = anchor.querySelector('.global-menu');
      if (!trigger || !menu) return;

      function isOpen() { return anchor.classList.contains('is-open'); }
      function items() { return Array.prototype.slice.call(menu.querySelectorAll('.global-menu__item')); }
      function setOpen(v, returnFocus) {
        anchor.classList.toggle('is-open', v);
        body.classList.toggle('global-menu-open', v);
        trigger.setAttribute('aria-expanded', String(v));
        if (v) {
          var first = menu.querySelector('.global-menu__item.is-active') || items()[0];
          if (first) first.focus({ preventScroll: true });
        } else if (returnFocus) {
          trigger.focus();
        }
      }

      on(trigger, 'click', function () { setOpen(!isOpen(), false); });
      on(scrim, 'click', function () { if (isOpen()) setOpen(false, false); });
      on(document, 'click', function (e) {
        if (isOpen() && !anchor.contains(e.target) && e.target !== scrim) setOpen(false, false);
      });
      on(document, 'keydown', function (e) {
        if (!isOpen()) return;
        if (e.key === 'Escape') { setOpen(false, true); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].indexOf(e.key) > -1) {
          var list = items();
          var i = list.indexOf(document.activeElement);
          var n = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1
                : (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
          if (list[n]) list[n].focus();
          e.preventDefault();
        }
      });
      on(menu, 'click', function (e) {
        var item = e.target.closest('.global-menu__item');
        if (!item) return;
        setOpen(false, true);
        emit(item, 'global-menu:select', { item: item });
      });
    });
  }

  var api = { setPinned: function () {}, isPinned: function () { return false; } };

  function init() {
    body = document.body;
    var side = initSideMenu();
    api.setPinned = side.setPinned;
    api.isPinned = side.isPinned;
    initUserMenus();
    initScrollShadows();
    initGlobalMenus();
  }

  window.LexiconNav = {
    setPinned: function (v) { api.setPinned(v); },
    isPinned: function () { return api.isPinned(); },
    // Call after re-rendering Side Menu content (updates scroll shadows).
    refresh: function () { refreshers.forEach(function (fn) { fn(); }); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
