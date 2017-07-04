"use strict";

class TimerIcon extends HTMLElement {
  static get observedAttributes() { return [ "icon", "name", "zoom", "duration", "onhide", "width", "height", "bordercolor" ]; }

  // All visual dimensions are scaled by this.
  set scale(s) { this.setAttribute("scale", s); }
  get scale() { return this.getAttribute("scale"); }

  // Border color.
  set bordercolor(c) { this.setAttribute("bordercolor", c); }
  get bordercolor() { return this.getAttribute("bordercolor"); }

  // The width of the icon, in pixels (before |scale|).
  set width(w) { this.setAttribute("width", w); }
  get width() { return this.getAttribute("width"); }

  // The height of the icon, in pixels (before |scale|).
  set height(h) { this.setAttribute("height", h); }
  get height() { return this.getAttribute("height"); }

  // The length of time to count down.
  set duration(s) { this.setAttribute("duration", s); }
  get duration() { return this.getAttribute("duration"); }
  
  // When the timer reaches 0, it is hidden after this many seconds. If ""
  // then it is not hidden.
  set hideafter(h) { this.setAttribute("hideafter", h); }
  get hideafter() { return this.getAttribute("hideafter"); }

  // When the timer hides after completing, this string is evaluated.
  set onhide(c) { this.setAttribute("onhide", c); }
  get onhide() { return this.getAttribute("onhide"); }
  
  // Sets the path to the image to show in the icon.
  set icon(p) { this.setAttribute("icon", p); }
  get icon() { return this.getAttribute("icon"); }

  // Sets the number of pixels to zoom the icon. The image will be
  // grown by this amout and cropped to the widget.
  set zoom(p) { this.setAttribute("zoom", p); }
  get zoom() { return this.getAttribute("zoom"); }
  
  // This would be used with window.customElements.
  constructor() {
    super();
    var root = this.attachShadow({mode: 'open'});
    this.init(root);
  }
  
  // These would be used by document.registerElement, which is deprecated but
  // ACT uses an old CEF which has this instead of the newer APIs.
  createdCallback() {
    var root = this.createShadowRoot();
    this.init(root);
  }
  // Convert from the deprecated API names to the modern API names.
  attachedCallback() { this.connectedCallback(); }
  detachedCallback() { this.disconnectedCallback(); }

  init(root) {
    root.innerHTML = `
      <style>
        .text {
          position: absolute;
          font-family: arial;
          color: white;
          text-shadow: -1px 0 3px black, 0 1px 3px black, 1px 0 3px black, 0 -1px 3px black;
          will-change: content;
        }
        #border-bg {
          position: absolute;
        }
        #border-fg {
          position: absolute;
        }
        #icon {
          position: absolute;
          will-change: content;
        }
        #text {
          position: absolute;
        }
      </style>
      <div id="root" style="position: relative">
        <div id="border-bg"></div>
        <div id="border-fg"></div>
        <div id="icon"></div>
        <div id="text" class="text"></div>
      </div>
    `
  }
  
  connectedCallback() {
    this.rootElement = this.shadowRoot.getElementById("root");
    this.borderBackgroundElement = this.shadowRoot.getElementById("border-bg");
    this.borderForegroundElement = this.shadowRoot.getElementById("border-fg");
    this.iconElement = this.shadowRoot.getElementById("icon");
    this.textElement = this.shadowRoot.getElementById("text");

    // Constants.
    this.kBackgroundOpacity = 0.8;
    this.kOuterBorderSize = 1;
    this.kColorBorderSize = 2;
    this.kAnimateMS = 100;
    
    // Default values.
    this._value = 0;
    this._duration = 0;
    this._width = 64;
    this._height = 64;
    this._border_bg = "black";
    this._border_fg = "grey";
    this._scale = 1;
    this._hideafter = -1;
    this._onhide = "";
    this._icon = "";
    this._zoom = 20;

    if (this.duration != null) { this._duration = Math.max(parseFloat(this.duration), 0); }
    if (this.width != null) { this._width = Math.max(parseInt(this.width), 1); }
    if (this.barheight != null) { this._barheight = Math.max(parseInt(this.barheight), 1); }
    if (this.bordercolor != null) { this._border_fg = this.bordercolor; }
    if (this.scale != null) { this._scale = Math.max(parseFloat(this.scale), 0.01); }
    if (this.hideafter != null && this.hideafter != "") { this._hideafter = Math.max(parseFloat(this.hideafter), 0); }
    if (typeof(this.onhide) != null) { this._onhide = this.onhide; }
    if (this.icon != null) { this._icon = this.icon; }
    if (this.zoom != null) { this._zoom = Math.max(parseInt(this.zoom), 0); }
    
    this._connected = true;
    this.layout();
    this.reset();
  }
  
  disconnectedCallback() {
    this._connected = false;
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (name == "duration") {
      this._duration = Math.max(parseFloat(newValue), 0);
      this.reset();
    } else if (name == "width") {
      this._width = Math.max(parseInt(newValue), 1);
      this.layout();
    } else if (name == "height") {
      this._height = Math.max(parseInt(newValue), 1);
      this.layout();
    } else if (name == "bordercolor") {
      this._border_fg = newValue;
      this.layout();
    } else if (name == "onhide") {
      this._onhide = newValue;
    } else if (name == "icon") {
      this._icon = newValue;
      this.layout();
    } else if (name == "zoom") {
      this._zoom = Math.max(parseInt(newValue), 0);
      this.layout();
    }

    if (this._connected)
      this.draw();
  }
  
  layout() {
    if (!this._connected)
      return;

    var borderBackgroundStyle = this.borderBackgroundElement.style;
    var borderForegroundStyle = this.borderForegroundElement.style;
    var iconStyle = this.iconElement.style;
    var textStyle = this.textElement.style;
    
    borderBackgroundStyle.backgroundColor = this._border_bg;
    borderBackgroundStyle.opacity = this.kBackgroundOpacity;
    
    borderBackgroundStyle.width = this._width * this._scale;
    borderBackgroundStyle.height = this._height * this._scale;

    borderForegroundStyle.width = (this._width - this.kOuterBorderSize * 2 - this.kColorBorderSize * 2) * this._scale;
    borderForegroundStyle.height = (this._height - this.kOuterBorderSize * 2 - this.kColorBorderSize * 2) * this._scale;
    borderForegroundStyle.borderWidth = this.kColorBorderSize * this._scale;
    borderForegroundStyle.borderColor = this._border_fg;
    borderForegroundStyle.borderStyle = "solid";
    borderForegroundStyle.left = this.kOuterBorderSize * this._scale;
    borderForegroundStyle.top = this.kOuterBorderSize * this._scale;
    
    var icon_left = (this.kOuterBorderSize * 2 + this.kColorBorderSize) * this._scale;
    var icon_top = (this.kOuterBorderSize * 2 + this.kColorBorderSize) * this._scale;
    var icon_width = (this._width - this.kOuterBorderSize * 4 - this.kColorBorderSize * 2) * this._scale;
    var icon_height = (this._height - this.kOuterBorderSize * 4 - this.kColorBorderSize * 2) * this._scale
    var text_height = Math.min(icon_width, icon_height) / 2;
    iconStyle.width = icon_width;
    iconStyle.height = icon_height;
    iconStyle.left = icon_left;
    iconStyle.top = icon_top;
    iconStyle.backgroundImage = "url('" + this._icon + "')";
    iconStyle.backgroundSize = (Math.max(icon_width, icon_height) + this._zoom * this._scale) + "px";
    iconStyle.backgroundPosition = "center center";
    
    textStyle.top = icon_top + (icon_height - text_height) / 2;
    textStyle.left = icon_left;
    textStyle.width = icon_width;
    textStyle.height = text_height;
    textStyle.fontSize = text_height;
    textStyle.textAlign = "center";
  }

  draw() {
    var percent = this._duration <= 0 ? 1 : this._value / this._duration;
    // Keep it between 0 and 1.
    percent = Math.min(1, Math.max(0, percent));

    var intvalue = parseInt(this._value + 0.99999999999);
    
    if (intvalue > 0)
      this.textElement.innerText = intvalue;
    else
      this.textElement.innerText = "";
  }

  reset() {
    this.rootElement.style.display = "block";
    clearTimeout(this._hide_timer);
    this._hide_timer = null;
    clearTimeout(this._timer);
    this._timer = null;

    this._value = this._duration;
    this.advance();
  }
  
  advance() {
    if (this._value <= 0) {
      this._value = 0;
      var that = this;
      if (this._hideafter >= 0) {
        this._hide_timer = setTimeout(function() {
          that.rootElement.style.display = "none";
          try {
            eval(that._onhide);
          } catch (e) {
            console.log("error evaluating onhide: " + that._onhide);
          }
        }, this._hideafter);
      }
    } else {
      var that = this;
      this._timer = setTimeout(function() {
        that._value = that._value - (that.kAnimateMS / 1000);
        that.advance();
      }, this.kAnimateMS);
    }
    this.draw();
  }
}

if (window.customElements) {
  // Preferred method but old CEF doesn't have this.
  window.customElements.define('timer-icon', TimerIcon);
} else {
  document.registerElement('timer-icon', {
    prototype: Object.create(TimerIcon.prototype)
  });
}