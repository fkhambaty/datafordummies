/**
 * FKTI - Copy button for all code blocks across the website
 * Adds a top-right copy icon to .code-block, .terminal-mock, and pre blocks
 */
(function() {
  function injectCopyButtonStyles() {
    if (document.getElementById('fkti-copy-btn-styles')) return;
    var style = document.createElement('style');
    style.id = 'fkti-copy-btn-styles';
    style.textContent = '.code-block,.terminal-mock,.fkti-pre-wrap{position:relative!important}.fkti-copy-btn{position:absolute!important;top:10px!important;right:10px!important;width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;padding:0!important;border:none!important;border-radius:8px!important;background:rgba(0,0,0,0.15)!important;color:#1e293b!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:14px!important;z-index:5!important;transition:background .2s,color .2s!important}.fkti-copy-btn:hover{background:rgba(0,0,0,0.25)!important;color:#0f172a!important}.fkti-copy-btn.fkti-copy-done{background:#22c55e!important;color:#fff!important}.code-block .fkti-copy-btn,.terminal-mock .fkti-copy-btn{color:#f8fafc!important;background:rgba(255,255,255,0.15)!important}.code-block .fkti-copy-btn:hover,.terminal-mock .fkti-copy-btn:hover{background:rgba(255,255,255,0.3)!important;color:#fff!important}';
    document.head.appendChild(style);
  }

  function getCodeText(el) {
    var pre = el.querySelector('pre');
    if (pre) return pre.innerText || pre.textContent || '';
    return el.innerText || el.textContent || '';
  }

  function createCopyButton(container) {
    if (container.querySelector('.fkti-copy-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'fkti-copy-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Copy code');
    btn.innerHTML = '<i class="fas fa-copy"></i>';
    btn.onclick = function() {
      var text = getCodeText(container);
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          btn.classList.add('fkti-copy-done');
          btn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(function() {
            btn.classList.remove('fkti-copy-done');
            btn.innerHTML = '<i class="fas fa-copy"></i>';
          }, 2000);
        }).catch(function() { fallbackCopy(text, btn); });
      } else {
        fallbackCopy(text, btn);
      }
    };
    container.style.position = 'relative';
    container.appendChild(btn);
  }

  function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      btn.classList.add('fkti-copy-done');
      btn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(function() {
        btn.classList.remove('fkti-copy-done');
        btn.innerHTML = '<i class="fas fa-copy"></i>';
      }, 2000);
    } catch (e) {}
    document.body.removeChild(ta);
  }

  function init() {
    injectCopyButtonStyles();
    var blocks = document.querySelectorAll('.code-block, .terminal-mock');
    blocks.forEach(createCopyButton);
    var pres = document.querySelectorAll('pre:not(.code-block pre):not(.terminal-mock pre)');
    pres.forEach(function(pre) {
      if (pre.closest('.code-block, .terminal-mock')) return;
      var wrap = pre.parentElement;
      if (wrap && (wrap.classList.contains('code-block') || wrap.classList.contains('terminal-mock'))) return;
      if (!pre.classList.contains('fkti-copy-wrapped')) {
        var wrapper = document.createElement('div');
        wrapper.className = 'fkti-pre-wrap';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        createCopyButton(wrapper);
        pre.classList.add('fkti-copy-wrapped');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
