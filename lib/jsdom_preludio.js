// El entorno de navegador para el JavaScript de las páginas, encima de lo que pone lib/jsdom.dash
// en C (los nodos). tools/preludio.py lo convierte en lib/jsdom_preludio.dash. Lo que hace falta
// para jQuery 3 y las páginas de hoy: eventos (con window), temporizadores, style, classList,
// dataset, getComputedStyle, navigator, location, history, almacenamiento, matchMedia...
(function (g) {
    'use strict';
    var N = Object.getPrototypeOf(document);

    // === Constructores (para instanceof) y constantes ===
    function Nodo() { throw new TypeError('Illegal constructor'); }
    Nodo.prototype = N;
    // Cada interfaz con su nombre y su instanceof: todas comparten el prototipo de los nodos (lo que una web añade a
    // HTMLElement.prototype llega a todos), pero `x instanceof HTMLIFrameElement` mira el tipo y la etiqueta (antes
    // todas eran Nodo y todo elemento era un iframe: React no salía de un bucle; tarea 37a3)
    function esNodo(o) { return o !== null && typeof o == 'object' && N.isPrototypeOf(o); }
    function esSvg(o) { return o.localName == 'svg' || !!(o.parentNode && o.closest('svg')); }
    function interfaz(nombre, prueba) {
        var F = function () { throw new TypeError('Illegal constructor'); };
        F.prototype = N;
        Object.defineProperty(F, 'name', {value: nombre});
        Object.defineProperty(F, Symbol.hasInstance, {value: function (o) { return esNodo(o) && prueba(o); }});
        g[nombre] = F;
    }
    Object.defineProperty(Nodo, Symbol.hasInstance, {value: esNodo});
    g.Node = Nodo;
    var tipo = function (t) { return function (o) { return o.nodeType == t; }; };
    interfaz('Element', tipo(1));
    interfaz('HTMLElement', function (o) { return o.nodeType == 1 && !esSvg(o); });
    interfaz('SVGElement', function (o) { return o.nodeType == 1 && esSvg(o); });
    interfaz('SVGSVGElement', function (o) { return o.nodeType == 1 && o.localName == 'svg'; });
    interfaz('Document', tipo(9));
    interfaz('HTMLDocument', tipo(9));
    interfaz('DocumentFragment', tipo(11));
    interfaz('ShadowRoot', function () { return false; });
    interfaz('Text', tipo(3));
    interfaz('Comment', tipo(8));
    interfaz('CharacterData', function (o) { return o.nodeType == 3 || o.nodeType == 8; });
    // (el polyfill de componentes web de YouTube prepara un prototipo para cada uno de estos; tarea 38)
    interfaz('CDATASection', tipo(4));
    interfaz('ProcessingInstruction', tipo(7));
    interfaz('DocumentType', tipo(10));
    interfaz('Attr', tipo(2));
    var ETIQUETAS = {Anchor: 'a', Area: 'area', Audio: 'audio', BR: 'br', Base: 'base', Body: 'body', Button: 'button',
        Canvas: 'canvas', Data: 'data', DataList: 'datalist', Details: 'details', Dialog: 'dialog', Div: 'div',
        DList: 'dl', Embed: 'embed', FieldSet: 'fieldset', Form: 'form', Head: 'head', HR: 'hr', Html: 'html',
        IFrame: 'iframe', Image: 'img', Input: 'input', Label: 'label', Legend: 'legend', LI: 'li', Link: 'link',
        Map: 'map', Meta: 'meta', Meter: 'meter', OList: 'ol', Object: 'object', OptGroup: 'optgroup',
        Option: 'option', Output: 'output', Paragraph: 'p', Picture: 'picture', Pre: 'pre', Progress: 'progress',
        Script: 'script', Select: 'select', Slot: 'slot', Source: 'source', Span: 'span', Style: 'style',
        TableCaption: 'caption', Table: 'table', TableRow: 'tr', TableSection: 'thead tbody tfoot',
        TableCell: 'td th', TableCol: 'col colgroup', Template: 'template', TextArea: 'textarea', Time: 'time',
        Title: 'title', Track: 'track', UList: 'ul', Video: 'video', Media: 'video audio',
        Heading: 'h1 h2 h3 h4 h5 h6', Quote: 'blockquote q', Mod: 'ins del'};
    Object.keys(ETIQUETAS).forEach(function (k) {
        var es = {};
        ETIQUETAS[k].split(' ').forEach(function (t) { es[t] = true; });
        interfaz('HTML' + k + 'Element', function (o) { return o.nodeType == 1 && es[o.localName] === true && !esSvg(o); });
    });
    interfaz('HTMLUnknownElement', function () { return false; });
    function Ventana() { throw new TypeError('Illegal constructor'); }
    Object.defineProperty(Ventana, 'name', {value: 'Window'});
    Object.defineProperty(Ventana, Symbol.hasInstance, {value: function (o) { return o === g; }});
    g.Window = Ventana;
    function Destino() {}
    Object.defineProperty(Destino, 'name', {value: 'EventTarget'});
    Object.defineProperty(Destino, Symbol.hasInstance, {value: function (o) {
        return o === g || esNodo(o) || (o !== null && typeof o == 'object' && typeof o.addEventListener == 'function');
    }});
    Destino.prototype.addEventListener = function (t, f, o) { escuchar(this, t, f, o); };
    Destino.prototype.removeEventListener = function (t, f, o) { olvidar(this, t, f, o); };
    Destino.prototype.dispatchEvent = function (e) { return despachar(this, e); };
    if (!g.EventTarget) g.EventTarget = Destino;
    // la cadena de prototipos de un navegador: window -> Window.prototype -> EventTarget.prototype, y los nodos ->
    // EventTarget.prototype (el polyfill de componentes web de YouTube copia addEventListener de
    // EventTarget.prototype y lo busca luego en window y en cada nodo: "not a function"; tarea 38)
    if (g.EventTarget === Destino) {
        Ventana.prototype = Object.create(Destino.prototype, {constructor: {value: Ventana, writable: true, configurable: true}});
        Object.setPrototypeOf(g, Ventana.prototype);
        Object.setPrototypeOf(N, Destino.prototype);
    }
    var CONST = {ELEMENT_NODE: 1, ATTRIBUTE_NODE: 2, TEXT_NODE: 3, CDATA_SECTION_NODE: 4, COMMENT_NODE: 8,
                 DOCUMENT_NODE: 9, DOCUMENT_TYPE_NODE: 10, DOCUMENT_FRAGMENT_NODE: 11,
                 DOCUMENT_POSITION_DISCONNECTED: 1, DOCUMENT_POSITION_PRECEDING: 2, DOCUMENT_POSITION_FOLLOWING: 4,
                 DOCUMENT_POSITION_CONTAINS: 8, DOCUMENT_POSITION_CONTAINED_BY: 16,
                 DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32};
    Object.keys(CONST).forEach(function (k) { Nodo[k] = CONST[k]; N[k] = CONST[k]; });
    N.namespaceURI = 'http://www.w3.org/1999/xhtml';

    // === Eventos ===
    function Ev(tipo, o) {
        o = o || {};
        this.type = String(tipo);
        this.bubbles = !!o.bubbles;
        this.cancelable = !!o.cancelable;
        this.composed = !!o.composed;
        this.defaultPrevented = false;
        this.isTrusted = false;
        this.timeStamp = __dashweb_reloj();
        this.target = this.currentTarget = this.srcElement = null;
        this.eventPhase = 0;
        this.detail = o.detail === undefined ? null : o.detail;
        this._parar = this._pararYa = false;
        ['key', 'code', 'keyCode', 'which', 'button', 'buttons', 'clientX', 'clientY', 'pageX', 'pageY',
         'screenX', 'screenY', 'altKey', 'ctrlKey', 'shiftKey', 'metaKey', 'relatedTarget', 'promise', 'reason',
         'pointerType', 'pointerId', 'isPrimary', 'movementX', 'movementY', 'offsetX', 'offsetY',
         'data', 'message', 'error'].forEach(function (k) {
            if (o[k] !== undefined) this[k] = o[k];
        }, this);
    }
    Ev.prototype.preventDefault = function () { if (this.cancelable !== false) this.defaultPrevented = true; };
    Ev.prototype.stopPropagation = function () { this._parar = true; };
    Ev.prototype.stopImmediatePropagation = function () { this._parar = this._pararYa = true; };
    Ev.prototype.initEvent = function (t, b, c) { this.type = String(t); this.bubbles = !!b; this.cancelable = !!c; };
    Ev.prototype.composedPath = function () { return this._camino ? this._camino.slice() : []; };
    Ev.NONE = 0; Ev.CAPTURING_PHASE = 1; Ev.AT_TARGET = 2; Ev.BUBBLING_PHASE = 3;
    g.Event = Ev;
    function sub(nombre) {
        var F = function (t, o) { Ev.call(this, t, o); };
        F.prototype = Object.create(Ev.prototype);
        F.prototype.constructor = F;
        g[nombre] = F;
    }
    ['CustomEvent', 'UIEvent', 'MouseEvent', 'KeyboardEvent', 'FocusEvent', 'InputEvent', 'PointerEvent',
     'TouchEvent', 'WheelEvent', 'ErrorEvent', 'MessageEvent', 'PopStateEvent', 'HashChangeEvent',
     'ProgressEvent', 'PromiseRejectionEvent'].forEach(sub);
    // (PromiseRejectionEvent: sin él, core-js da por roto el Promise de QuickJS y pone el suyo, escrito en
    // JavaScript: React en pre.opentimetrack.com tardaba 25 s; tarea 37a3)
    g.CustomEvent.prototype.initCustomEvent = function (t, b, c, d) { this.initEvent(t, b, c); this.detail = d; };

    function escuchar(objeto, t, f, o) {
        if (!f || (typeof f != 'function' && typeof f.handleEvent != 'function')) return;
        var e = objeto.__ev || (Object.defineProperty(objeto, '__ev', {value: {}, writable: true}), objeto.__ev);
        var l = e[t] || (e[t] = []);
        var captura = typeof o == 'boolean' ? o : !!(o && o.capture);
        for (var i = 0; i < l.length; i++) if (l[i].f === f && l[i].captura === captura) return;
        l.push({f: f, captura: captura, una: !!(o && typeof o == 'object' && o.once)});
    }
    function olvidar(objeto, t, f, o) {
        var l = objeto.__ev && objeto.__ev[t];
        var captura = typeof o == 'boolean' ? o : !!(o && o.capture);
        if (l) for (var i = 0; i < l.length; i++) if (l[i].f === f && l[i].captura === captura) { l.splice(i, 1); return; }
    }
    function llamar(f, este, ev) {
        try { return typeof f == 'function' ? f.call(este, ev) : f.handleEvent(ev); }
        catch (e) { console.log('JS: ' + e + (e && e.stack ? ' | ' + String(e.stack).replace(/\n\s*/g, ' | ') : '')); }
    }
    // Los oyentes de un objeto (nodo o window) en una fase: 1 captura, 2 en el objetivo, 3 subida
    function avisar(n, ev, fase) {
        ev.currentTarget = n;
        ev.eventPhase = fase;
        if (fase != 1) {
            var h = n['on' + ev.type];
            if (typeof h != 'function' && n.nodeType == 1 && n.hasAttribute('on' + ev.type)) {
                try { h = new Function('event', n.getAttribute('on' + ev.type)); } catch (e) { console.log('JS: ' + e); }
            }
            if (typeof h == 'function' && llamar(h, n, ev) === false) ev.defaultPrevented = true;
        }
        var l = n.__ev && n.__ev[ev.type];
        if (!l) return;
        l.slice().forEach(function (o) {
            if (ev._pararYa) return;
            if (fase == 1 && !o.captura || fase == 3 && o.captura) return;
            if (o.una) olvidar(n, ev.type, o.f, o.captura);
            llamar(o.f, n, ev);
        });
    }
    function despachar(nodo, ev) {
        if (!(ev instanceof Ev)) { var e = new Ev(ev.type, {bubbles: true, cancelable: true}); Object.assign(e, ev); ev = e; }
        ev.target = ev.srcElement = nodo;
        var camino = [];
        for (var n = nodo.parentNode; n; n = n.parentNode) camino.push(n);
        if (nodo === g || camino.length && camino[camino.length - 1].nodeType == 9 || nodo.nodeType == 9) {
            if (nodo !== g) camino.push(g);
        }
        ev._camino = [nodo].concat(camino);
        for (var i = camino.length - 1; i >= 0 && !ev._parar; i--) avisar(camino[i], ev, 1);
        if (!ev._parar) avisar(nodo, ev, 2);
        if (ev.bubbles) for (i = 0; i < camino.length && !ev._parar; i++) avisar(camino[i], ev, 3);
        ev.currentTarget = null;
        ev.eventPhase = 0;
        return !ev.defaultPrevented;
    }
    N.addEventListener = function (t, f, o) { escuchar(this, t, f, o); };
    N.removeEventListener = function (t, f, o) { olvidar(this, t, f, o); };
    N.dispatchEvent = function (ev) { return despachar(this, ev); };
    g.addEventListener = function (t, f, o) { escuchar(g, t, f, o); };
    g.removeEventListener = function (t, f, o) { olvidar(g, t, f, o); };
    g.dispatchEvent = function (ev) { return despachar(g, ev); };
    N.click = function () { return despachar(this, new g.MouseEvent('click', {bubbles: true, cancelable: true, button: 0})); };
    N.focus = function () { pon(document, 'activeElement', this); };
    // <canvas> (tarea 48a): getContext('2d') da el contexto de lib/lienzo.dash (dibuja en C en un búfer del lienzo,
    // del color de lo que tiene detrás para lo transparente); lo que aún no dibuja (texto, imágenes, degradados) no
    // hace nada. width y height, del lienzo: al cambiarlos, otro búfer
    function fondoDe(el) {
        for (var e = el; e && e.nodeType == 1; e = e.parentNode) {
            var c = g.getComputedStyle(e).backgroundColor;
            if (c && c != 'transparent' && c.replace(/ /g, '') != 'rgba(0,0,0,0)') return c;
        }
        return '#ffffff';
    }
    function nada() {}
    N.getContext = function (t) {
        if (this.localName != 'canvas' || String(t).toLowerCase() != '2d') return null;
        if (this.__lienzo) return this.__lienzo;
        var el = this, c = __dashweb_lienzo(this, parseInt(this.getAttribute('width')) || 300,
            parseInt(this.getAttribute('height')) || 150, fondoDe(this));
        if (!c) return null;
        c.canvas = this;
        c.createLinearGradient = c.createRadialGradient = c.createConicGradient = c.createPattern = function () {
            return {addColorStop: nada};
        };
        c.getImageData = c.createImageData = function (x, y, w, h) {
            if (h === undefined) { w = x; h = y; }
            w = Math.max(0, w | 0); h = Math.max(0, h | 0);
            return {width: w, height: h, data: new Uint8ClampedArray(w * h * 4)};
        };
        c.putImageData = c.drawImage = c.fillText = c.strokeText = c.setLineDash = c.clip = nada;
        c.measureText = function (t) { return {width: String(t).length * 7, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3}; };
        c.getLineDash = function () { return []; };
        c.isPointInPath = c.isPointInStroke = function () { return false; };
        Object.defineProperty(this, 'width', {configurable: true, get: function () { return c.__w; },
            set: function (v) { v = Math.max(0, +v | 0); el.setAttribute('width', v); c.__tam(v, c.__h); }});
        Object.defineProperty(this, 'height', {configurable: true, get: function () { return c.__h; },
            set: function (v) { v = Math.max(0, +v | 0); el.setAttribute('height', v); c.__tam(c.__w, v); }});
        this.__lienzo = c;
        return c;
    };
    N.toDataURL = function () { return 'data:,'; };
    N.blur = function () { if (document.activeElement === this) pon(document, 'activeElement', document.body); };
    N.submit = function () { g.__dashweb_envio = this; };
    N.reset = function () {};
    g.__dashweb_despachar = function (n, t) {
        return despachar(n, new (t == 'click' ? g.MouseEvent : Ev)(t, {bubbles: true, cancelable: true}));
    };
    // El ratón (tarea 37f3): dashweb llama con el elemento que queda debajo (o null) y el de antes, en coordenadas
    // de la vista. Como los navegadores: out/leave en lo que se deja, over/enter en lo nuevo, y move.
    var ratonX = 0, ratonY = 0;
    g.__dashweb_raton = function (nuevo, viejo, x, y) {
        function ev(C, t, sube, rel) {
            return new C(t, {bubbles: sube, cancelable: sube, clientX: x, clientY: y, pageX: x + (g.scrollX || 0),
                pageY: y + (g.scrollY || 0), screenX: x, screenY: y, offsetX: x, offsetY: y, button: 0, buttons: 0,
                relatedTarget: rel || null, pointerType: 'mouse', pointerId: 1, isPrimary: true,
                movementX: x - ratonX, movementY: y - ratonY});
        }
        function cadena(n) { var l = []; for (; n && n.nodeType == 1; n = n.parentNode) l.push(n); return l; }
        if (nuevo !== viejo) {
            var cn = cadena(nuevo), cv = cadena(viejo), i;
            if (viejo) {
                despachar(viejo, ev(g.PointerEvent, 'pointerout', true, nuevo));
                despachar(viejo, ev(g.MouseEvent, 'mouseout', true, nuevo));
                for (i = 0; i < cv.length; i++) if (cn.indexOf(cv[i]) < 0) {
                    despachar(cv[i], ev(g.PointerEvent, 'pointerleave', false, nuevo));
                    despachar(cv[i], ev(g.MouseEvent, 'mouseleave', false, nuevo));
                }
            }
            if (nuevo) {
                despachar(nuevo, ev(g.PointerEvent, 'pointerover', true, viejo));
                despachar(nuevo, ev(g.MouseEvent, 'mouseover', true, viejo));
                for (i = cn.length - 1; i >= 0; i--) if (cv.indexOf(cn[i]) < 0) {
                    despachar(cn[i], ev(g.PointerEvent, 'pointerenter', false, viejo));
                    despachar(cn[i], ev(g.MouseEvent, 'mouseenter', false, viejo));
                }
            }
        }
        if (nuevo) {
            despachar(nuevo, ev(g.PointerEvent, 'pointermove', true, null));
            despachar(nuevo, ev(g.MouseEvent, 'mousemove', true, null));
        }
        ratonX = x; ratonY = y;
    };
    document.createEvent = function (t) { return /custom/i.test(t) ? new g.CustomEvent('') : new Ev(''); };

    // === Temporizadores ===
    var cola = [], sig = 1;
    function poner(f, ms, args, rep) {
        if (typeof f == 'string') { var c = f; f = function () { (0, eval)(c); }; }
        if (typeof f != 'function') return 0;
        ms = +ms || 0; if (ms < 0) ms = 0;
        var id = sig++;
        cola.push({id: id, f: f, ms: ms, cuando: __dashweb_reloj() + ms, args: args, rep: rep});
        return id;
    }
    g.setTimeout = function (f, ms) { return poner(f, ms, [].slice.call(arguments, 2), false); };
    g.setInterval = function (f, ms) { return poner(f, ms, [].slice.call(arguments, 2), true); };
    g.clearTimeout = g.clearInterval = function (id) {
        for (var i = 0; i < cola.length; i++) if (cola[i].id === id) { cola.splice(i, 1); return; }
    };
    g.requestAnimationFrame = function (f) { return poner(function () { f(__dashweb_reloj()); }, 16, [], false); };
    g.cancelAnimationFrame = g.clearTimeout;
    g.queueMicrotask = function (f) { Promise.resolve().then(f); };
    g.__dashweb_tick = function () {
        var ahora = __dashweb_reloj();
        cola.filter(function (t) { return t.cuando <= ahora; })
            .sort(function (a, b) { return a.cuando - b.cuando || a.id - b.id; })
            .forEach(function (t) {
                var i = cola.indexOf(t);
                if (i < 0) return;
                if (t.rep) t.cuando = ahora + Math.max(t.ms, 10); else cola.splice(i, 1);
                try { t.f.apply(g, t.args); }
                catch (e) { console.log('JS: ' + e + (e && e.stack ? ' | ' + String(e.stack).replace(/\n\s*/g, ' | ') : '')); }
            });
        if (!cola.length) return -1;
        var p = Infinity;
        cola.forEach(function (t) { if (t.cuando < p) p = t.cuando; });
        return Math.max(0, p - __dashweb_reloj());
    };

    // === Nodos: lo que se escribe en JavaScript sobre lo de C ===
    // (sus setters, sobre algo que no es un nodo de verdad, como el prototipo de una clase que hereda de HTMLElement,
    // dejan una propiedad normal: aquí todos los elementos comparten prototipo con lo de cada etiqueta, async de
    // <script>, host de <a>..., y Polymer, en YouTube, hace S.prototype.async = function...; tarea 38)
    function def(nombre, get, set) {
        Object.defineProperty(N, nombre, {get: get, configurable: true, set: function (v) {
            if (!__dashweb_es_nodo(this)) { Object.defineProperty(this, nombre, {value: v, writable: true, enumerable: true, configurable: true}); return; }
            if (set) set.call(this, v);
        }});
    }
    N.hasChildNodes = function () { return this.childNodes.length > 0; };
    N.getRootNode = function () { var n = this; while (n.parentNode) n = n.parentNode; return n; };
    def('isConnected', function () { return this.getRootNode() === document; });
    // Shadow DOM mínimo: la raíz de sombra es un fragmento aparte (no se pinta; Next.js pone ahí su anunciador de
    // rutas, que no se ve)
    N.attachShadow = function (o) {
        var r = document.createDocumentFragment();
        Object.defineProperty(r, 'host', {value: this});
        Object.defineProperty(r, 'mode', {value: o && o.mode || 'open'});
        Object.defineProperty(this, 'shadowRoot', {value: o && o.mode == 'closed' ? null : r, configurable: true});
        return r;
    };
    N.closest = function (s) {
        for (var n = this; n && n.nodeType == 1; n = n.parentNode) if (n.matches(s)) return n;
        return null;
    };
    // Geometría de la última maqueta (tarea 37b): __dashweb_caja(n) da [x, y, ancho, alto] en la página (null si no
    // se maquetó) y __dashweb_vista() [ancho, alto, desplazamiento, alto de la página] de lo que se ve
    function vista() {
        var v = __dashweb_vista();
        return {ancho: v[0] || 640, alto: v[1] || 480, desde: pedido !== null ? pedido : v[2] || 0, total: v[3] || 0};
    }
    function esRaiz(el) { return el === document.documentElement || el === document.body || el === document.scrollingElement; }
    function rect(x, y, w, h) {
        return {x: x, y: y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h,
                toJSON: function () { return {x: x, y: y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h}; }};
    }
    g.DOMRect = function (x, y, w, h) { return rect(x || 0, y || 0, w || 0, h || 0); };
    Object.defineProperty(document, 'scrollingElement', {get: function () { return document.documentElement; }, configurable: true});
    N.getBoundingClientRect = function () {
        var c = __dashweb_caja(this);
        if (!c) return rect(0, 0, this.offsetWidth, this.offsetHeight);
        var desde = vista().desde, pega = 0;
        if (c.length > 7) pega = Math.max(0, Math.min(desde + c[6] - c[5], c[7] - c[5]));
        return rect(c[0], c[1] + pega - (c[4] ? 0 : desde), c[2], c[3]);
    };
    N.getClientRects = function () {
        var r = this.getBoundingClientRect();
        return r.width || r.height ? [r] : [];
    };
    def('offsetParent', function () {
        if (!__dashweb_caja(this) && !this.offsetWidth) return null;
        for (var p = this.parentNode; p && p.nodeType == 1; p = p.parentNode) {
            if (p === document.body) return p;
            var pos = getComputedStyle(p).position;
            if (pos && pos != 'static') return p;
        }
        return document.body;
    });
    function desdePadre(el, i) {
        var c = __dashweb_caja(el);
        if (!c) return 0;
        var op = el.offsetParent, pc = op && op !== document.body ? __dashweb_caja(op) : null;
        return c[i] - (pc ? pc[i] : 0);
    }
    def('offsetLeft', function () { return desdePadre(this, 0); });
    def('offsetTop', function () { return desdePadre(this, 1); });
    def('scrollTop', function () { return esRaiz(this) ? vista().desde : 0; },
        function (v) { if (esRaiz(this)) g.scrollTo(0, +v || 0); });
    def('scrollLeft', function () { return 0; }, function () {});
    ['clientTop', 'clientLeft'].forEach(function (k) { def(k, function () { return 0; }); });
    def('scrollWidth', function () { return esRaiz(this) ? vista().ancho : this.offsetWidth; });
    def('scrollHeight', function () { return esRaiz(this) ? Math.max(vista().total, vista().alto) : this.offsetHeight; });
    def('clientWidth', function () { return this === document.documentElement ? vista().ancho : this.offsetWidth; });
    def('clientHeight', function () { return this === document.documentElement ? vista().alto : this.offsetHeight; });
    // Desplazar desde el JavaScript (tarea 37c): queda pedido en __dashweb_desplazar y dashweb lo aplica al volver;
    // mientras, scrollY ya dice el nuevo. Al moverse la vista, dashweb llama a __dashweb_desplazado (evento scroll).
    var pedido = null;
    function desplazarA(y) {
        y = Math.round(+y || 0);
        var v = vista(), max = Math.max(0, v.total - v.alto);
        if (y > max) y = max;
        if (y < 0) y = 0;
        pedido = y;
        g.__dashweb_desplazar = y;
    }
    function arriba(x, y) { return x !== null && typeof x == 'object' ? x.top : y; }
    N.scrollIntoView = function (o) {
        var c = __dashweb_caja(this);
        if (!c) return;
        var v = vista(), y = c[1], b = o !== null && typeof o == 'object' ? o.block : o === false ? 'end' : 'start';
        if (b == 'center') y = c[1] + c[3] / 2 - v.alto / 2;
        else if (b == 'end') y = c[1] + c[3] - v.alto;
        else if (b == 'nearest') {
            if (c[1] >= v.desde && c[1] + c[3] <= v.desde + v.alto) return;
            y = c[1] < v.desde ? c[1] : c[1] + c[3] - v.alto;
        }
        desplazarA(y);
    };
    N.scrollTo = N.scroll = function (x, y) { if (esRaiz(this)) g.scrollTo(x, y); };
    N.scrollBy = function (x, y) { if (esRaiz(this)) g.scrollBy(x, y); };
    g.__dashweb_desplazado = function () {
        pedido = null;
        despachar(document, new Ev('scroll', {bubbles: true}));
    };
    function nodos(lista) {
        return [].map.call(lista, function (a) { return typeof a == 'string' ? document.createTextNode(a) : a; });
    }
    N.append = function () { nodos(arguments).forEach(function (n) { this.appendChild(n); }, this); };
    N.prepend = function () { var f = this.firstChild; nodos(arguments).forEach(function (n) { this.insertBefore(n, f); }, this); };
    N.before = function () { var p = this.parentNode, y = this; if (p) nodos(arguments).forEach(function (n) { p.insertBefore(n, y); }); };
    N.after = function () { var p = this.parentNode, s = this.nextSibling; if (p) nodos(arguments).forEach(function (n) { p.insertBefore(n, s); }); };
    N.replaceWith = function () { var p = this.parentNode; if (p) { this.before.apply(this, arguments); p.removeChild(this); } };
    N.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };
    N.insertAdjacentHTML = function (donde, html) {
        var t = document.createElement('div'), f = document.createDocumentFragment();
        t.innerHTML = html;
        while (t.firstChild) f.appendChild(t.firstChild);
        this.insertAdjacentElement(donde, f);
    };
    N.insertAdjacentElement = function (donde, e) {
        donde = String(donde).toLowerCase();
        if (donde == 'beforebegin') this.parentNode.insertBefore(e, this);
        else if (donde == 'afterbegin') this.insertBefore(e, this.firstChild);
        else if (donde == 'beforeend') this.appendChild(e);
        else if (donde == 'afterend') this.parentNode.insertBefore(e, this.nextSibling);
        return e;
    };
    N.insertAdjacentText = function (donde, t) { this.insertAdjacentElement(donde, document.createTextNode(t)); };
    N.getAttributeNames = function () { return this.attributes.map(function (a) { return a.name; }); };
    N.toggleAttribute = function (a, si) {
        if (si === undefined) si = !this.hasAttribute(a);
        if (si) this.setAttribute(a, ''); else this.removeAttribute(a);
        return si;
    };
    N.getAttributeNS = function (ns, a) { return this.getAttribute(a); };
    N.setAttributeNS = function (ns, a, v) { this.setAttribute(a, v); };
    N.removeAttributeNS = function (ns, a) { this.removeAttribute(a); };
    N.hasAttributes = function () { return this.attributes.length > 0; };
    // los nodos de atributo ({name, value} de attributes): React los quita uno a uno al rehacer un elemento cuando el
    // HTML del servidor no cuadra (tachyon.freemem.space: "not a function" y la página entera fuera)
    N.getAttributeNode = function (n) {
        var v = this.getAttribute(n);
        return v === null ? null : {name: String(n).toLowerCase(), localName: String(n).toLowerCase(), value: v, ownerElement: this, specified: true};
    };
    N.removeAttributeNode = function (a) { this.removeAttribute(a.name); return a; };
    // attributes vivo, como el NamedNodeMap de los navegadores: su length y sus índices son los de ahora (el de C da
    // una copia). React lo lee una vez y quita atributos hasta que length es 0: con la copia, un bucle sin fin
    // (tachyon.freemem.space: la página entera parada, sin hidratar)
    var copiaAtributos = Object.getOwnPropertyDescriptor(N, 'attributes').get;
    Object.defineProperty(N, 'attributes', {configurable: true, enumerable: true, get: function () {
        var el = this;
        if (el.nodeType !== 1) return copiaAtributos.call(el);
        if (!el.__atributos) {
            Object.defineProperty(el, '__atributos', {configurable: true, enumerable: false, value: new Proxy([], {
                get: function (t, k) {
                    var lista = copiaAtributos.call(el);
                    if (k === 'length') return lista.length;
                    if (typeof k === 'string' && /^[0-9]+$/.test(k)) return lista[+k];
                    if (k === 'item') return function (i) { return lista[i] || null; };
                    if (k === 'getNamedItem') return function (n) { return el.getAttributeNode(n); };
                    if (k === 'setNamedItem') return function (a) { return el.setAttributeNode(a); };
                    if (k === 'removeNamedItem') return function (n) { var a = el.getAttributeNode(n); el.removeAttribute(n); return a; };
                    var v = lista[k];
                    if (typeof v === 'function') return v.bind(lista);
                    if (v === undefined && typeof k === 'string' && el.hasAttribute(k)) return el.getAttributeNode(k);
                    return v;
                },
                has: function (t, k) { return k in copiaAtributos.call(el); }
            })});
        }
        return el.__atributos;
    }});
    N.setAttributeNode = function (a) {
        var antes = this.getAttributeNode(a.name);
        this.setAttribute(a.name, a.value);
        return antes;
    };
    def('innerText', function () { return this.textContent; }, function (v) { this.textContent = v; });
    def('childElementCount', function () { return this.children.length; });
    def('firstElementChild', function () { return this.children[0] || null; });
    def('lastElementChild', function () { var c = this.children; return c[c.length - 1] || null; });
    def('title', function () { return this.getAttribute('title') || ''; }, function (v) { this.setAttribute('title', v); });

    // atributos que se leen como propiedades
    ['name', 'href', 'src', 'alt', 'rel', 'target', 'placeholder', 'lang', 'dir', 'action', 'method', 'role',
     'width', 'height', 'htmlFor:for', 'accessKey:accesskey', 'tabIndex:tabindex', 'content', 'charset',
     'media', 'download', 'hreflang', 'label', 'pattern', 'accept', 'autocomplete', 'enctype', 'srcset',
     'sizes', 'loading', 'crossOrigin:crossorigin', 'integrity', 'referrerPolicy:referrerpolicy'].forEach(function (k) {
        var p = k.split(':'), a = p[1] || p[0];
        var completa = p[0] == 'href' || p[0] == 'src' || p[0] == 'action';
        def(p[0], function () {
            var v = this.getAttribute(a);
            if (p[0] == 'tabIndex') return v === null ? -1 : +v;
            if (v === null) return p[0] == 'action' && this.localName == 'form' ? String(document.URL || '') : '';
            // href, src y action se leen como dirección completa, como en los navegadores (Next.js hace
            // new URL(document.currentScript.src))
            if (completa) { try { return new URL(v, String(document.baseURI || location.href)).href; } catch (e) { return v; } }
            return v;
        }, function (v) { this.setAttribute(a, v); });
    });
    // <template>: su content es un fragmento con sus hijos, como en un navegador (Polymer, en YouTube, clona
    // template.content y lo mete con appendChild: era el texto del atributo content de <meta> y daba "not a node";
    // tarea 38). Se lleva lo que tenga dentro cada vez que se pide (llegue del HTML o de un innerHTML de después).
    (function () {
        var meta = Object.getOwnPropertyDescriptor(N, 'content');
        def('content', function () {
            if (this.localName != 'template') return meta.get.call(this);
            var f = this.__contenido;
            if (!f) { f = document.createDocumentFragment(); Object.defineProperty(this, '__contenido', {value: f, configurable: true}); }
            while (this.firstChild) f.appendChild(this.firstChild);
            return f;
        }, function (v) { if (this.localName != 'template') meta.set.call(this, v); });
        var clonar = N.cloneNode;
        N.cloneNode = function (hondo) {
            var c = clonar.call(this, hondo);
            if (hondo && this.localName == 'template' && this.__contenido) c.content.appendChild(this.__contenido.cloneNode(true));
            return c;
        };
    })();
    // una sola página: traer un nodo es clonarlo
    document.importNode = function (n, hondo) { return n.cloneNode(!!hondo); };
    document.adoptNode = function (n) { if (n.parentNode) n.parentNode.removeChild(n); return n; };
    // las partes de la dirección de un enlace (a.hash, a.pathname...: HTMLHyperlinkElementUtils)
    ['protocol', 'host', 'hostname', 'port', 'pathname', 'search', 'hash', 'origin', 'username', 'password'].forEach(function (k) {
        def(k, function () {
            if (this.localName != 'a' && this.localName != 'area') return undefined;
            var h = this.href;
            if (h === '') return k == 'origin' ? '' : k == 'pathname' ? '' : '';
            try { return new URL(h)[k]; } catch (e) { return ''; }
        }, function (v) {
            // (en otro nodo, una propiedad suya: ShadyDOM pone fragmento.host = el elemento de su raíz de sombra; tarea 38)
            if (this.localName != 'a' && this.localName != 'area') { Object.defineProperty(this, k, {value: v, writable: true, enumerable: true, configurable: true}); return; }
            if (k == 'origin') return;
            try { var u = new URL(this.href); u[k] = v; this.setAttribute('href', u.href); } catch (e) {}
        });
    });
    def('type', function () {
        var v = this.getAttribute('type');
        return v !== null ? v.toLowerCase() : this.localName == 'input' ? 'text' : this.localName == 'button' ? 'submit' : '';
    }, function (v) { this.setAttribute('type', v); });
    ['disabled', 'selected', 'readOnly:readonly', 'multiple', 'required', 'hidden', 'autofocus', 'async',
     'defer', 'noValidate:novalidate', 'open', 'controls', 'autoplay', 'loop', 'muted'].forEach(function (k) {
        var p = k.split(':'), a = p[1] || p[0];
        def(p[0], function () { return this.hasAttribute(a); },
            function (v) { if (v) this.setAttribute(a, ''); else this.removeAttribute(a); });
    });
    // (con setter: React los pone al montar un <input>, y en modo estricto asignar a uno sin setter es un error que
    // tiraba la página entera; tarea 37h)
    def('defaultChecked', function () { return this.hasAttribute('checked'); },
        function (v) { if (v) this.setAttribute('checked', ''); else this.removeAttribute('checked'); });
    def('defaultValue', function () {
        return this.localName == 'textarea' ? this.textContent : (this.getAttribute('value') || '');
    }, function (v) { if (this.localName == 'textarea') this.textContent = String(v); else this.setAttribute('value', String(v)); });
    def('options', function () { return this.querySelectorAll('option'); });
    def('selectedIndex', function () {
        var o = this.options;
        for (var i = 0; i < o.length; i++) if (o[i].selected) return i;
        return this.localName == 'select' && o.length && !this.multiple ? 0 : -1;
    }, function (k) { var o = this.options; for (var i = 0; i < o.length; i++) o[i].selected = i == k; });
    def('text', function () { return this.textContent; }, function (v) { this.textContent = v; });
    def('form', function () { return this.closest('form'); });
    def('elements', function () { return this.querySelectorAll('input, select, textarea, button'); });

    // classList
    def('classList', function () {
        var el = this;
        function lista() { return (el.getAttribute('class') || '').split(/\s+/).filter(Boolean); }
        function poner(l) { el.setAttribute('class', l.join(' ')); }
        var cl = {
            add: function () { var l = lista(); [].forEach.call(arguments, function (c) { if (l.indexOf(c) < 0) l.push(c); }); poner(l); },
            remove: function () { var q = [].slice.call(arguments); poner(lista().filter(function (c) { return q.indexOf(c) < 0; })); },
            contains: function (c) { return lista().indexOf(c) >= 0; },
            toggle: function (c, si) {
                var hay = this.contains(c);
                if (si === undefined) si = !hay;
                if (si && !hay) this.add(c); else if (!si && hay) this.remove(c);
                return si;
            },
            replace: function (a, b) { var l = lista(), i = l.indexOf(a); if (i < 0) return false; l[i] = b; poner(l); return true; },
            item: function (i) { return lista()[i] || null; },
            forEach: function (f, t) { lista().forEach(f, t); },
            toString: function () { return el.getAttribute('class') || ''; }
        };
        Object.defineProperty(cl, 'length', {get: function () { return lista().length; }});
        Object.defineProperty(cl, 'value', {get: function () { return el.getAttribute('class') || ''; },
                                            set: function (v) { el.setAttribute('class', String(v)); }});
        // se recorre como una lista (Array.from, for...of, cl[0]): Lenis lo hace, tarea 37a3
        cl[Symbol.iterator] = cl.values = function () { return lista()[Symbol.iterator](); };
        cl.keys = function () { return lista().keys(); };
        cl.entries = function () { return lista().entries(); };
        cl.supports = function () { return true; };
        return new Proxy(cl, {get: function (t, k) {
            return typeof k == 'string' && /^\d+$/.test(k) ? lista()[+k] : t[k];
        }});
    });

    // dataset: los atributos data-*
    def('dataset', function () {
        var el = this;
        function atr(k) { return 'data-' + String(k).replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }
        return new Proxy({}, {
            get: function (t, k) { if (typeof k != 'string') return undefined; var v = el.getAttribute(atr(k)); return v === null ? undefined : v; },
            set: function (t, k, v) { el.setAttribute(atr(k), v); return true; },
            has: function (t, k) { return el.hasAttribute(atr(k)); },
            deleteProperty: function (t, k) { el.removeAttribute(atr(k)); return true; },
            ownKeys: function () {
                return el.attributes.filter(function (a) { return a.name.indexOf('data-') == 0; }).map(function (a) {
                    return a.name.slice(5).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
                });
            },
            getOwnPropertyDescriptor: function (t, k) {
                var v = el.getAttribute(atr(k));
                return v === null ? undefined : {value: v, enumerable: true, configurable: true, writable: true};
            }
        });
    });

    // style: el atributo style como objeto (el.style.color = 'red', cssText, setProperty...)
    function guion(p) {
        if (p == 'cssFloat') return 'float';
        return String(p).replace(/^(webkit|moz|ms)([A-Z])/, '-$1$2').replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
    }
    function leerEstilo(t) {
        var o = {}, orden = [];
        String(t || '').split(';').forEach(function (d) {
            var i = d.indexOf(':');
            if (i <= 0) return;
            var k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim();
            if (!k) return;
            if (!(k in o)) orden.push(k);
            o[k] = v;
        });
        return {o: o, orden: orden};
    }
    function escribirEstilo(el, e) {
        var t = e.orden.filter(function (k) { return e.o[k] !== undefined && e.o[k] !== ''; })
                       .map(function (k) { return k + ': ' + e.o[k]; }).join('; ');
        if (t) el.setAttribute('style', t); else el.removeAttribute('style');
    }
    def('style', function () {
        var el = this;
        if (el.__estilo) return el.__estilo;
        var api = {
            getPropertyValue: function (k) { var v = leerEstilo(el.getAttribute('style')).o[String(k).toLowerCase()]; return v === undefined ? '' : v.replace(/\s*!important$/, ''); },
            getPropertyPriority: function (k) { return /!important$/.test(leerEstilo(el.getAttribute('style')).o[k] || '') ? 'important' : ''; },
            setProperty: function (k, v, prio) {
                var e = leerEstilo(el.getAttribute('style'));
                k = String(k).toLowerCase();
                v = v === null || v === undefined ? '' : String(v);
                if (!(k in e.o)) e.orden.push(k);
                e.o[k] = v && prio ? v + ' !important' : v;
                escribirEstilo(el, e);
            },
            removeProperty: function (k) { var v = this.getPropertyValue(k); this.setProperty(k, ''); return v; },
            item: function (i) { return leerEstilo(el.getAttribute('style')).orden[i] || ''; }
        };
        el.__estilo = new Proxy(api, {
            get: function (t, k) {
                if (k in t) return t[k];
                if (typeof k != 'string') return undefined;
                if (k == 'cssText') return el.getAttribute('style') || '';
                if (k == 'length') return leerEstilo(el.getAttribute('style')).orden.length;
                return t.getPropertyValue(guion(k));
            },
            set: function (t, k, v) {
                if (k == 'cssText') { if (v) el.setAttribute('style', v); else el.removeAttribute('style'); }
                else t.setProperty(guion(k), v);
                return true;
            },
            has: function (t, k) { return true; }
        });
        return el.__estilo;
    });

    // getComputedStyle: lo del atributo style y, si no, lo calculado por lib/estilo.dash
    g.getComputedStyle = function (el) {
        var api = {
            getPropertyValue: function (k) {
                k = String(k).toLowerCase();
                var v = el && el.nodeType == 1 ? el.style.getPropertyValue(k) : '';
                return v !== '' ? v : el ? __dashweb_calculado(el, k) : '';
            }
        };
        return new Proxy(api, {
            get: function (t, k) {
                if (k in t) return t[k];
                if (typeof k != 'string') return undefined;
                if (k == 'length') return 0;
                return t.getPropertyValue(guion(k));
            }
        });
    };

    // === document === (propiedades propias con defineProperty: una asignación llamaría a los
    // setters de los elementos, como hidden u open, y le pondría atributos al documento)
    function pon(o, k, v) { Object.defineProperty(o, k, {value: v, writable: true, configurable: true, enumerable: true}); }
    pon(document, 'readyState', 'loading');
    pon(document, 'defaultView', g);
    pon(document, 'activeElement', null);
    pon(document, 'hasFocus', function () { return true; });
    pon(document, 'referrer', '');
    ['characterSet', 'charset', 'inputEncoding'].forEach(function (k) { pon(document, k, 'UTF-8'); });
    pon(document, 'compatMode', 'CSS1Compat');
    pon(document, 'contentType', 'text/html');
    pon(document, 'visibilityState', 'visible');
    pon(document, 'hidden', false);
    pon(document, 'doctype', null);
    // las cookies de verdad (lib/cookies.dash): las mismas que van por HTTP, sin las HttpOnly
    Object.defineProperty(document, 'cookie', {
        get: function () { return __dashweb_galletas(String(location.href)); },
        set: function (v) { __dashweb_galleta(String(location.href), String(v)); }
    });
    ['forms:form', 'images:img', 'links:a[href]', 'scripts:script', 'anchors:a[name]'].forEach(function (k) {
        var p = k.split(':');
        Object.defineProperty(document, p[0], {get: function () { return document.querySelectorAll(p[1]); }});
    });
    document.getElementsByName = function (n) {
        return [].filter.call(document.querySelectorAll('[name]'), function (e) { return e.getAttribute('name') === String(n); });
    };
    pon(document, 'write', function () {
        var html = [].join.call(arguments, ''), cuerpo = document.body || document.documentElement;
        if (cuerpo) cuerpo.insertAdjacentHTML('beforeend', html);
    });
    pon(document, 'writeln', document.write);
    pon(document, 'open', function () {});
    pon(document, 'close', function () {});
    document.createElementNS = function (ns, n) { return document.createElement(n); };
    document.createAttribute = function (n) { return {name: n, value: ''}; };
    // Range (tarea 38: el código de YouTube mira Range.prototype y paraba en "Range is not defined"): los límites, el
    // contenido de un mismo contenedor (borrar, sacar, clonar), insertNode y HTML a nodos (createContextualFragment);
    // sus medidas, a cero
    function Range() { this.startContainer = this.endContainer = this.commonAncestorContainer = document; this.startOffset = this.endOffset = 0; this.collapsed = true; }
    function rangoAl(r) {
        r.collapsed = r.startContainer === r.endContainer && r.startOffset === r.endOffset;
        var a = r.startContainer;
        while (a && a !== r.endContainer && !(a.contains && a.contains(r.endContainer))) a = a.parentNode;
        r.commonAncestorContainer = a || document;
    }
    function indice(n) { var i = 0; while ((n = n.previousSibling)) i++; return i; }
    function largo(n) { return n.nodeType == 3 || n.nodeType == 8 ? n.data.length : n.childNodes.length; }
    Range.prototype.setStart = function (n, o) { this.startContainer = n; this.startOffset = o; if (this.collapsed) { this.endContainer = n; this.endOffset = o; } rangoAl(this); };
    Range.prototype.setEnd = function (n, o) { this.endContainer = n; this.endOffset = o; rangoAl(this); };
    Range.prototype.setStartBefore = function (n) { this.setStart(n.parentNode, indice(n)); };
    Range.prototype.setStartAfter = function (n) { this.setStart(n.parentNode, indice(n) + 1); };
    Range.prototype.setEndBefore = function (n) { this.setEnd(n.parentNode, indice(n)); };
    Range.prototype.setEndAfter = function (n) { this.setEnd(n.parentNode, indice(n) + 1); };
    Range.prototype.selectNode = function (n) { var p = n.parentNode, i = indice(n); this.startContainer = this.endContainer = p; this.startOffset = i; this.endOffset = i + 1; rangoAl(this); };
    Range.prototype.selectNodeContents = function (n) { this.startContainer = this.endContainer = n; this.startOffset = 0; this.endOffset = largo(n); rangoAl(this); };
    Range.prototype.collapse = function (alInicio) {
        if (alInicio) { this.endContainer = this.startContainer; this.endOffset = this.startOffset; }
        else { this.startContainer = this.endContainer; this.startOffset = this.endOffset; }
        rangoAl(this);
    };
    Range.prototype.cloneRange = function () { var r = new Range(); r.startContainer = this.startContainer; r.startOffset = this.startOffset; r.endContainer = this.endContainer; r.endOffset = this.endOffset; rangoAl(r); return r; };
    Range.prototype.detach = function () {};
    // lo de dentro, si empieza y acaba en el mismo contenedor (lo que hacen casi todas las webs)
    function trozo(r, sacar, clonar) {
        var c = r.startContainer, f = document.createDocumentFragment();
        if (c !== r.endContainer) return f;
        if (c.nodeType == 3 || c.nodeType == 8) {
            var t = c.data.substring(r.startOffset, r.endOffset);
            if (clonar) f.appendChild(document.createTextNode(t));
            if (sacar) { c.data = c.data.substring(0, r.startOffset) + c.data.substring(r.endOffset); r.collapse(true); }
            return f;
        }
        var hs = Array.prototype.slice.call(c.childNodes, r.startOffset, r.endOffset);
        hs.forEach(function (h) { if (sacar && clonar) f.appendChild(h); else if (clonar) f.appendChild(h.cloneNode(true)); else c.removeChild(h); });
        if (sacar) { r.endOffset = r.startOffset; rangoAl(r); }
        return f;
    }
    Range.prototype.deleteContents = function () { trozo(this, true, false); };
    Range.prototype.extractContents = function () { return trozo(this, true, true); };
    Range.prototype.cloneContents = function () { return trozo(this, false, true); };
    Range.prototype.insertNode = function (n) {
        var c = this.startContainer;
        if (c.nodeType == 3) { var resto = c.splitText ? c.splitText(this.startOffset) : null; c.parentNode.insertBefore(n, resto || c.nextSibling); }
        else c.insertBefore(n, c.childNodes[this.startOffset] || null);
        rangoAl(this);
    };
    Range.prototype.surroundContents = function (e) { var f = this.extractContents(); e.appendChild(f); this.insertNode(e); };
    Range.prototype.createContextualFragment = function (h) {
        var t = document.createElement('div'), f = document.createDocumentFragment();
        t.innerHTML = h;
        while (t.firstChild) f.appendChild(t.firstChild);
        return f;
    };
    Range.prototype.getBoundingClientRect = function () { return {x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0}; };
    Range.prototype.getClientRects = function () { return []; };
    Range.prototype.toString = function () { var f = this.cloneContents(); return f.textContent || ''; };
    Range.prototype.compareBoundaryPoints = function () { return 0; };
    Range.prototype.comparePoint = function () { return 0; };
    Range.prototype.isPointInRange = function () { return false; };
    Range.prototype.intersectsNode = function () { return false; };
    Range.START_TO_START = 0; Range.START_TO_END = 1; Range.END_TO_END = 2; Range.END_TO_START = 3;
    g.Range = Range;
    g.StaticRange = Range;
    document.createRange = function () { return new Range(); };
    document.getSelection = g.getSelection = function () {
        return {rangeCount: 0, removeAllRanges: function () {}, addRange: function () {}, toString: function () { return ''; }};
    };
    document.elementFromPoint = function () { return document.body; };
    document.implementation = {
        hasFeature: function () { return true; },
        createHTMLDocument: function (t) {
            var d = __dashweb_documento_nuevo(t === undefined ? '' : t);
            // (lo de un documento, del prototipo del documento; antes de tenerlo, se copiaba de document)
            var P = Object.getPrototypeOf(document);
            if (P !== N) Object.setPrototypeOf(d, P);
            else Object.getOwnPropertyNames(document).forEach(function (k) {
                if (!(k in Object.getPrototypeOf(d)) || ['body', 'head', 'documentElement'].indexOf(k) >= 0) {
                    try { Object.defineProperty(d, k, Object.getOwnPropertyDescriptor(document, k)); } catch (e) {}
                }
            });
            d.readyState = 'complete';
            return d;
        }
    };

    // === window ===
    g.self = g.top = g.parent = g.frames = g;
    g.frameElement = null;
    g.closed = false;
    g.name = '';
    g.length = 0;
    ['innerWidth', 'outerWidth'].forEach(function (k) {
        Object.defineProperty(g, k, {get: function () { return vista().ancho; }, set: function () {}, configurable: true});
    });
    ['innerHeight', 'outerHeight'].forEach(function (k) {
        Object.defineProperty(g, k, {get: function () { return vista().alto; }, set: function () {}, configurable: true});
    });
    g.devicePixelRatio = 1;
    g.screen = {width: 640, height: 480, availWidth: 640, availHeight: 480, colorDepth: 16, pixelDepth: 16,
                orientation: {type: 'landscape-primary', angle: 0}};
    g.scrollX = g.pageXOffset = g.screenX = g.screenY = 0;
    ['scrollY', 'pageYOffset'].forEach(function (k) {
        Object.defineProperty(g, k, {get: function () { return vista().desde; }, set: function () {}, configurable: true});
    });
    g.scrollTo = g.scroll = function (x, y) { var t = arriba(x, y); if (t !== undefined) desplazarA(t); };
    g.scrollBy = function (x, y) { var t = arriba(x, y); if (t) desplazarA(vista().desde + t); };
    g.focus = g.blur = g.print = g.stop = function () {};
    g.alert = function (m) { console.log('alert: ' + m); };
    g.confirm = function (m) { console.log('confirm: ' + m); return false; };
    g.prompt = function (m) { console.log('prompt: ' + m); return null; };
    g.open = function () { return null; };
    g.close = function () {};
    g.postMessage = function () {};
    // MessageChannel (tarea 38: el código de YouTube lo usa para repartir el trabajo y paraba en "MessageChannel is
    // not defined"): cada puerto entrega al otro en un temporizador a 0, como hace un navegador en otra vuelta
    function MessagePort() { this.onmessage = null; this.onmessageerror = null; this._otro = null; this._oyentes = []; this._cerrado = false; }
    MessagePort.prototype.postMessage = function (d) {
        var o = this._otro;
        if (!o || this._cerrado) return;
        setTimeout(function () {
            if (o._cerrado) return;
            var e = new Ev('message');
            e.data = d; e.ports = []; e.origin = ''; e.source = null;
            Object.defineProperty(e, 'target', {value: o, configurable: true});
            Object.defineProperty(e, 'currentTarget', {value: o, configurable: true});
            if (typeof o.onmessage == 'function') o.onmessage.call(o, e);
            o._oyentes.slice().forEach(function (f) { if (typeof f == 'function') f.call(o, e); else if (f && f.handleEvent) f.handleEvent(e); });
        }, 0);
    };
    MessagePort.prototype.addEventListener = function (t, f) { if (t == 'message' && this._oyentes.indexOf(f) < 0) this._oyentes.push(f); };
    MessagePort.prototype.removeEventListener = function (t, f) { var i = this._oyentes.indexOf(f); if (t == 'message' && i >= 0) this._oyentes.splice(i, 1); };
    MessagePort.prototype.start = function () {};
    MessagePort.prototype.close = function () { this._cerrado = true; };
    MessagePort.prototype.dispatchEvent = function () { return true; };
    function MessageChannel() { this.port1 = new MessagePort(); this.port2 = new MessagePort(); this.port1._otro = this.port2; this.port2._otro = this.port1; }
    g.MessageChannel = MessageChannel;
    g.MessagePort = MessagePort;
    var idioma = g.__dashweb_idioma || 'en-US', idiomas = [idioma];
    if (idioma.indexOf('-') > 0) idiomas.push(idioma.split('-')[0]);
    if (idiomas.indexOf('en') < 0) idiomas.push('en');
    g.navigator = {
        userAgent: 'Mozilla/5.0 (AmigaOS; m68k) Tachyon/0.7', appName: 'Netscape', appVersion: '5.0 (AmigaOS)',
        appCodeName: 'Mozilla', product: 'Gecko', productSub: '20030107', vendor: '', vendorSub: '',
        platform: 'AmigaOS', language: idioma, languages: idiomas, cookieEnabled: true,
        onLine: true, doNotTrack: '1', hardwareConcurrency: 1, maxTouchPoints: 0, pdfViewerEnabled: false,
        webdriver: false, plugins: [], mimeTypes: [],
        javaEnabled: function () { return false; },
        sendBeacon: function () { return false; },
        userAgentData: undefined
    };
    g.clientInformation = g.navigator;
    function Almacen() {
        var d = {};
        return {
            getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
            setItem: function (k, v) { d[k] = String(v); },
            removeItem: function (k) { delete d[k]; },
            clear: function () { d = {}; },
            key: function (i) { return Object.keys(d)[i] || null; },
            get length() { return Object.keys(d).length; }
        };
    }
    g.localStorage = Almacen();
    g.sessionStorage = Almacen();
    g.history = {length: 1, state: null, scrollRestoration: 'auto',
                 pushState: function (s) { this.state = s; }, replaceState: function (s) { this.state = s; },
                 back: function () {}, forward: function () {}, go: function () {}};
    g.matchMedia = function (q) {
        return {matches: __dashweb_media(String(q)), media: String(q), onchange: null,
                addListener: function () {}, removeListener: function () {},
                addEventListener: function () {}, removeEventListener: function () {}};
    };
    // performance, con timing y la entrada de navegación (tarea 38a: la portada de YouTube lee
    // performance.timing.responseStart y se paraba ahí): todo en el instante en que empezó la página
    var origen = Date.now() - __dashweb_reloj();
    var tiempos = {};
    ['navigationStart', 'unloadEventStart', 'unloadEventEnd', 'redirectStart', 'redirectEnd', 'fetchStart',
     'domainLookupStart', 'domainLookupEnd', 'connectStart', 'connectEnd', 'secureConnectionStart', 'requestStart',
     'responseStart', 'responseEnd', 'domLoading', 'domInteractive', 'domContentLoadedEventStart',
     'domContentLoadedEventEnd', 'domComplete', 'loadEventStart', 'loadEventEnd'].forEach(function (k) {
        tiempos[k] = /^(unload|redirect|secure)/.test(k) ? 0 : origen;
    });
    tiempos.toJSON = function () { return this; };
    function navegacion() {
        var e = {name: String(g.location && g.location.href), entryType: 'navigation', startTime: 0, duration: 0,
                 type: 'navigate', redirectCount: 0, transferSize: 0, encodedBodySize: 0, decodedBodySize: 0};
        for (var k in tiempos) if (typeof tiempos[k] == 'number') e[k] = tiempos[k] ? tiempos[k] - origen : 0;
        e.toJSON = function () { return this; };
        return e;
    }
    g.performance = {now: function () { return __dashweb_reloj(); }, timeOrigin: origen, timing: tiempos,
                     navigation: {type: 0, redirectCount: 0, TYPE_NAVIGATE: 0, TYPE_RELOAD: 1, TYPE_BACK_FORWARD: 2},
                     mark: function () {}, measure: function () {}, clearMarks: function () {}, clearMeasures: function () {},
                     getEntries: function () { return [navegacion()]; },
                     getEntriesByType: function (t) { return t == 'navigation' ? [navegacion()] : []; },
                     getEntriesByName: function () { return []; },
                     addEventListener: function () {}, removeEventListener: function () {}};
    g.CSS = {supports: function () { return false; },
             escape: function (s) { return String(s).replace(/([^\w\u00a0-\uffff-])/g, '\\$1').replace(/^(\d)/, '\\3$1 '); }};
    function Observador() { this.observe = this.unobserve = this.disconnect = function () {}; this.takeRecords = function () { return []; }; }
    g.PerformanceObserver = Observador;
    // NodeFilter, TreeWalker y NodeIterator (tarea 38a: el polyfill de componentes web de YouTube recorre el árbol
    // con ellos y paraba en "NodeFilter is not defined")
    var NF = {FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3, SHOW_ALL: 0xFFFFFFFF, SHOW_ELEMENT: 1,
              SHOW_ATTRIBUTE: 2, SHOW_TEXT: 4, SHOW_CDATA_SECTION: 8, SHOW_ENTITY_REFERENCE: 0x10, SHOW_ENTITY: 0x20,
              SHOW_PROCESSING_INSTRUCTION: 0x40, SHOW_COMMENT: 0x80, SHOW_DOCUMENT: 0x100, SHOW_DOCUMENT_TYPE: 0x200,
              SHOW_DOCUMENT_FRAGMENT: 0x400, SHOW_NOTATION: 0x800};
    g.NodeFilter = NF;
    function filtrar(w, n) {
        if (!((w.whatToShow >>> 0) & (1 << (n.nodeType - 1)))) return 3;
        var f = w.filter;
        if (!f) return 1;
        return typeof f == 'function' ? f.call(null, n) : f.acceptNode(n);
    }
    function TreeWalker(raiz, ver, filtro) { this.root = raiz; this.whatToShow = ver === undefined ? NF.SHOW_ALL : ver; this.filter = filtro || null; this.currentNode = raiz; }
    TreeWalker.prototype.parentNode = function () {
        for (var n = this.currentNode; n && n !== this.root; ) { n = n.parentNode; if (n && filtrar(this, n) == 1) return this.currentNode = n; }
        return null;
    };
    function hijo(w, primero) {
        var n = primero ? w.currentNode.firstChild : w.currentNode.lastChild;
        while (n) {
            var r = filtrar(w, n);
            if (r == 1) return w.currentNode = n;
            if (r == 3) { var h = primero ? n.firstChild : n.lastChild; if (h) { n = h; continue; } }
            while (n) {
                var s = primero ? n.nextSibling : n.previousSibling;
                if (s) { n = s; break; }
                var p = n.parentNode;
                if (!p || p === w.root || p === w.currentNode) return null;
                n = p;
            }
        }
        return null;
    }
    function hermano(w, siguiente) {
        var n = w.currentNode;
        if (n === w.root) return null;
        for (;;) {
            var s = siguiente ? n.nextSibling : n.previousSibling;
            while (s) {
                n = s;
                var r = filtrar(w, n);
                if (r == 1) return w.currentNode = n;
                s = siguiente ? n.firstChild : n.lastChild;
                if (r == 2 || !s) s = siguiente ? n.nextSibling : n.previousSibling;
            }
            n = n.parentNode;
            if (!n || n === w.root) return null;
            if (filtrar(w, n) == 1) return null;
        }
    }
    TreeWalker.prototype.firstChild = function () { return hijo(this, true); };
    TreeWalker.prototype.lastChild = function () { return hijo(this, false); };
    TreeWalker.prototype.nextSibling = function () { return hermano(this, true); };
    TreeWalker.prototype.previousSibling = function () { return hermano(this, false); };
    TreeWalker.prototype.nextNode = function () {
        var n = this.currentNode, r = 1;
        for (;;) {
            while (r != 2 && n.firstChild) { n = n.firstChild; r = filtrar(this, n); if (r == 1) return this.currentNode = n; }
            var s = null;
            for (var t = n; t && t !== this.root; t = t.parentNode) { s = t.nextSibling; if (s) break; }
            if (!s) return null;
            n = s; r = filtrar(this, n);
            if (r == 1) return this.currentNode = n;
        }
    };
    TreeWalker.prototype.previousNode = function () {
        var n = this.currentNode;
        while (n !== this.root) {
            var s = n.previousSibling;
            while (s) {
                n = s;
                var r = filtrar(this, n);
                while (r != 2 && n.lastChild) { n = n.lastChild; r = filtrar(this, n); }
                if (r == 1) return this.currentNode = n;
                s = n.previousSibling;
            }
            if (n === this.root || !n.parentNode) return null;
            n = n.parentNode;
            if (filtrar(this, n) == 1) return this.currentNode = n;
        }
        return null;
    };
    g.TreeWalker = TreeWalker;
    document.createTreeWalker = function (raiz, ver, filtro) { return new TreeWalker(raiz, ver, filtro); };
    function NodeIterator(raiz, ver, filtro) { this.root = raiz; this.whatToShow = ver === undefined ? NF.SHOW_ALL : ver; this.filter = filtro || null; this.referenceNode = raiz; this.pointerBeforeReferenceNode = true; }
    NodeIterator.prototype.nextNode = function () {
        var w = new TreeWalker(this.root, NF.SHOW_ALL, null), n = this.referenceNode;
        if (this.pointerBeforeReferenceNode) { this.pointerBeforeReferenceNode = false; if (filtrar(this, n) == 1) return n; }
        for (;;) { w.currentNode = n; n = w.nextNode(); if (!n) return null; this.referenceNode = n; if (filtrar(this, n) == 1) return n; }
    };
    NodeIterator.prototype.previousNode = function () {
        var w = new TreeWalker(this.root, NF.SHOW_ALL, null), n = this.referenceNode;
        if (!this.pointerBeforeReferenceNode) { this.pointerBeforeReferenceNode = true; if (filtrar(this, n) == 1) return n; }
        for (;;) { w.currentNode = n; n = w.previousNode(); if (!n) return null; this.referenceNode = n; if (filtrar(this, n) == 1) return n; }
    };
    NodeIterator.prototype.detach = function () {};
    g.NodeIterator = NodeIterator;
    document.createNodeIterator = function (raiz, ver, filtro) { return new NodeIterator(raiz, ver, filtro); };
    // MutationObserver de verdad (tarea 38b; antes no avisaba nunca: el polyfill de componentes web de YouTube lo
    // necesita para mejorar los elementos que entran después, y muchas webs miran así sus cambios). Se envuelven los
    // métodos de C que cambian el árbol; sin nadie observando, solo cuesta mirar un contador.
    var mo_vivos = 0, mo_pendientes = [], mo_programado = false;
    function MutationRecord(tipo, objetivo) {
        this.type = tipo; this.target = objetivo; this.addedNodes = []; this.removedNodes = [];
        this.previousSibling = null; this.nextSibling = null; this.attributeName = null;
        this.attributeNamespace = null; this.oldValue = null;
    }
    function mo_entregar() {
        mo_programado = false;
        while (mo_pendientes.length) {
            var lista = mo_pendientes; mo_pendientes = [];
            for (var i = 0; i < lista.length; i++) {
                var o = lista[i], r = o._registros;
                o._en_cola = false;
                if (!r.length) continue;
                o._registros = [];
                try { o._cb.call(o, r, o); } catch (e) { console.log('MutationObserver: ' + e); }
            }
        }
    }
    // Un cambio en objetivo: a cada observador que lo mire (él o un antepasado con subtree), una vez
    function mo_apuntar(objetivo, tipo, rellenar, nombre, viejo) {
        var vistos = [];
        for (var n = objetivo; n; n = n.parentNode) {
            var regs = n.__mo;
            if (!regs) continue;
            for (var i = 0; i < regs.length; i++) {
                var g1 = regs[i], op = g1.op;
                if (n !== objetivo && !op.subtree) continue;
                if (tipo == 'attributes' && (!op.attributes || (op.attributeFilter && op.attributeFilter.indexOf(nombre) < 0))) continue;
                if (tipo == 'characterData' && !op.characterData) continue;
                if (tipo == 'childList' && !op.childList) continue;
                if (vistos.indexOf(g1.obs) >= 0) continue;
                vistos.push(g1.obs);
                var r = new MutationRecord(tipo, objetivo);
                rellenar(r);
                if (tipo == 'attributes') { r.attributeName = nombre; if (op.attributeOldValue) r.oldValue = viejo; }
                if (tipo == 'characterData' && op.characterDataOldValue) r.oldValue = viejo;
                g1.obs._registros.push(r);
                if (!g1.obs._en_cola) { g1.obs._en_cola = true; mo_pendientes.push(g1.obs); }
                if (!mo_programado) { mo_programado = true; Promise.resolve().then(mo_entregar); }
            }
        }
    }
    function MutationObserver(cb) {
        if (typeof cb != 'function') throw new TypeError('MutationObserver: callback is not a function');
        this._cb = cb; this._registros = []; this._objetivos = []; this._en_cola = false;
    }
    MutationObserver.prototype.observe = function (objetivo, op) {
        op = op || {};
        var o = {childList: !!op.childList, subtree: !!op.subtree,
                 attributes: !!(op.attributes || op.attributeOldValue || op.attributeFilter),
                 attributeOldValue: !!op.attributeOldValue, attributeFilter: op.attributeFilter ? Array.prototype.slice.call(op.attributeFilter) : null,
                 characterData: !!(op.characterData || op.characterDataOldValue), characterDataOldValue: !!op.characterDataOldValue};
        if (!o.childList && !o.attributes && !o.characterData) throw new TypeError("MutationObserver: nothing to observe");
        var regs = objetivo.__mo;
        if (!regs) { regs = []; Object.defineProperty(objetivo, '__mo', {value: regs, configurable: true}); }
        for (var i = 0; i < regs.length; i++) if (regs[i].obs === this) { regs[i].op = o; return; }
        regs.push({obs: this, op: o});
        this._objetivos.push(objetivo);
        mo_vivos++;
    };
    MutationObserver.prototype.disconnect = function () {
        for (var k = 0; k < this._objetivos.length; k++) {
            var regs = this._objetivos[k].__mo;
            for (var i = regs ? regs.length - 1 : -1; i >= 0; i--) if (regs[i].obs === this) { regs.splice(i, 1); mo_vivos--; }
        }
        this._objetivos = []; this._registros = [];
    };
    MutationObserver.prototype.takeRecords = function () { var r = this._registros; this._registros = []; return r; };
    g.MutationObserver = g.WebKitMutationObserver = MutationObserver;
    g.MutationRecord = MutationRecord;
    function hijos(n) { return Array.prototype.slice.call(n.childNodes); }
    (function () {
        var appendChild = N.appendChild, insertBefore = N.insertBefore, removeChild = N.removeChild,
            replaceChild = N.replaceChild, setAttribute = N.setAttribute, removeAttribute = N.removeAttribute;
        // quitarlo de donde estaba antes de meterlo en otro sitio
        function sacar(c) {
            var p = c.parentNode;
            if (p) { var a = c.previousSibling, s = c.nextSibling;
                     mo_apuntar(p, 'childList', function (r) { r.removedNodes = [c]; r.previousSibling = a; r.nextSibling = s; }); }
        }
        function meter(padre, c, antes, f) {
            var nuevos = c && c.nodeType == 11 ? hijos(c) : [c], a = antes ? antes.previousSibling : padre.lastChild;
            if (!c || c.nodeType != 11) sacar(c);
            var r = f();
            if (nuevos.length) mo_apuntar(padre, 'childList', function (x) { x.addedNodes = nuevos; x.previousSibling = a; x.nextSibling = antes || null; });
            return r;
        }
        N.appendChild = function (c) {
            if (!mo_vivos) return appendChild.call(this, c);
            var p = this; return meter(p, c, null, function () { return appendChild.call(p, c); });
        };
        N.insertBefore = function (c, antes) {
            if (!mo_vivos) return insertBefore.call(this, c, antes);
            var p = this; return meter(p, c, antes, function () { return insertBefore.call(p, c, antes); });
        };
        N.removeChild = function (c) {
            if (!mo_vivos) return removeChild.call(this, c);
            var a = c.previousSibling, s = c.nextSibling, r = removeChild.call(this, c);
            mo_apuntar(this, 'childList', function (x) { x.removedNodes = [c]; x.previousSibling = a; x.nextSibling = s; });
            return r;
        };
        N.replaceChild = function (n, viejo) {
            if (!mo_vivos) return replaceChild.call(this, n, viejo);
            var a = viejo.previousSibling, s = viejo.nextSibling, nuevos = n.nodeType == 11 ? hijos(n) : [n];
            if (n.nodeType != 11 && n !== viejo) sacar(n);
            var r = replaceChild.call(this, n, viejo);
            mo_apuntar(this, 'childList', function (x) { x.addedNodes = nuevos; x.removedNodes = [viejo]; x.previousSibling = a; x.nextSibling = s; });
            return r;
        };
        N.setAttribute = function (nombre, v) {
            if (!mo_vivos) return setAttribute.call(this, nombre, v);
            nombre = String(nombre).toLowerCase();
            var viejo = this.getAttribute(nombre), r = setAttribute.call(this, nombre, v);
            mo_apuntar(this, 'attributes', function () {}, nombre, viejo);
            return r;
        };
        N.removeAttribute = function (nombre) {
            if (!mo_vivos || !this.hasAttribute(nombre)) return removeAttribute.call(this, nombre);
            nombre = String(nombre).toLowerCase();
            var viejo = this.getAttribute(nombre), r = removeAttribute.call(this, nombre);
            mo_apuntar(this, 'attributes', function () {}, nombre, viejo);
            return r;
        };
        // las propiedades de C que cambian el árbol, el texto o un atributo
        // (una sola capa por propiedad, que la pila no da para muchas: aquí también lo del prototipo de una clase y que
        // innerHTML en un <template> sustituye su contenido)
        function envolver(prop, hacer) {
            var d = Object.getOwnPropertyDescriptor(N, prop);
            if (!d || !d.set) return;
            var poner = function (v) {
                if (!__dashweb_es_nodo(this)) { Object.defineProperty(this, prop, {value: v, writable: true, enumerable: true, configurable: true}); return; }
                if (prop == 'innerHTML' && this.__contenido && this.localName == 'template') while (this.__contenido.firstChild) this.__contenido.removeChild(this.__contenido.firstChild);
                if (!mo_vivos) return d.set.call(this, v);
                hacer(this, v, d);
            };
            poner.__seguro = true;
            Object.defineProperty(N, prop, {get: d.get, configurable: true, enumerable: d.enumerable, set: poner});
        }
        function contenido(n, v, d) {
            if (n.nodeType == 3 || n.nodeType == 8) { texto(n, v, d); return; }
            var quitados = hijos(n);
            d.set.call(n, v);
            var puestos = hijos(n);
            if (quitados.length || puestos.length)
                mo_apuntar(n, 'childList', function (x) { x.removedNodes = quitados; x.addedNodes = puestos; });
        }
        function texto(n, v, d) {
            var viejo = n.data;
            d.set.call(n, v);
            mo_apuntar(n, 'characterData', function () {}, null, viejo);
        }
        envolver('innerHTML', contenido);
        envolver('textContent', contenido);
        envolver('data', texto);
        envolver('nodeValue', texto);
        [['id', 'id'], ['className', 'class']].forEach(function (p) {
            envolver(p[0], function (n, v, d) { var viejo = n.getAttribute(p[1]); d.set.call(n, v); mo_apuntar(n, 'attributes', function () {}, p[1], viejo); });
        });
    })();

    // IntersectionObserver de verdad (tarea 37e), con la geometría de la última maqueta: dashweb llama a
    // __dashweb_intersecciones tras maquetar, al desplazar y tras los temporizadores (si hay algo por mirar)
    var vigias = [], vigiaPendiente = false;
    function margen(m, ancho, alto) {
        var p = String(m || '0px').trim().split(/\s+/).map(function (v, i) {
            var n = parseFloat(v) || 0;
            return /%$/.test(v) ? n * (i % 2 ? ancho : alto) / 100 : n;
        });
        if (p.length == 1) p = [p[0], p[0], p[0], p[0]];
        else if (p.length == 2) p = [p[0], p[1], p[0], p[1]];
        else if (p.length == 3) p = [p[0], p[1], p[2], p[1]];
        return p;
    }
    function IntersectionObserver(f, o) {
        if (typeof f != 'function') throw new TypeError("IntersectionObserver: callback is not a function");
        o = o || {};
        this._f = f;
        this.root = o.root || null;
        this.rootMargin = o.rootMargin || '0px 0px 0px 0px';
        var t = o.threshold === undefined ? [0] : [].concat(o.threshold);
        this.thresholds = t.map(Number).sort(function (a, b) { return a - b; });
        this._lista = [];
        this._estado = [];
        this._cola = [];
        vigias.push(this);
    }
    IntersectionObserver.prototype.observe = function (el) {
        if (!el || this._lista.indexOf(el) >= 0) return;
        this._lista.push(el);
        this._estado.push(-2);      // (sin mirar: la primera vez se avisa siempre, como los navegadores)
        vigiaPendiente = true;
    };
    IntersectionObserver.prototype.unobserve = function (el) {
        var i = this._lista.indexOf(el);
        if (i >= 0) { this._lista.splice(i, 1); this._estado.splice(i, 1); }
    };
    IntersectionObserver.prototype.disconnect = function () { this._lista = []; this._estado = []; };
    IntersectionObserver.prototype.takeRecords = function () { var c = this._cola; this._cola = []; return c; };
    IntersectionObserver.prototype._mirar = function (ahora) {
        var v = vista(), raiz = {left: 0, top: 0, right: v.ancho, bottom: v.alto};
        if (this.root && this.root.getBoundingClientRect) {
            var rr = this.root.getBoundingClientRect();
            raiz = {left: rr.left, top: rr.top, right: rr.right, bottom: rr.bottom};
        }
        var m = margen(this.rootMargin, raiz.right - raiz.left, raiz.bottom - raiz.top);
        raiz = {left: raiz.left - m[3], top: raiz.top - m[0], right: raiz.right + m[1], bottom: raiz.bottom + m[2]};
        var entradas = [];
        for (var i = 0; i < this._lista.length; i++) {
            var el = this._lista[i], r = el.getBoundingClientRect(), visto = el.isConnected && __dashweb_caja(el) !== null;
            var x0 = Math.max(r.left, raiz.left), y0 = Math.max(r.top, raiz.top),
                x1 = Math.min(r.right, raiz.right), y1 = Math.min(r.bottom, raiz.bottom);
            var cruza = visto && x0 <= x1 && y0 <= y1, area = r.width * r.height, inter = cruza ? (x1 - x0) * (y1 - y0) : 0;
            var razon = !cruza ? 0 : area > 0 ? inter / area : 1;
            // el umbral que se ha pasado (-1: ninguno; con threshold 0, basta con cruzar)
            var nivel = -1;
            for (var k = 0; k < this.thresholds.length; k++)
                if (cruza && (razon >= this.thresholds[k] || (this.thresholds[k] == 0 && cruza))) nivel = k;
            if (nivel != this._estado[i]) {
                this._estado[i] = nivel;
                entradas.push({target: el, time: ahora, isIntersecting: cruza, intersectionRatio: razon,
                               boundingClientRect: r, rootBounds: rect(raiz.left, raiz.top, raiz.right - raiz.left, raiz.bottom - raiz.top),
                               intersectionRect: cruza ? rect(x0, y0, x1 - x0, y1 - y0) : rect(0, 0, 0, 0)});
            }
        }
        if (entradas.length) {
            this._cola = this._cola.concat(entradas);
            var todas = this.takeRecords();
            try { this._f.call(this, todas, this); } catch (e) { console.error(e); }
        }
    };
    g.IntersectionObserver = IntersectionObserver;
    g.IntersectionObserverEntry = function () {};
    // ResizeObserver (tarea 48a): tras cada maqueta, el tamaño de lo observado; si cambió (la primera vez, siempre),
    // la llamada con sus entradas (las estrellas de tachyon.freemem.space miden su <canvas> así: antes de la maqueta
    // su tamaño no vale)
    var medidores = [];
    function ResizeObserver(f) {
        if (typeof f != 'function') throw new TypeError("ResizeObserver: callback is not a function");
        this._f = f;
        this._lista = [];
        this._tam = [];
        medidores.push(this);
    }
    ResizeObserver.prototype.observe = function (el) {
        if (!el || this._lista.indexOf(el) >= 0) return;
        this._lista.push(el);
        this._tam.push(null);
        vigiaPendiente = true;
    };
    ResizeObserver.prototype.unobserve = function (el) {
        var i = this._lista.indexOf(el);
        if (i >= 0) { this._lista.splice(i, 1); this._tam.splice(i, 1); }
    };
    ResizeObserver.prototype.disconnect = function () { this._lista = []; this._tam = []; };
    ResizeObserver.prototype._mirar = function () {
        var entradas = [];
        for (var i = 0; i < this._lista.length; i++) {
            var el = this._lista[i];
            if (!el.isConnected || __dashweb_caja(el) === null) continue;
            var r = el.getBoundingClientRect(), t = this._tam[i];
            if (t && t[0] == r.width && t[1] == r.height) continue;
            this._tam[i] = [r.width, r.height];
            var caja = [{inlineSize: r.width, blockSize: r.height}];
            entradas.push({target: el, contentRect: rect(0, 0, r.width, r.height), borderBoxSize: caja,
                           contentBoxSize: caja, devicePixelContentBoxSize: caja});
        }
        if (entradas.length) { try { this._f.call(this, entradas, this); } catch (e) { console.error(e); } }
    };
    g.ResizeObserver = ResizeObserver;
    // todo = true: mirarlos todos (tras maquetar o desplazar); si no, solo si alguien llamó a observe
    g.__dashweb_intersecciones = function (todo) {
        if ((!vigias.length && !medidores.length) || (!todo && !vigiaPendiente) || __dashweb_caja(document.documentElement) === null) return;
        vigiaPendiente = false;
        var ahora = __dashweb_reloj();
        medidores.slice().forEach(function (o) { if (o._lista.length) o._mirar(); });
        vigias.slice().forEach(function (o) { if (o._lista.length) o._mirar(ahora); });
    };
    g.Image = function (w, h) { var i = document.createElement('img'); if (w) i.width = w; if (h) i.height = h; return i; };
    g.Option = function (t, v, d, s) {
        var o = document.createElement('option');
        if (t !== undefined) o.textContent = t;
        if (v !== undefined) o.setAttribute('value', v);
        if (s) o.selected = true;
        return o;
    };
    var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    g.btoa = function (s) {
        s = String(s);
        var r = '';
        for (var i = 0; i < s.length; i += 3) {
            var a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
            r += B64[a >> 2] + B64[(a & 3) << 4 | (b >> 4 || 0)] +
                 (i + 1 < s.length ? B64[(b & 15) << 2 | (c >> 6 || 0)] : '=') + (i + 2 < s.length ? B64[c & 63] : '=');
        }
        return r;
    };
    g.atob = function (s) {
        s = String(s).replace(/[^A-Za-z0-9+/]/g, '');
        var r = '', bits = 0, n = 0;
        for (var i = 0; i < s.length; i++) {
            bits = bits << 6 | B64.indexOf(s[i]);
            n += 6;
            if (n >= 8) { n -= 8; r += String.fromCharCode(bits >> n & 255); }
        }
        return r;
    };
    // TextEncoder y TextDecoder (UTF-8; TextDecoder también UTF-16LE y Latin-1): las webs de hoy los usan al
    // empezar (el webpack de Next.js, p. ej.)
    function utf8(s, destino) {
        // UTF-8 de s en un Uint8Array: en destino (encodeInto: solo los caracteres enteros que caben) o en uno nuevo
        // del tamaño justo. Dos pasadas, sin listas intermedias (los datos de una página pueden medir megas).
        var n = s.length, limite = destino ? destino.length : Infinity, total = 0, i, c, d;
        for (i = 0; i < n; i++) {
            c = s.charCodeAt(i);
            var k = c < 0x80 ? 1 : c < 0x800 ? 2 : 3, u = 1;
            if (c >= 0xD800 && c < 0xDC00 && i + 1 < n && (d = s.charCodeAt(i + 1)) >= 0xDC00 && d < 0xE000) { k = 4; u = 2; }
            if (total + k > limite) break;
            total += k;
            i += u - 1;
        }
        var leidos = i, b = destino || new Uint8Array(total), p = 0;
        for (i = 0; i < leidos; i++) {
            c = s.charCodeAt(i);
            if (c < 0x80) { b[p++] = c; continue; }
            if (c < 0x800) { b[p++] = 0xC0 | c >> 6; b[p++] = 0x80 | c & 63; continue; }
            if (c >= 0xD800 && c < 0xE000) {
                if (c < 0xDC00 && i + 1 < n && (d = s.charCodeAt(i + 1)) >= 0xDC00 && d < 0xE000) {
                    c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00);
                    i++;
                    b[p++] = 0xF0 | c >> 18; b[p++] = 0x80 | c >> 12 & 63; b[p++] = 0x80 | c >> 6 & 63; b[p++] = 0x80 | c & 63;
                    continue;
                }
                c = 0xFFFD;
            }
            b[p++] = 0xE0 | c >> 12; b[p++] = 0x80 | c >> 6 & 63; b[p++] = 0x80 | c & 63;
        }
        return {b: b, leidos: leidos, escritos: total};
    }
    function TextEncoder() {}
    TextEncoder.prototype.encoding = 'utf-8';
    TextEncoder.prototype.encode = function (s) {
        return utf8(s === undefined ? '' : String(s)).b;
    };
    TextEncoder.prototype.encodeInto = function (s, destino) {
        var r = utf8(String(s), destino);
        return {read: r.leidos, written: r.escritos};
    };
    var NOMBRES = {'utf-8': 'utf-8', 'utf8': 'utf-8', 'unicode-1-1-utf-8': 'utf-8', 'utf-16le': 'utf-16le',
                   'utf-16': 'utf-16le', 'latin1': 'windows-1252', 'iso-8859-1': 'windows-1252',
                   'windows-1252': 'windows-1252', 'ascii': 'windows-1252', 'us-ascii': 'windows-1252'};
    function TextDecoder(etiqueta, o) {
        var e = NOMBRES[String(etiqueta === undefined ? 'utf-8' : etiqueta).trim().toLowerCase()];
        if (!e) throw new RangeError("The encoding label provided ('" + etiqueta + "') is invalid.");
        this.encoding = e;
        this.fatal = !!(o && o.fatal);
        this.ignoreBOM = !!(o && o.ignoreBOM);
        this._resto = new Uint8Array(0);
        this._empezado = false;
    }
    TextDecoder.prototype.decode = function (v, o) {
        // sobre los bytes tal cual (sin copiarlos a una lista: los datos de una página pueden medir megas); el
        // texto se junta por trozos
        var seguir = !!(o && o.stream), b = this._resto;
        if (v !== undefined && v !== null) {
            var u = v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
            if (b.length) { var m = new Uint8Array(b.length + u.length); m.set(b); m.set(u, b.length); b = m; } else b = u;
        }
        this._resto = new Uint8Array(0);
        var partes = [], cods = [], i = 0, n = b.length, mal = this.fatal;
        function poner(c) {
            cods.push(c);
            if (cods.length >= 4096) { partes.push(String.fromCharCode.apply(null, cods)); cods = []; }
        }
        function malo() {
            if (mal) throw new TypeError('The encoded data was not valid for encoding utf-8');
            poner(0xFFFD);
        }
        if (this.encoding === 'windows-1252') {
            for (; i < n; i++) poner(b[i]);
        } else if (this.encoding === 'utf-16le') {
            if (!this.ignoreBOM && !this._empezado && n >= 2 && b[0] === 0xFF && b[1] === 0xFE) i = 2;
            for (; i + 1 < n; i += 2) poner(b[i] | b[i + 1] << 8);
            if (i < n) { if (seguir) this._resto = b.slice(i); else malo(); }
        } else {
            if (!this.ignoreBOM && !this._empezado && n >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) i = 3;
            while (i < n) {
                var c = b[i], k = c < 0x80 ? 0 : c >= 0xC2 && c < 0xE0 ? 1 : c >= 0xE0 && c < 0xF0 ? 2 : c >= 0xF0 && c < 0xF5 ? 3 : -1;
                if (k < 0) { malo(); i++; continue; }
                if (k === 0) { poner(c); i++; continue; }
                if (seguir && i + k >= n) {
                    // la secuencia sigue en el trozo siguiente (si lo que hay de ella está bien)
                    var bien = true;
                    for (var q = i + 1; q < n; q++) if ((b[q] & 0xC0) !== 0x80) bien = false;
                    if (bien) { this._resto = b.slice(i); break; }
                }
                // (el segundo byte tiene sus límites: ni secuencias largas de más, ni suplentes, ni > 10FFFF)
                var cp = c & (k === 1 ? 0x1F : k === 2 ? 0x0F : 0x07), j = 1;
                var bajo = c === 0xE0 ? 0xA0 : c === 0xF0 ? 0x90 : 0x80, alto = c === 0xED ? 0x9F : c === 0xF4 ? 0x8F : 0xBF;
                for (; j <= k; j++) {
                    if (i + j >= n || b[i + j] < (j === 1 ? bajo : 0x80) || b[i + j] > (j === 1 ? alto : 0xBF)) break;
                    cp = cp << 6 | b[i + j] & 63;
                }
                if (j <= k) {
                    // un U+FFFD por lo que iba bien; el byte malo se vuelve a mirar
                    malo();
                    i += j;
                    continue;
                }
                if (cp >= 0x10000) { cp -= 0x10000; poner(0xD800 + (cp >> 10)); poner(0xDC00 + (cp & 0x3FF)); }
                else poner(cp);
                i += k + 1;
            }
        }
        this._empezado = seguir;
        partes.push(String.fromCharCode.apply(null, cods));
        return partes.join('');
    };
    // ReadableStream sencilla (una cola y lectores con promesas): Next.js mete en una los datos de la página
    // (self.__next_f) y React los lee con getReader().read()
    function ReadableStream(fuente) {
        var cola = [], cerrado = false, fallo = null, esperando = [], tirando = false;
        fuente = fuente || {};
        var control = {
            enqueue: function (x) {
                if (cerrado) throw new TypeError('Invalid state: the stream is closed');
                if (esperando.length) esperando.shift().ok({value: x, done: false}); else cola.push(x);
            },
            close: function () {
                cerrado = true;
                while (esperando.length && !cola.length) esperando.shift().ok({value: undefined, done: true});
            },
            error: function (e) {
                fallo = e === undefined ? new TypeError('stream error') : e;
                cola = [];
                while (esperando.length) esperando.shift().mal(fallo);
            },
            get desiredSize() { return cerrado ? 0 : 1 - cola.length; }
        };
        function tirar() {
            // pull: cuando alguien espera y no hay nada
            if (!fuente.pull || tirando || cerrado || fallo) return;
            tirando = true;
            Promise.resolve().then(function () { return fuente.pull(control); }).then(function () {
                tirando = false;
                if (esperando.length && !cola.length) tirar();
            }, function (e) { tirando = false; control.error(e); });
        }
        this.locked = false;
        this._leer = function () {
            return new Promise(function (ok, mal) {
                if (cola.length) ok({value: cola.shift(), done: false});
                else if (fallo) mal(fallo);
                else if (cerrado) ok({value: undefined, done: true});
                else { esperando.push({ok: ok, mal: mal}); tirar(); }
            });
        };
        this._cancelar = function (r) {
            cerrado = true;
            cola = [];
            while (esperando.length) esperando.shift().ok({value: undefined, done: true});
            return Promise.resolve(fuente.cancel ? fuente.cancel(r) : undefined).then(function () {});
        };
        if (fuente.start) {
            try { fuente.start(control); } catch (e) { control.error(e); }
        }
    }
    ReadableStream.prototype.getReader = function () {
        if (this.locked) throw new TypeError('ReadableStream is locked');
        var s = this;
        s.locked = true;
        return {
            read: function () { return s._leer(); },
            releaseLock: function () { s.locked = false; },
            cancel: function (r) { return s._cancelar(r); },
            closed: new Promise(function () {})
        };
    };
    ReadableStream.prototype.cancel = function (r) { return this._cancelar(r); };
    ReadableStream.prototype[Symbol.asyncIterator] = function () {
        var s = this;
        return {next: function () { return s._leer(); }, return: function () { return s._cancelar().then(function () { return {done: true}; }); },
                [Symbol.asyncIterator]: function () { return this; }};
    };
    // (antes sin poner: con ella, Next.js en commodoremalacca.club dejaba el Amiga sin memoria, tarea 28j; ahora
    // QuickJS tiene su tope, JS_MEMORIA, y pre.opentimetrack.com la necesita al empezar)
    g.__dashweb_ReadableStream = ReadableStream;
    if (!g.ReadableStream) g.ReadableStream = ReadableStream;
    if (!g.TextEncoder) g.TextEncoder = TextEncoder;
    if (!g.TextDecoder) g.TextDecoder = TextDecoder;
    console.debug = console.trace = console.log;
    if (!console.group) console.group = console.groupCollapsed = console.groupEnd = console.table = console.dir = console.time = console.timeEnd = function () {};

    // URL y URLSearchParams (WHATWG URL, lo que usan las webs; tarea 37a2: el runtime de Turbopack los necesita)
    var URL_ESPECIALES = {'http:': '80', 'https:': '443', 'ftp:': '21', 'ws:': '80', 'wss:': '443', 'file:': ''};
    function urlPct(s, re) {
        return s.replace(re, function (c) {
            var r;
            try { r = encodeURIComponent(c); } catch (e) { return '%EF%BF%BD'; }
            return r == c ? '%' + (c.charCodeAt(0) < 16 ? '0' : '') + c.charCodeAt(0).toString(16).toUpperCase() : r;
        });
    }
    var URL_RUTA = /[\u0000-\u0020"<>`{}\u007f-\uffff]/g, URL_CONSULTA = /[\u0000-\u0020"#<>\u007f-\uffff]/g,
        URL_CONSULTA_ESP = /[\u0000-\u0020"#'<>\u007f-\uffff]/g, URL_ANCLA = /[\u0000-\u0020"<>`\u007f-\uffff]/g,
        URL_USUARIO = /[\u0000-\u0020"#<>?`{}\/:;=@\[\\\]^|\u007f-\uffff]/g;
    function urlRuta(ruta, especial) {
        if (especial) ruta = ruta.replace(/\\/g, '/');
        var trozos = ruta.split('/'), r = [];
        for (var i = 1; i < trozos.length; i++) {
            var t = trozos[i], ultimo = i == trozos.length - 1, tl = t.toLowerCase();
            if (tl == '..' || tl == '.%2e' || tl == '%2e.' || tl == '%2e%2e') {
                if (r.length) r.pop();
                if (ultimo) r.push('');
            } else if (tl == '.' || tl == '%2e') {
                if (ultimo) r.push('');
            } else r.push(t);
        }
        return '/' + urlPct(r.join('/'), URL_RUTA);
    }
    // Punycode (RFC 3492) de una etiqueta del nombre de servidor: "тест" -> "e1aybc" (lo comprueba core-js)
    function urlPunycode(etiqueta) {
        var cps = Array.from(etiqueta).map(function (c) { return c.codePointAt(0); }), sale = [], n = 128, delta = 0,
            sesgo = 72, h, b;
        cps.forEach(function (c) { if (c < 128) sale.push(String.fromCharCode(c)); });
        h = b = sale.length;
        if (b) sale.push('-');
        function adaptar(d, num, primero) {
            d = primero ? Math.floor(d / 700) : d >> 1;
            d += Math.floor(d / num);
            var k = 0;
            while (d > 455) { d = Math.floor(d / 35); k += 36; }
            return k + Math.floor(36 * d / (d + 38));
        }
        function cifra(d) { return String.fromCharCode(d + 22 + (d < 26 ? 75 : 0)); }
        while (h < cps.length) {
            var m = Infinity;
            cps.forEach(function (c) { if (c >= n && c < m) m = c; });
            delta += (m - n) * (h + 1);
            n = m;
            cps.forEach(function (c) {
                if (c < n) delta++;
                if (c == n) {
                    var q = delta;
                    for (var k = 36; ; k += 36) {
                        var t = k <= sesgo ? 1 : k >= sesgo + 26 ? 26 : k - sesgo;
                        if (q < t) break;
                        sale.push(cifra(t + (q - t) % (36 - t)));
                        q = Math.floor((q - t) / (36 - t));
                    }
                    sale.push(cifra(q));
                    sesgo = adaptar(delta, h + 1, h == b);
                    delta = 0;
                    h++;
                }
            });
            delta++;
            n++;
        }
        return sale.join('');
    }
    // La parte de servidor ("usuario:clave@nombre:puerto"); null si no vale
    function urlAutoridad(a, u) {
        var arroba = a.lastIndexOf('@');
        u.username = u.password = '';
        if (arroba >= 0) {
            var cred = a.slice(0, arroba), dos = cred.indexOf(':');
            u.username = urlPct(dos >= 0 ? cred.slice(0, dos) : cred, URL_USUARIO);
            u.password = dos >= 0 ? urlPct(cred.slice(dos + 1), URL_USUARIO) : '';
            a = a.slice(arroba + 1);
        }
        var m = /^(\[[0-9a-fA-F:.]*\]|[^:]*)(?::(\d*))?$/.exec(a);
        if (!m) return null;
        var nombre = m[1], especial = u.protocol in URL_ESPECIALES;
        if (especial) {
            try { nombre = decodeURIComponent(nombre); } catch (e) {}
            nombre = nombre.toLowerCase().split('.').map(function (e) {
                return /[^\u0000-\u007f]/.test(e) ? 'xn--' + urlPunycode(e) : e;
            }).join('.');
            if (/[\u0000\t\n\r #\/:<>?@\[\\\]^|%]/.test(nombre.replace(/^\[.*\]$/, ''))) return null;
            if (nombre == '' && u.protocol != 'file:') return null;
        }
        u.hostname = nombre;
        var puerto = m[2] || '';
        if (puerto != '') {
            puerto = String(parseInt(puerto, 10));
            if (+puerto > 65535) return null;
            if (URL_ESPECIALES[u.protocol] === puerto) puerto = '';
        }
        u.port = puerto;
        return u;
    }
    function urlCopia(b) {
        return {protocol: b.protocol, username: b.username, password: b.password, hostname: b.hostname,
                port: b.port, pathname: b.pathname, search: b.search, hash: b.hash, opaca: b.opaca, conHost: b.conHost};
    }
    // La dirección en partes (con la base si es relativa); null si no es una dirección
    function urlAnalizar(entrada, base) {
        var s = String(entrada).replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '').replace(/[\t\n\r]/g, '');
        var u, resto, ancla = '', consulta = null;
        var h = s.indexOf('#');
        if (h >= 0) { ancla = s.slice(h); s = s.slice(0, h); }
        var m = /^([a-zA-Z][a-zA-Z0-9+.\-]*):/.exec(s);
        if (m) {
            var proto = m[1].toLowerCase() + ':', especial = proto in URL_ESPECIALES;
            resto = s.slice(m[0].length);
            u = {protocol: proto, username: '', password: '', hostname: '', port: '', pathname: '', search: '', hash: '',
                 opaca: false, conHost: false};
            if (especial && base && base.protocol == proto && !/^[\/\\]/.test(resto)) {
                // "http:a/b" con base http: relativa a la base
                return urlRelativa(resto + ancla, base);
            }
            var barras = especial ? /^[\/\\]{2}/ : /^\/\//;
            if (barras.test(resto) || (especial && proto != 'file:')) {
                resto = resto.replace(proto == 'file:' ? /^[\/\\]{2}/ : especial ? /^[\/\\]*/ : /^\/\//, '');
                var fin = resto.search(especial ? /[\/\\?]/ : /[\/?]/);
                if (fin < 0) fin = resto.length;
                if (!urlAutoridad(resto.slice(0, fin), u)) return null;
                u.conHost = true;
                resto = resto.slice(fin);
            } else if (especial) {
                resto = resto.replace(/^[\/\\]+/, '/');
            }
            var q = resto.indexOf('?');
            if (q >= 0) { consulta = resto.slice(q + 1); resto = resto.slice(0, q); }
            if (especial || resto.charAt(0) == '/' || u.conHost) u.pathname = (especial || resto != '') ? urlRuta(resto, especial) : '';
            else { u.opaca = true; u.pathname = urlPct(resto, /[\u0000-\u001f\u007f-\uffff]/g); }
            if (consulta !== null) u.search = '?' + urlPct(consulta, especial ? URL_CONSULTA_ESP : URL_CONSULTA);
            u.hash = ancla != '' ? '#' + urlPct(ancla.slice(1), URL_ANCLA) : '';
            return u;
        }
        if (!base) return null;
        return urlRelativa(s + ancla, base);
    }
    function urlRelativa(s, base) {
        var especial = base.protocol in URL_ESPECIALES, ancla = '', consulta = null;
        var h = s.indexOf('#');
        if (h >= 0) { ancla = s.slice(h); s = s.slice(0, h); }
        if (base.opaca && !(s == '' && ancla != '')) return null;
        var u = urlCopia(base);
        var q = s.indexOf('?');
        if (q >= 0) { consulta = s.slice(q + 1); s = s.slice(0, q); }
        var barra = especial ? /^[\/\\]/ : /^\//, dos = especial ? /^[\/\\]{2}/ : /^\/\//;
        if (dos.test(s)) {
            s = s.replace(especial ? /^[\/\\]*/ : /^\/\//, '');
            var fin = s.search(especial ? /[\/\\]/ : /\//);
            if (fin < 0) fin = s.length;
            if (!urlAutoridad(s.slice(0, fin), u)) return null;
            u.conHost = true;
            u.pathname = urlRuta(s.slice(fin), especial);
            u.search = '';
        } else if (barra.test(s)) {
            u.pathname = urlRuta(s, especial);
            u.search = '';
        } else if (s != '') {
            var dir = u.pathname.slice(0, u.pathname.lastIndexOf('/') + 1);
            u.pathname = urlRuta((dir || '/') + s, especial);
            u.search = '';
        } else if (consulta === null && ancla == '') {
            u.hash = '';
            return u;
        }
        if (consulta !== null) u.search = '?' + urlPct(consulta, especial ? URL_CONSULTA_ESP : URL_CONSULTA);
        u.hash = ancla != '' ? '#' + urlPct(ancla.slice(1), URL_ANCLA) : '';
        return u;
    }
    function urlTexto(u) {
        var r = u.protocol;
        if (u.conHost || u.hostname != '' || u.protocol == 'file:') {
            r += '//';
            if (u.username || u.password) r += u.username + (u.password ? ':' + u.password : '') + '@';
            r += u.hostname + (u.port ? ':' + u.port : '');
        }
        return r + u.pathname + u.search + u.hash;
    }
    function URL(url, base) {
        if (!(this instanceof URL)) throw new TypeError("Failed to construct 'URL': use new");
        var b = null;
        if (base !== undefined) {
            b = base instanceof URL ? base._u : urlAnalizar(base, null);
            if (!b) throw new TypeError("Invalid base URL: " + base);
        }
        var u = url instanceof URL ? urlCopia(url._u) : urlAnalizar(url, b);
        if (!u) throw new TypeError("Invalid URL: " + url);
        this._u = u;
        this._params = null;
    }
    URL.canParse = function (url, base) { try { new URL(url, base); return true; } catch (e) { return false; } };
    URL.parse = function (url, base) { try { return new URL(url, base); } catch (e) { return null; } };
    var blobs = 0;
    URL.createObjectURL = function () { return 'blob:' + (g.location ? g.location.origin : 'null') + '/' + (++blobs); };
    URL.revokeObjectURL = function () {};
    function urlProp(nombre, leer, escribir) {
        Object.defineProperty(URL.prototype, nombre, {get: leer, set: escribir || function () {}, configurable: true, enumerable: true});
    }
    urlProp('href', function () { return urlTexto(this._u); }, function (v) {
        var u = urlAnalizar(v, null);
        if (!u) throw new TypeError("Invalid URL: " + v);
        this._u = u;
        if (this._params) this._params._leer(u.search);
    });
    urlProp('protocol', function () { return this._u.protocol; }, function (v) {
        var p = String(v).replace(/:.*$/, '').toLowerCase() + ':';
        if (/^[a-z][a-z0-9+.\-]*:$/.test(p) && ((p in URL_ESPECIALES) == (this._u.protocol in URL_ESPECIALES))) {
            this._u.protocol = p;
            if (URL_ESPECIALES[p] === this._u.port) this._u.port = '';
        }
    });
    urlProp('username', function () { return this._u.username; }, function (v) { this._u.username = urlPct(String(v), URL_USUARIO); });
    urlProp('password', function () { return this._u.password; }, function (v) { this._u.password = urlPct(String(v), URL_USUARIO); });
    urlProp('host', function () { return this._u.hostname + (this._u.port ? ':' + this._u.port : ''); }, function (v) {
        var u = urlCopia(this._u);
        if (!this._u.opaca && urlAutoridad(String(v), u)) { u.username = this._u.username; u.password = this._u.password; this._u = u; }
    });
    urlProp('hostname', function () { return this._u.hostname; }, function (v) {
        var u = urlCopia(this._u), puerto = this._u.port;
        if (!this._u.opaca && urlAutoridad(String(v).replace(/:.*$/, ''), u)) { u.port = puerto; u.username = this._u.username; u.password = this._u.password; this._u = u; }
    });
    urlProp('port', function () { return this._u.port; }, function (v) {
        var p = String(v).replace(/\D.*$/, '');
        if (p == '' || +p <= 65535) this._u.port = (p == '' || URL_ESPECIALES[this._u.protocol] === String(+p)) ? '' : String(+p);
    });
    urlProp('pathname', function () { return this._u.pathname; }, function (v) {
        if (this._u.opaca) return;
        var s = String(v);
        this._u.pathname = urlRuta(s.charAt(0) == '/' || s.charAt(0) == '\\' ? s : '/' + s, this._u.protocol in URL_ESPECIALES);
    });
    urlProp('search', function () { return this._u.search == '?' ? '' : this._u.search; }, function (v) {
        var s = String(v).replace(/^\?/, '');
        this._u.search = s == '' ? '' : '?' + urlPct(s, this._u.protocol in URL_ESPECIALES ? URL_CONSULTA_ESP : URL_CONSULTA);
        if (this._params) this._params._leer(this._u.search);
    });
    urlProp('hash', function () { return this._u.hash == '#' ? '' : this._u.hash; }, function (v) {
        var s = String(v).replace(/^#/, '');
        this._u.hash = s == '' ? '' : '#' + urlPct(s, URL_ANCLA);
    });
    urlProp('origin', function () {
        var p = this._u.protocol;
        if (p == 'blob:') { try { return new URL(this._u.pathname).origin; } catch (e) { return 'null'; } }
        return (p in URL_ESPECIALES) && p != 'file:' ? p + '//' + this.host : 'null';
    });
    urlProp('searchParams', function () {
        if (!this._params) { this._params = new URLSearchParams(this._u.search); this._params._url = this; }
        return this._params;
    });
    URL.prototype.toString = URL.prototype.toJSON = function () { return this.href; };

    function urlFormDes(s) {
        s = s.replace(/\+/g, ' ');
        try { return decodeURIComponent(s); }
        catch (e) { return s.replace(/%([0-9a-fA-F]{2})/g, function (x, h) { return String.fromCharCode(parseInt(h, 16)); }); }
    }
    function urlFormCod(s) {
        return urlPct(String(s), /[^A-Za-z0-9*\-._ ]/g).replace(/ /g, '+');
    }
    function URLSearchParams(init) {
        this._lista = [];
        this._url = null;
        if (init === undefined || init === null) return;
        if (typeof init == 'object' && typeof init[Symbol.iterator] == 'function') {
            for (var par of init) {
                var p = Array.from(par);
                if (p.length != 2) throw new TypeError('URLSearchParams: each pair needs 2 items');
                this._lista.push([String(p[0]), String(p[1])]);
            }
        } else if (typeof init == 'object') {
            for (var k of Object.keys(init)) this._lista.push([k, String(init[k])]);
        } else this._leer(String(init));
    }
    var USP = URLSearchParams.prototype;
    USP._leer = function (s) {
        this._lista = [];
        s = String(s).replace(/^\?/, '');
        if (s == '') return;
        s.split('&').forEach(function (t) {
            if (t == '') return;
            var i = t.indexOf('=');
            this._lista.push(i >= 0 ? [urlFormDes(t.slice(0, i)), urlFormDes(t.slice(i + 1))] : [urlFormDes(t), '']);
        }, this);
    };
    USP._cambio = function () {
        if (this._url) { var t = this.toString(); this._url._u.search = t == '' ? '' : '?' + t; }
    };
    USP.append = function (k, v) { this._lista.push([String(k), String(v)]); this._cambio(); };
    USP['delete'] = function (k, v) {
        k = String(k);
        this._lista = this._lista.filter(function (p) { return !(p[0] == k && (v === undefined || p[1] == String(v))); });
        this._cambio();
    };
    USP.get = function (k) { k = String(k); for (var p of this._lista) if (p[0] == k) return p[1]; return null; };
    USP.getAll = function (k) { k = String(k); return this._lista.filter(function (p) { return p[0] == k; }).map(function (p) { return p[1]; }); };
    USP.has = function (k, v) { k = String(k); return this._lista.some(function (p) { return p[0] == k && (v === undefined || p[1] == String(v)); }); };
    USP.set = function (k, v) {
        k = String(k); v = String(v);
        var hecho = false, r = [];
        for (var p of this._lista) {
            if (p[0] != k) r.push(p);
            else if (!hecho) { r.push([k, v]); hecho = true; }
        }
        if (!hecho) r.push([k, v]);
        this._lista = r;
        this._cambio();
    };
    USP.sort = function () {
        this._lista = this._lista.map(function (p, i) { return [p, i]; })
            .sort(function (a, b) { return a[0][0] < b[0][0] ? -1 : a[0][0] > b[0][0] ? 1 : a[1] - b[1]; })
            .map(function (x) { return x[0]; });
        this._cambio();
    };
    USP.toString = function () { return this._lista.map(function (p) { return urlFormCod(p[0]) + '=' + urlFormCod(p[1]); }).join('&'); };
    // sobre la lista viva (si f borra, lo borrado ya no sale: core-js lo comprueba)
    USP.forEach = function (f, esto) { for (var i = 0; i < this._lista.length; i++) f.call(esto, this._lista[i][1], this._lista[i][0], this); };
    USP.entries = USP[Symbol.iterator] = function () { return this._lista.map(function (p) { return [p[0], p[1]]; })[Symbol.iterator](); };
    USP.keys = function () { return this._lista.map(function (p) { return p[0]; })[Symbol.iterator](); };
    USP.values = function () { return this._lista.map(function (p) { return p[1]; })[Symbol.iterator](); };
    Object.defineProperty(USP, 'size', {get: function () { return this._lista.length; }, configurable: true});
    USP[Symbol.toStringTag] = 'URLSearchParams';
    g.URL = g.webkitURL = URL;
    g.URLSearchParams = URLSearchParams;

    // === XMLHttpRequest, fetch, Headers, Request, Response, AbortController, Blob, FormData (tarea 37e2) ===
    // Las peticiones van a dashweb (__dashweb_pedir) y vuelven en __dashweb_respuesta: el texto (sus bytes como
    // UTF-8) y los bytes (ArrayBuffer)
    function Headers(init) {
        this._m = {};
        if (init instanceof Headers) init.forEach(function (v, k) { this.append(k, v); }, this);
        else if (Array.isArray(init)) init.forEach(function (p) { this.append(p[0], p[1]); }, this);
        else if (init && typeof init == 'object') Object.keys(init).forEach(function (k) { this.append(k, init[k]); }, this);
    }
    Headers.prototype.append = function (k, v) {
        k = String(k).toLowerCase(); v = String(v);
        this._m[k] = k in this._m ? this._m[k] + ', ' + v : v;
    };
    Headers.prototype.set = function (k, v) { this._m[String(k).toLowerCase()] = String(v); };
    Headers.prototype.get = function (k) { k = String(k).toLowerCase(); return k in this._m ? this._m[k] : null; };
    Headers.prototype.has = function (k) { return String(k).toLowerCase() in this._m; };
    Headers.prototype['delete'] = function (k) { delete this._m[String(k).toLowerCase()]; };
    Headers.prototype.forEach = function (f, t) { Object.keys(this._m).sort().forEach(function (k) { f.call(t, this._m[k], k, this); }, this); };
    Headers.prototype.entries = Headers.prototype[Symbol.iterator] = function () {
        var m = this._m; return Object.keys(m).sort().map(function (k) { return [k, m[k]]; })[Symbol.iterator]();
    };
    Headers.prototype.keys = function () { return Object.keys(this._m).sort()[Symbol.iterator](); };
    Headers.prototype.values = function () { var m = this._m; return Object.keys(m).sort().map(function (k) { return m[k]; })[Symbol.iterator](); };

    function AbortSignal() { this.aborted = false; this.reason = undefined; this.onabort = null; }
    AbortSignal.prototype.addEventListener = function (t, f, o) { escuchar(this, t, f, o); };
    AbortSignal.prototype.removeEventListener = function (t, f, o) { olvidar(this, t, f, o); };
    AbortSignal.prototype.dispatchEvent = function (e) { return despachar(this, e); };
    AbortSignal.prototype.throwIfAborted = function () { if (this.aborted) throw this.reason; };
    function errorAbortar(r) {
        if (r !== undefined) return r;
        var e = new Error('signal is aborted without reason'); e.name = 'AbortError'; return e;
    }
    AbortSignal.abort = function (r) { var s = new AbortSignal(); s.aborted = true; s.reason = errorAbortar(r); return s; };
    AbortSignal.timeout = function (ms) {
        var c = new AbortController();
        g.setTimeout(function () { var e = new Error('signal timed out'); e.name = 'TimeoutError'; c.abort(e); }, ms);
        return c.signal;
    };
    AbortSignal.any = function (lista) {
        var c = new AbortController();
        lista.forEach(function (s) { if (s.aborted) c.abort(s.reason); else s.addEventListener('abort', function () { c.abort(s.reason); }); });
        return c.signal;
    };
    function AbortController() { this.signal = new AbortSignal(); }
    AbortController.prototype.abort = function (r) {
        var s = this.signal;
        if (s.aborted) return;
        s.aborted = true;
        s.reason = errorAbortar(r);
        despachar(s, new Ev('abort'));
    };

    function Blob(partes, o) {
        var trozos = [];
        (partes || []).forEach(function (p) {
            if (p instanceof Blob) trozos.push(p._b);
            else if (p instanceof ArrayBuffer) trozos.push(new Uint8Array(p));
            else if (ArrayBuffer.isView(p)) trozos.push(new Uint8Array(p.buffer, p.byteOffset, p.byteLength));
            else trozos.push(new TextEncoder().encode(String(p)));
        });
        var n = trozos.reduce(function (s, t) { return s + t.length; }, 0), b = new Uint8Array(n), i = 0;
        trozos.forEach(function (t) { b.set(t, i); i += t.length; });
        this._b = b;
        this.size = n;
        this.type = o && o.type ? String(o.type).toLowerCase() : '';
    }
    Blob.prototype.arrayBuffer = function () { return Promise.resolve(this._b.slice().buffer); };
    Blob.prototype.bytes = function () { return Promise.resolve(this._b.slice()); };
    Blob.prototype.text = function () { return Promise.resolve(new TextDecoder().decode(this._b)); };
    Blob.prototype.slice = function (a, z, t) { var r = new Blob([], {type: t}); r._b = this._b.slice(a, z); r.size = r._b.length; return r; };
    function File(partes, nombre, o) { Blob.call(this, partes, o); this.name = String(nombre); this.lastModified = Date.now(); }
    File.prototype = Object.create(Blob.prototype);

    function FormData(form) {
        this._l = [];
        if (form && form.elements) [].forEach.call(form.elements, function (e) {
            if (!e.name || e.disabled) return;
            if ((e.type == 'checkbox' || e.type == 'radio') && !e.checked) return;
            this._l.push([e.name, String(e.value)]);
        }, this);
    }
    FormData.prototype.append = function (k, v) { this._l.push([String(k), v instanceof Blob ? v : String(v)]); };
    FormData.prototype.set = function (k, v) { this['delete'](k); this.append(k, v); };
    FormData.prototype.get = function (k) { for (var p of this._l) if (p[0] == k) return p[1]; return null; };
    FormData.prototype.getAll = function (k) { return this._l.filter(function (p) { return p[0] == k; }).map(function (p) { return p[1]; }); };
    FormData.prototype.has = function (k) { return this._l.some(function (p) { return p[0] == k; }); };
    FormData.prototype['delete'] = function (k) { this._l = this._l.filter(function (p) { return p[0] != k; }); };
    FormData.prototype.forEach = function (f, t) { this._l.forEach(function (p) { f.call(t, p[1], p[0], this); }, this); };
    FormData.prototype.entries = FormData.prototype[Symbol.iterator] = function () { return this._l.map(function (p) { return [p[0], p[1]]; })[Symbol.iterator](); };
    FormData.prototype.keys = function () { return this._l.map(function (p) { return p[0]; })[Symbol.iterator](); };
    FormData.prototype.values = function () { return this._l.map(function (p) { return p[1]; })[Symbol.iterator](); };

    // El cuerpo de una petición como texto, y su Content-Type si lo pide (URLSearchParams, FormData, Blob)
    function cuerpoDe(b) {
        if (b === undefined || b === null) return {texto: '', tipo: ''};
        if (typeof b == 'string') return {texto: b, tipo: 'text/plain;charset=UTF-8'};
        if (b instanceof URLSearchParams) return {texto: b.toString(), tipo: 'application/x-www-form-urlencoded;charset=UTF-8'};
        if (b instanceof FormData) {
            var p = new URLSearchParams();
            b.forEach(function (v, k) { p.append(k, v instanceof Blob ? '' : v); });
            return {texto: p.toString(), tipo: 'application/x-www-form-urlencoded;charset=UTF-8'};
        }
        if (b instanceof Blob) return {texto: new TextDecoder().decode(b._b), tipo: b.type};
        if (b instanceof ArrayBuffer || ArrayBuffer.isView(b)) {
            var u = b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
            return {texto: new TextDecoder().decode(u), tipo: ''};
        }
        return {texto: String(b), tipo: 'text/plain;charset=UTF-8'};
    }

    var peticiones = {}, sigPeticion = 1;
    function XMLHttpRequest() {
        this.readyState = 0; this.status = 0; this.statusText = ''; this.responseText = ''; this.response = '';
        this.responseType = ''; this.responseURL = ''; this.responseXML = null; this.timeout = 0; this.withCredentials = false;
        this._cab = []; this._resp = {}; this._id = 0;
        this.upload = {addEventListener: function () {}, removeEventListener: function () {}};
    }
    ['UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'].forEach(function (k, i) { XMLHttpRequest[k] = XMLHttpRequest.prototype[k] = i; });
    var XP = XMLHttpRequest.prototype;
    XP.addEventListener = function (t, f, o) { escuchar(this, t, f, o); };
    XP.removeEventListener = function (t, f, o) { olvidar(this, t, f, o); };
    XP.dispatchEvent = function (e) { return despachar(this, e); };
    XP._ev = function (t) { despachar(this, new g.ProgressEvent(t)); };
    XP.open = function (m, u) {
        this._m = String(m).toUpperCase();
        this._u = new URL(String(u), String(document.baseURI || location.href)).href;
        this._cab = [];
        this.readyState = 1;
        this._ev('readystatechange');
    };
    XP.setRequestHeader = function (k, v) { this._cab.push(String(k) + ': ' + String(v)); };
    XP.overrideMimeType = function () {};
    XP.send = function (b) {
        var c = cuerpoDe(this._m == 'GET' || this._m == 'HEAD' ? null : b), id = sigPeticion++;
        if (c.tipo && !this._cab.some(function (h) { return /^content-type:/i.test(h); })) this._cab.push('Content-Type: ' + c.tipo);
        this._id = id;
        peticiones[id] = this;
        this._ev('loadstart');
        __dashweb_pedir(id, this._m, this._u, this._cab.join('\n'), c.texto);
    };
    XP.abort = function () {
        if (!peticiones[this._id]) return;
        delete peticiones[this._id];
        this.readyState = 4; this.status = 0;
        this._ev('readystatechange'); this._ev('abort'); this._ev('loadend');
        this.readyState = 0;
    };
    XP.getResponseHeader = function (k) { k = String(k).toLowerCase(); return k in this._resp ? this._resp[k] : null; };
    XP.getAllResponseHeaders = function () {
        var r = this._resp; return Object.keys(r).map(function (k) { return k + ': ' + r[k] + '\r\n'; }).join('');
    };
    g.__dashweb_respuesta = function (id, estado, razon, cab, url, texto, bytes, error) {
        var x = peticiones[id];
        delete peticiones[id];
        if (!x) return;
        x._texto = texto; x._bytes = bytes;
        if (error) {
            x.readyState = 4; x.status = 0;
            x._ev('readystatechange'); x._ev('error'); x._ev('loadend');
            return;
        }
        x._resp = {};
        String(cab).split('\r\n').forEach(function (l) {
            var p = l.indexOf(':');
            if (p > 0) x._resp[l.slice(0, p).trim().toLowerCase()] = l.slice(p + 1).trim();
        });
        x.status = estado; x.statusText = razon; x.responseURL = url;
        x.readyState = 2; x._ev('readystatechange');
        x.readyState = 3; x._ev('readystatechange'); x._ev('progress');
        x.responseText = texto;
        var t = x.responseType;
        if (t == 'json') { try { x.response = JSON.parse(texto); } catch (e) { x.response = null; } }
        else if (t == 'arraybuffer') x.response = bytes;
        else if (t == 'blob') x.response = new Blob([bytes], {type: x._resp['content-type'] || ''});
        else x.response = texto;
        x.readyState = 4;
        x._ev('readystatechange'); x._ev('load'); x._ev('loadend');
    };

    function Response(cuerpo, o) {
        o = o || {};
        this.status = o.status === undefined ? 200 : o.status;
        this.statusText = o.statusText || '';
        this.ok = this.status >= 200 && this.status < 300;
        this.headers = new Headers(o.headers);
        this.url = o.url || '';
        this.redirected = false;
        this.type = 'basic';
        this.bodyUsed = false;
        if (cuerpo === undefined || cuerpo === null) { this._texto = ''; this._bytes = new ArrayBuffer(0); }
        else if (cuerpo instanceof ArrayBuffer) { this._bytes = cuerpo; this._texto = null; }
        else { var c = cuerpoDe(cuerpo); this._texto = c.texto; this._bytes = null; if (c.tipo && !this.headers.has('content-type')) this.headers.set('content-type', c.tipo); }
    }
    var RP = Response.prototype;
    RP._t = function () { this.bodyUsed = true; return this._texto !== null ? this._texto : new TextDecoder().decode(new Uint8Array(this._bytes)); };
    RP._b = function () { this.bodyUsed = true; return this._bytes !== null ? this._bytes : new TextEncoder().encode(this._texto).buffer; };
    RP.text = function () { return Promise.resolve(this._t()); };
    RP.json = function () { var t = this._t(); return new Promise(function (ok) { ok(JSON.parse(t)); }); };
    RP.arrayBuffer = function () { return Promise.resolve(this._b()); };
    RP.bytes = function () { return Promise.resolve(new Uint8Array(this._b())); };
    RP.blob = function () { return Promise.resolve(new Blob([this._b()], {type: this.headers.get('content-type') || ''})); };
    RP.formData = function () { var f = new FormData(); new URLSearchParams(this._t()).forEach(function (v, k) { f.append(k, v); }); return Promise.resolve(f); };
    RP.clone = function () { var r = Object.create(RP); for (var k in this) if (this.hasOwnProperty(k)) r[k] = this[k]; r.headers = new Headers(this.headers); return r; };
    // body: un ReadableStream con todo de una vez (el cliente de React lee así lo que le da el servidor)
    Object.defineProperty(RP, 'body', {get: function () {
        if (this._cuerpo) return this._cuerpo;
        var b = new Uint8Array(this._bytes !== null ? this._bytes : new TextEncoder().encode(this._texto).buffer);
        this._cuerpo = new ReadableStream({start: function (c) { if (b.length) c.enqueue(b); c.close(); }});
        return this._cuerpo;
    }, configurable: true});
    Response.error = function () { var r = new Response(null, {status: 0}); r.type = 'error'; return r; };
    Response.json = function (d, o) { o = o || {}; var h = new Headers(o.headers); h.set('content-type', 'application/json'); o.headers = h; return new Response(JSON.stringify(d), o); };
    Response.redirect = function (u, s) { return new Response(null, {status: s || 302, headers: {location: String(u)}}); };

    function Request(entrada, o) {
        o = o || {};
        var base = entrada instanceof Request ? entrada : null;
        this.url = base ? base.url : new URL(String(entrada), String(document.baseURI || location.href)).href;
        this.method = String(o.method || (base && base.method) || 'GET').toUpperCase();
        this.headers = new Headers(o.headers || (base && base.headers));
        this.body = o.body !== undefined ? o.body : base ? base.body : null;
        this.signal = o.signal || (base && base.signal) || new AbortSignal();
        this.credentials = o.credentials || 'same-origin';
        this.mode = o.mode || 'cors';
        this.cache = o.cache || 'default';
        this.redirect = o.redirect || 'follow';
        this.referrer = 'about:client';
        this.priority = o.priority || 'auto';
    }
    Request.prototype.clone = function () { return new Request(this); };
    Request.prototype.text = function () { return Promise.resolve(cuerpoDe(this.body).texto); };
    Request.prototype.json = function () { return this.text().then(JSON.parse); };

    g.fetch = function (entrada, o) {
        var q = new Request(entrada, o);
        return new Promise(function (ok, mal) {
            if (q.signal.aborted) { mal(q.signal.reason); return; }
            var x = new XMLHttpRequest();
            x.open(q.method, q.url);
            q.headers.forEach(function (v, k) { x.setRequestHeader(k, v); });
            x.onload = function () {
                var r = new Response(x._bytes, {status: x.status, statusText: x.statusText, headers: x._resp, url: x.responseURL});
                r._texto = x._texto;
                r.redirected = x.responseURL != q.url;
                ok(r);
            };
            x.onerror = function () { mal(new TypeError('Failed to fetch')); };
            q.signal.addEventListener('abort', function () { x.abort(); mal(q.signal.reason); });
            x.send(q.body);
        });
    };
    g.XMLHttpRequest = XMLHttpRequest;
    g.Headers = Headers;
    g.Request = Request;
    g.Response = Response;
    g.AbortController = AbortController;
    g.AbortSignal = AbortSignal;
    g.Blob = Blob;
    g.File = File;
    g.FormData = FormData;

    // location: la dirección de la página (lib/jsdom.dash la pone con __dashweb_lugar antes de los scripts)
    var lugar = {}, href = 'about:blank';
    g.__dashweb_lugar = function (u) {
        var m = /^([a-z][a-z0-9+.-]*:)\/\/([^\/?#:]*)(?::(\d+))?([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(u) || [];
        lugar.protocol = m[1] || 'about:';
        lugar.hostname = m[2] || '';
        lugar.port = m[3] || '';
        lugar.host = lugar.hostname + (lugar.port ? ':' + lugar.port : '');
        lugar.pathname = m[4] || '/';
        lugar.search = m[5] && m[5].length > 1 ? m[5] : '';
        lugar.hash = m[6] && m[6].length > 1 ? m[6] : '';
        lugar.origin = lugar.protocol + '//' + lugar.host;
        href = u;
        ['URL', 'documentURI', 'baseURI'].forEach(function (k) { pon(document, k, u); });
        pon(document, 'domain', lugar.hostname);
    };
    // ir a otra página (tarea 51): dashweb la abre en el siguiente tic; replace la pone en lugar de esta en el historial
    function ir(u, sustituir) {
        try { u = new URL(String(u), href).href; } catch (e) { u = String(u); }
        g.__dashweb_navegar(u, !!sustituir);
    }
    Object.defineProperty(lugar, 'href', {get: function () { return href; }, set: function (u) { ir(u, false); }, enumerable: true, configurable: true});
    lugar.toString = function () { return href; };
    lugar.assign = function (u) { ir(u, false); };
    lugar.replace = function (u) { ir(u, true); };
    lugar.reload = function () { ir(href, true); };
    Object.defineProperty(g, 'location', {get: function () { return lugar; }, set: function (u) { ir(u, false); }, enumerable: true, configurable: true});
    Object.defineProperty(document, 'location', {get: function () { return lugar; }, set: function (u) { ir(u, false); }, enumerable: true, configurable: true});

    // Lo de SVG que piden las librerías (tarea 37h2: el CSSPlugin de GSAP llama a getCTM() de lo que anima dentro
    // de un <svg>): ownerSVGElement, getBBox (de los atributos o de su caja), getCTM/getScreenCTM, transform.baseVal
    // vacío, getTotalLength (los tramos entre los puntos de d). Aproximado: no hay geometría de SVG en dashweb.
    function Matriz(a, b, c, d, e, f) {
        this.a = a === undefined ? 1 : a; this.b = b || 0; this.c = c || 0;
        this.d = d === undefined ? 1 : d; this.e = e || 0; this.f = f || 0;
    }
    Matriz.prototype.multiply = function (m) {
        return new Matriz(this.a * m.a + this.c * m.b, this.b * m.a + this.d * m.b, this.a * m.c + this.c * m.d,
            this.b * m.c + this.d * m.d, this.a * m.e + this.c * m.f + this.e, this.b * m.e + this.d * m.f + this.f);
    };
    Matriz.prototype.inverse = function () {
        var k = this.a * this.d - this.b * this.c || 1;
        return new Matriz(this.d / k, -this.b / k, -this.c / k, this.a / k, (this.c * this.f - this.d * this.e) / k,
            (this.b * this.e - this.a * this.f) / k);
    };
    Matriz.prototype.translate = function (x, y) { return this.multiply(new Matriz(1, 0, 0, 1, x || 0, y || 0)); };
    Matriz.prototype.scale = function (k) { return this.multiply(new Matriz(k, 0, 0, k, 0, 0)); };
    if (!g.DOMMatrix) g.DOMMatrix = g.SVGMatrix = Matriz;
    function numeros(v) { return (String(v || '').match(/-?[0-9.]+(e-?[0-9]+)?/gi) || []).map(Number); }
    def('ownerSVGElement', function () {
        for (var p = this.parentNode; p && p.nodeType == 1; p = p.parentNode) if (p.localName == 'svg') return p;
        return null;
    });
    N.getBBox = function () {
        var n = this.localName, a = function (k) { return parseFloat(this.getAttribute(k)) || 0; }.bind(this);
        if (n == 'rect' || n == 'image' || n == 'use') return new g.DOMRect(a('x'), a('y'), a('width'), a('height'));
        if (n == 'circle') return new g.DOMRect(a('cx') - a('r'), a('cy') - a('r'), 2 * a('r'), 2 * a('r'));
        if (n == 'ellipse') return new g.DOMRect(a('cx') - a('rx'), a('cy') - a('ry'), 2 * a('rx'), 2 * a('ry'));
        if (n == 'line') return new g.DOMRect(Math.min(a('x1'), a('x2')), Math.min(a('y1'), a('y2')), Math.abs(a('x2') - a('x1')), Math.abs(a('y2') - a('y1')));
        if (n == 'path' || n == 'polygon' || n == 'polyline') {
            var v = numeros(n == 'path' ? this.getAttribute('d') : this.getAttribute('points')), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
            for (var i = 0; i + 1 < v.length; i += 2) { x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]); }
            if (x1 >= x0) return new g.DOMRect(x0, y0, x1 - x0, y1 - y0);
        }
        var r = this.getBoundingClientRect();
        return new g.DOMRect(0, 0, r.width, r.height);
    };
    N.getCTM = function () { return new Matriz(); };
    N.getScreenCTM = function () {
        var s = this.localName == 'svg' ? this : this.ownerSVGElement, r = s ? s.getBoundingClientRect() : {left: 0, top: 0};
        return new Matriz(1, 0, 0, 1, r.left, r.top);
    };
    N.createSVGMatrix = function () { return new Matriz(); };
    N.createSVGPoint = function () {
        return {x: 0, y: 0, matrixTransform: function (m) { return {x: m.a * this.x + m.c * this.y + m.e, y: m.b * this.x + m.d * this.y + m.f}; }};
    };
    N.getTotalLength = function () {
        var v = numeros(this.getAttribute('d') || this.getAttribute('points')), t = 0;
        for (var i = 2; i + 1 < v.length; i += 2) t += Math.sqrt(Math.pow(v[i] - v[i - 2], 2) + Math.pow(v[i + 1] - v[i - 1], 2));
        return t;
    };
    // transform.baseVal: las funciones del atributo transform (matrix, translate, scale, rotate) como matrices
    function transformaciones(v) {
        var r = [], re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g, m;
        while ((m = re.exec(String(v || '')))) {
            var a = numeros(m[2]), t;
            if (m[1] == 'matrix') t = new Matriz(a[0], a[1], a[2], a[3], a[4], a[5]);
            else if (m[1] == 'translate') t = new Matriz(1, 0, 0, 1, a[0] || 0, a[1] || 0);
            else if (m[1] == 'scale') t = new Matriz(a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0);
            else if (m[1] == 'rotate') {
                var g0 = (a[0] || 0) * Math.PI / 180, co = Math.cos(g0), si = Math.sin(g0);
                t = new Matriz(co, si, -si, co, 0, 0);
                if (a.length > 2) t = new Matriz(1, 0, 0, 1, a[1], a[2]).multiply(t).multiply(new Matriz(1, 0, 0, 1, -a[1], -a[2]));
            } else t = new Matriz();
            r.push({matrix: t, type: 1});
        }
        return r;
    }
    def('transform', function () {
        if (!this.ownerSVGElement && this.localName != 'svg') return undefined;
        var lista = transformaciones(this.getAttribute('transform'));
        return {baseVal: {numberOfItems: lista.length, getItem: function (i) { return lista[i]; },
            consolidate: function () {
                if (!lista.length) return null;
                var m = new Matriz();
                lista.forEach(function (x) { m = m.multiply(x.matrix); });
                return {matrix: m, type: 1};
            }}};
    }, function () {});

    // crypto (tarea 37h2: la huella SHA-256 del informe de pre.opentimetrack.com): getRandomValues, randomUUID y
    // subtle.digest con SHA-256 y SHA-1, en JavaScript (sin un generador de verdad: no vale para claves)
    function bytesDe(d) {
        if (d instanceof ArrayBuffer) return new Uint8Array(d);
        if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
        throw new TypeError('crypto: se esperaba un ArrayBuffer o una vista');
    }
    function sha(b, de256) {
        var n = b.length, bits = n * 8, total = ((n + 9 + 63) >> 6) << 6, m = new Uint8Array(total), i, j;
        m.set(b); m[n] = 0x80;
        for (i = 0; i < 4; i++) m[total - 1 - i] = (bits >>> (8 * i)) & 255;
        if (bits > 0xFFFFFFFF) m[total - 5] = Math.floor(bits / 0x100000000) & 255;
        var w = new Array(80), r = function (x, k) { return (x >>> k) | (x << (32 - k)); };
        var h = de256 ? [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
                      : [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
        var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1,
            0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d,
            0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
            0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
            0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3,
            0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb,
            0xbef9a3f7, 0xc67178f2];
        for (var o = 0; o < total; o += 64) {
            for (i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
            var a = h[0], bb = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g2 = h[6], hh = h[7], t1, t2;
            if (de256) {
                for (i = 16; i < 64; i++) {
                    var s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
                }
                for (i = 0; i < 64; i++) {
                    t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g2)) + K[i] + w[i]) | 0;
                    t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
                    hh = g2; g2 = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
                }
                h[5] = (h[5] + f) | 0; h[6] = (h[6] + g2) | 0; h[7] = (h[7] + hh) | 0;
            } else {
                for (i = 16; i < 80; i++) { j = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]; w[i] = (j << 1) | (j >>> 31); }
                for (i = 0; i < 80; i++) {
                    var fk = i < 20 ? ((bb & c) | (~bb & d)) + 0x5A827999 : i < 40 ? (bb ^ c ^ d) + 0x6ED9EBA1 :
                             i < 60 ? ((bb & c) | (bb & d) | (c & d)) + 0x8F1BBCDC : (bb ^ c ^ d) + 0xCA62C1D6;
                    t1 = (((a << 5) | (a >>> 27)) + fk + e + w[i]) | 0;
                    e = d; d = c; c = (bb << 30) | (bb >>> 2); bb = a; a = t1;
                }
            }
            h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0;
        }
        var out = new Uint8Array(h.length * 4);
        for (i = 0; i < h.length; i++) for (j = 0; j < 4; j++) out[i * 4 + j] = (h[i] >>> (24 - 8 * j)) & 255;
        return out.buffer;
    }
    if (!g.crypto) {
        g.crypto = {
            getRandomValues: function (v) {
                var b = bytesDe(v);
                for (var i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
                return v;
            },
            randomUUID: function () {
                var b = new Uint8Array(16), i, s = '';
                g.crypto.getRandomValues(b);
                b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
                for (i = 0; i < 16; i++) s += (i == 4 || i == 6 || i == 8 || i == 10 ? '-' : '') + (b[i] + 256).toString(16).slice(1);
                return s;
            },
            subtle: {
                digest: function (alg, datos) {
                    var n = String(alg && alg.name || alg).toUpperCase().replace('-', '');
                    return new Promise(function (bien, mal) {
                        try {
                            if (n == 'SHA256') bien(sha(bytesDe(datos), true));
                            else if (n == 'SHA1') bien(sha(bytesDe(datos), false));
                            else mal(new Error('crypto.subtle.digest: ' + alg + ' no está'));
                        } catch (e) { mal(e); }
                    });
                }
            }
        };
        g.Crypto = function () {};
    }

    // Los <script> que mete el JavaScript después de cargar (tarea 37h: Next.js y Turbopack cargan así los trozos de
    // un componente al llegar a él): en línea, se ejecutan al entrar; con src, se bajan (XMLHttpRequest), se ejecutan
    // y lanzan load (o error). Mientras, document.currentScript es él (Turbopack apunta con él cada trozo).
    var scriptActual = null;
    (function () {
        var o = document, d = null;
        while (o && !d) { d = Object.getOwnPropertyDescriptor(o, 'currentScript'); o = Object.getPrototypeOf(o); }
        var nativo = d && d.get;
        Object.defineProperty(document, 'currentScript', {configurable: true, get: function () {
            return scriptActual || (nativo ? nativo.call(document) : null);
        }});
    })();
    // document.title = ... (Next.js lo pone al cambiar de página): el <title> de <head>, creado si no hay
    (function () {
        var d = Object.getOwnPropertyDescriptor(document, 'title');
        var leer = d && d.get;
        Object.defineProperty(document, 'title', {configurable: true,
            get: function () { return leer ? leer.call(document) : ''; },
            set: function (v) {
                var t = document.querySelector('title');
                if (!t) { t = document.createElement('title'); (document.head || document.documentElement).appendChild(t); }
                t.textContent = String(v);
            }});
    })();
    function esScriptJS(s) {
        var t = (s.getAttribute('type') || '').toLowerCase().trim();
        return t == '' || t == 'text/javascript' || t == 'application/javascript' || t == 'text/ecmascript' ||
            t == 'application/ecmascript' || t == 'module' && false;
    }
    function correr(s, codigo) {
        var antes = scriptActual;
        scriptActual = s;
        try { (0, eval)(codigo); } catch (e) { console.log('JS (script añadido): ' + (e && e.stack || e)); }
        scriptActual = antes;
    }
    function ejecutarScript(s) {
        if (s.__dashweb_hecho || !s.isConnected || !esScriptJS(s)) return;
        Object.defineProperty(s, '__dashweb_hecho', {value: true});
        var src = s.getAttribute('src');
        if (!src) { if (s.textContent) correr(s, s.textContent); return; }
        var x = new g.XMLHttpRequest();
        x.open('GET', s.src);
        x.onload = function () {
            if (x.status >= 200 && x.status < 300) {
                correr(s, x.responseText);
                despachar(s, new Ev('load'));
            } else despachar(s, new Ev('error'));
        };
        x.onerror = function () { despachar(s, new Ev('error')); };
        x.send();
    }
    function scriptsDe(n) {
        if (!n || n.nodeType != 1) return [];
        if (n.tagName == 'SCRIPT') return [n];
        return Array.prototype.slice.call(n.getElementsByTagName('script'));
    }
    ['appendChild', 'insertBefore', 'replaceChild'].forEach(function (k) {
        var orig = N[k];
        if (typeof orig != 'function') return;
        N[k] = function (nuevo) {
            // (de un fragmento salen sus hijos: se miran antes)
            var lista = nuevo && nuevo.nodeType == 11 ? Array.prototype.slice.call(nuevo.childNodes) : [nuevo];
            var r = orig.apply(this, arguments);
            lista.forEach(function (n) { scriptsDe(n).forEach(ejecutarScript); });
            return r;
        };
    });

    // Al acabar los scripts: DOMContentLoaded y load (como un navegador)
    g.__dashweb_cargado = function () {
        // (los <script> de la página ya los ejecutó dashweb: si el JavaScript los mueve, no otra vez)
        Array.prototype.forEach.call(document.getElementsByTagName('script'), function (s) {
            if (!s.__dashweb_hecho) Object.defineProperty(s, '__dashweb_hecho', {value: true});
        });
        pon(document, 'readyState', 'interactive');
        despachar(document, new Ev('readystatechange'));
        despachar(document, new Ev('DOMContentLoaded', {bubbles: true}));
        pon(document, 'activeElement', document.body);
        // load, después de lo que DOMContentLoaded haya dejado para luego (el ready de jQuery)
        g.setTimeout(function () {
            pon(document, 'readyState', 'complete');
            despachar(document, new Ev('readystatechange'));
            // (el atributo onload de <body> es el de window: <body onload="boom()"> de Web Platform Tests; tarea 41b)
            var b = document.body;
            if (typeof g.onload != 'function' && b && b.hasAttribute && b.hasAttribute('onload')) {
                try { g.onload = new Function('event', b.getAttribute('onload')); } catch (e) { console.log('JS: ' + e); }
            }
            despachar(g, new Ev('load'));
        }, 0);
    };
    // El documento con su prototipo, como en un navegador (createElement y los demás eran propiedades suyas y tapaban
    // lo que un polyfill pone en Document.prototype: el de componentes web de YouTube parchea ahí createElement para
    // dar los elementos propios ya mejorados, y sin eso iron-overlay-backdrop no tenía prepare(); tarea 38)
    (function () {
        var P = Object.create(N);
        Object.getOwnPropertyNames(document).forEach(function (k) {
            var d = Object.getOwnPropertyDescriptor(document, k);
            if (!d.configurable) return;
            Object.defineProperty(P, k, d);
            delete document[k];
        });
        Object.setPrototypeOf(document, P);
        g.Document.prototype = P;
        g.HTMLDocument.prototype = P;
    })();
})(globalThis);
