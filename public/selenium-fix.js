// Polyfill for deprecated Firefox initKeyEvent used by Selenium IDE
(function() {
  function addPolyfill(target) {
    if (target && !target.initKeyEvent) {
      target.initKeyEvent = function(type, bubbles, cancelable, viewArg, ctrl, alt, shift, meta, keyCode, charCode) {
        if (this.initUIEvent) this.initUIEvent(type, bubbles, cancelable, viewArg || window, 0);
        try { Object.defineProperty(this, 'keyCode', { value: keyCode || 0, configurable: true }); } catch (e) {}
        try { Object.defineProperty(this, 'which', { value: keyCode || charCode || 0, configurable: true }); } catch (e) {}
      };
    }
  }
  if (typeof KeyboardEvent !== 'undefined') addPolyfill(KeyboardEvent.prototype);
  if (typeof UIEvent !== 'undefined') addPolyfill(UIEvent.prototype);
  if (typeof Event !== 'undefined') addPolyfill(Event.prototype);
  if (typeof document !== 'undefined' && document.createEvent) {
    const origCE = document.createEvent;
    document.createEvent = function() {
      const evt = origCE.apply(this, arguments);
      addPolyfill(evt);
      return evt;
    };
  }
})();
