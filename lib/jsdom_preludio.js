// El entorno de navegador para el JavaScript de las páginas, encima de lo que pone lib/jsdom.dash
// en C (los nodos). tools/preludio.py lo convierte en lib/jsdom_preludio.dash. Lo que hace falta
// para jQuery 3 y las páginas de hoy: eventos (con window), temporizadores, style, classList,
// dataset, getComputedStyle, navigator, location, history, almacenamiento, matchMedia...
(function (g) {
    'use strict';
    var N = Object.getPrototypeOf(document);
    // Un prototipo por etiqueta, encima del de todos los nodos (tarea 38c5): lo que es solo de unas etiquetas (text de
    // <a> y <option>, href, src, name...) va en el suyo y no en todos, como en un navegador. El polymer-resin de
    // YouTube mira si una propiedad es nativa con `'text' in document.createElement('x-y')`: aquí todo elemento
    // tenía text y cambiaba el texto de cada yt-formatted-string por "zClosurez". lib/jsdom.dash pone el de su
    // etiqueta a cada elemento que pasa al JavaScript (__dashweb_protos).
    var PT = Object.create(null);
    function proto(t) { return PT[t] || (PT[t] = Object.create(N)); }
    Object.defineProperty(g, '__dashweb_protos', {value: PT});
    // data es de los nodos de texto y comentario (CharacterData), no de los elementos: el ytd-button-renderer de
    // YouTube recibía su data como "zClosurez" y sus botones salían sin texto
    (function () {
        var datos = Object.getOwnPropertyDescriptor(N, 'data');
        if (!datos) return;
        delete N.data;
        // (y length, el largo de data: CharacterData; no había, y Range-mutations y el código que mide un texto
        // recibían undefined)
        var largo = {get: function () { return this.data.length; }, configurable: true, enumerable: true};
        Object.defineProperty(proto('#text'), 'data', datos);
        Object.defineProperty(proto('#comment'), 'data', datos);
        Object.defineProperty(proto('#text'), 'length', largo);
        Object.defineProperty(proto('#comment'), 'length', largo);
    })();

    // === Constructores (para instanceof) y constantes ===
    function Nodo() { throw new TypeError('Illegal constructor'); }
    Nodo.prototype = N;
    // Cada interfaz con su nombre y su instanceof: todas comparten el prototipo de los nodos (lo que una web añade a
    // HTMLElement.prototype llega a todos), pero `x instanceof HTMLIFrameElement` mira el tipo y la etiqueta (antes
    // todas eran Nodo y todo elemento era un iframe: React no salía de un bucle; tarea 37a3)
    function esNodo(o) { return o !== null && typeof o == 'object' && N.isPrototypeOf(o); }
    function esSvg(o) { return o.localName == 'svg' || !!(o.parentNode && o.closest('svg')); }
    function interfaz(nombre, prueba) {
        // (HTMLElement como base de una clase de customElements: __construir, más abajo)
        var F = function () {
            if (new.target && F.__construir) return F.__construir(new.target, arguments);
            throw new TypeError('Illegal constructor');
        };
        F.prototype = N;
        Object.defineProperty(F, 'name', {value: nombre});
        // (las clases que heredan de una interfaz heredan también esto: para ellas, el instanceof de siempre)
        Object.defineProperty(F, Symbol.hasInstance, {value: function (o) {
            return this === F ? esNodo(o) && prueba(o) : Function.prototype[Symbol.hasInstance].call(this, o);
        }});
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
    interfaz('CharacterData', function (o) { return o.nodeType == 3 || o.nodeType == 4 || o.nodeType == 7 || o.nodeType == 8; });
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
        var una = ETIQUETAS[k].split(' ');
        if (una.length == 1) {
            var F = g['HTML' + k + 'Element'];
            F.prototype = proto(una[0]);
            Object.defineProperty(F.prototype, 'constructor', {value: F, writable: true, configurable: true});
        }
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
    // (con las de nodos que ya no hay, que DOM sigue dando: ENTITY_REFERENCE_NODE, ENTITY_NODE y NOTATION_NODE)
    var CONST = {ELEMENT_NODE: 1, ATTRIBUTE_NODE: 2, TEXT_NODE: 3, CDATA_SECTION_NODE: 4, ENTITY_REFERENCE_NODE: 5,
                 ENTITY_NODE: 6, PROCESSING_INSTRUCTION_NODE: 7, COMMENT_NODE: 8,
                 DOCUMENT_NODE: 9, DOCUMENT_TYPE_NODE: 10, DOCUMENT_FRAGMENT_NODE: 11, NOTATION_NODE: 12,
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
        // (solo lo que trae o: recorrer las 29 claves con forEach costaba casi tanto como despachar; tarea 61)
        for (var k in o) if (EV_COPIA[k] === 1 && o[k] !== undefined) this[k] = o[k];
    }
    var EV_COPIA = Object.create(null);
    ['key', 'code', 'keyCode', 'which', 'button', 'buttons', 'clientX', 'clientY', 'pageX', 'pageY',
     'screenX', 'screenY', 'altKey', 'ctrlKey', 'shiftKey', 'metaKey', 'relatedTarget', 'promise', 'reason',
     'pointerType', 'pointerId', 'isPrimary', 'movementX', 'movementY', 'offsetX', 'offsetY',
     'data', 'message', 'error'].forEach(function (k) { EV_COPIA[k] = 1; });
    // (en un oyente pasivo, preventDefault no hace nada; DOM, WPT dom/events)
    Ev.prototype.preventDefault = function () { if (this.cancelable && !this._pasivo) this.defaultPrevented = true; };
    Ev.prototype.stopPropagation = function () { this._parar = true; };
    Ev.prototype.stopImmediatePropagation = function () { this._parar = this._pararYa = true; };
    // (initEvent reinicia el evento, salvo mientras se despacha; el de createEvent queda inicializado)
    Ev.prototype.initEvent = function (t, b, c) {
        if (this._despachando) return;
        this.type = String(t); this.bubbles = !!b; this.cancelable = !!c;
        this.defaultPrevented = false; this._parar = this._pararYa = false; this._inicializado = true;
        this.target = this.currentTarget = this.srcElement = null;
    };
    Object.defineProperty(Ev.prototype, 'returnValue', {configurable: true,
        get: function () { return !this.defaultPrevented; },
        set: function (v) { if (!v) this.preventDefault(); }});
    Object.defineProperty(Ev.prototype, 'cancelBubble', {configurable: true,
        get: function () { return !!this._parar; },
        set: function (v) { if (v) this._parar = true; }});
    Ev.prototype.composedPath = function () { return this._camino ? this._camino.slice() : []; };
    Ev.NONE = 0; Ev.CAPTURING_PHASE = 1; Ev.AT_TARGET = 2; Ev.BUBBLING_PHASE = 3;
    g.Event = Ev;
    // Las clases de eventos con su herencia (MouseEvent es un UIEvent) y los campos de su diccionario, con sus valores
    // por omisión (new MouseEvent('click', {ctrlKey: true}); WPT dom/events)
    var MODS = {ctrlKey: false, shiftKey: false, altKey: false, metaKey: false};
    function mas(a, b) { var r = {}; [a, b].forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
    var CLASES = [
        ['CustomEvent', 'Event', {detail: null}],
        ['UIEvent', 'Event', {view: null, detail: 0, which: 0}],
        ['FocusEvent', 'UIEvent', {relatedTarget: null}],
        ['MouseEvent', 'UIEvent', mas(MODS, {screenX: 0, screenY: 0, clientX: 0, clientY: 0, button: 0, buttons: 0,
            relatedTarget: null, movementX: 0, movementY: 0})],
        ['WheelEvent', 'MouseEvent', {deltaX: 0, deltaY: 0, deltaZ: 0, deltaMode: 0}],
        ['PointerEvent', 'MouseEvent', {pointerId: 0, width: 1, height: 1, pressure: 0, tangentialPressure: 0,
            tiltX: 0, tiltY: 0, twist: 0, pointerType: '', isPrimary: false}],
        ['DragEvent', 'MouseEvent', {dataTransfer: null}],
        ['KeyboardEvent', 'UIEvent', mas(MODS, {key: '', code: '', location: 0, repeat: false, isComposing: false,
            charCode: 0, keyCode: 0})],
        ['InputEvent', 'UIEvent', {data: null, isComposing: false, inputType: '', dataTransfer: null}],
        ['CompositionEvent', 'UIEvent', {data: ''}],
        ['TouchEvent', 'UIEvent', mas(MODS, {touches: [], targetTouches: [], changedTouches: []})],
        ['ErrorEvent', 'Event', {message: '', filename: '', lineno: 0, colno: 0, error: undefined}],
        ['MessageEvent', 'Event', {data: null, origin: '', lastEventId: '', source: null, ports: []}],
        ['PopStateEvent', 'Event', {state: null}],
        ['HashChangeEvent', 'Event', {oldURL: '', newURL: ''}],
        ['PageTransitionEvent', 'Event', {persisted: false}],
        ['ProgressEvent', 'Event', {lengthComputable: false, loaded: 0, total: 0}],
        ['PromiseRejectionEvent', 'Event', {promise: undefined, reason: undefined}],
        ['AnimationEvent', 'Event', {animationName: '', elapsedTime: 0, pseudoElement: ''}],
        ['TransitionEvent', 'Event', {propertyName: '', elapsedTime: 0, pseudoElement: ''}],
        ['StorageEvent', 'Event', {key: null, oldValue: null, newValue: null, url: '', storageArea: null}],
        ['SubmitEvent', 'Event', {submitter: null}],
        ['ClipboardEvent', 'Event', {clipboardData: null}],
        ['BeforeUnloadEvent', 'Event', {}]];
    var CAMPOS_EV = {Event: {}};
    CLASES.forEach(function (q) {
        var nombre = q[0], padre = q[1] == 'Event' ? Ev : g[q[1]];
        CAMPOS_EV[nombre] = mas(CAMPOS_EV[q[1]], q[2]);
        var campos = CAMPOS_EV[nombre];
        var F = function (t, o) {
            if (arguments.length < 1) throw new TypeError("Failed to construct '" + nombre + "': 1 argument required.");
            Ev.call(this, t, o);
            for (var k in campos) this[k] = o && o[k] !== undefined ? o[k] : campos[k];
        };
        Object.defineProperty(F, 'name', {value: nombre});
        F.prototype = Object.create(padre.prototype);
        F.prototype.constructor = F;
        g[nombre] = F;
    });
    // (PromiseRejectionEvent: sin él, core-js da por roto el Promise de QuickJS y pone el suyo, escrito en
    // JavaScript: React en pre.opentimetrack.com tardaba 25 s; tarea 37a3)
    g.CustomEvent.prototype.initCustomEvent = function (t, b, c, d) { this.initEvent(t, b, c); this.detail = d; };

    // (DOM: el oyente es una función o cualquier objeto, y de este se lee handleEvent en cada evento; con signal, se
    // quita al abortarla, y si ya lo está no se pone; signal: null es un TypeError)
    function escuchar(objeto, t, f, o) {
        var senal = null;
        if (o && typeof o == 'object' && 'signal' in o) {
            senal = o.signal;
            // (null u otra cosa que no es un objeto, TypeError; uno de un polyfill, por su evento abort)
            if (!senal || typeof senal != 'object') throw new TypeError("Failed to execute 'addEventListener': member signal is not of type AbortSignal.");
        }
        if (!f || (typeof f != 'function' && typeof f != 'object')) return;
        if (senal && senal.aborted) return;
        var e = objeto.__ev || (Object.defineProperty(objeto, '__ev', {value: {}, writable: true}), objeto.__ev);
        var l = e[t] || (e[t] = []);
        var captura = typeof o == 'boolean' ? o : !!(o && o.capture);
        for (var i = 0; i < l.length; i++) if (l[i].f === f && l[i].captura === captura) return;
        if (senal) {
            var quitar = function () { olvidar(objeto, t, f, captura); };
            if (senal._algos) senal._algos.push(quitar);
            else if (typeof senal.addEventListener == 'function') senal.addEventListener('abort', quitar, {once: true});
        }
        // (pasivo: el que lo dice, y por omisión touchstart, touchmove, wheel y mousewheel en la ventana, el documento,
        // <html> y <body>, como los navegadores)
        var pasivo = o && typeof o == 'object' && o.passive !== undefined ? !!o.passive :
            /^(touchstart|touchmove|wheel|mousewheel)$/.test(t) && (objeto === g || objeto.nodeType == 9 ||
            (objeto.ownerDocument && (objeto === objeto.ownerDocument.documentElement || objeto === objeto.ownerDocument.body)));
        l.push({f: f, captura: captura, una: !!(o && typeof o == 'object' && o.once), pasivo: pasivo});
    }
    function olvidar(objeto, t, f, o) {
        var l = objeto.__ev && objeto.__ev[t];
        var captura = typeof o == 'boolean' ? o : !!(o && o.capture);
        // (quitado: si el despacho en curso ya lo tenía en su copia de la lista, no se llama)
        if (l) for (var i = 0; i < l.length; i++) if (l[i].f === f && l[i].captura === captura) { l[i].quitado = true; l.splice(i, 1); return; }
    }
    // window.event: el evento que se está despachando mientras se llama a un oyente (no si el objeto está en una
    // sombra); undefined fuera (HTML; código viejo lo usa)
    var eventoActual, haySombras = false;
    Object.defineProperty(g, 'event', {get: function () { return eventoActual; }, set: function (v) {
        Object.defineProperty(g, 'event', {value: v, writable: true, configurable: true});
    }, configurable: true});
    function llamar(f, este, ev, actual) {
        var antes = eventoActual;
        eventoActual = actual;
        try {
            if (typeof f == 'function') return f.call(este, ev);
            var h = f.handleEvent;
            if (typeof h != 'function') throw new TypeError("'handleEvent' is not a function");
            return h.call(f, ev);
        }
        catch (e) { reportar(e); }
        finally { eventoActual = antes; }
    }
    // Una excepción sin atrapar (de un oyente, de reportError): a la consola y, como en los navegadores, el evento
    // error en la ventana (y window.onerror con sus cinco argumentos)
    var reportando = false;
    function reportar(e) {
        console.log('JS: ' + e + (e && e.stack ? ' | ' + String(e.stack).replace(/\n\s*/g, ' | ') : ''));
        if (reportando || !g.ErrorEvent) return;
        reportando = true;
        try {
            var ev = new g.ErrorEvent('error', {cancelable: true, message: e && e.message !== undefined ? String(e.message) : String(e), error: e});
            ev.isTrusted = true;
            despachar(g, ev);
        } catch (x) {}
        finally { reportando = false; }
    }
    g.reportError = function (e) {
        if (arguments.length < 1) throw new TypeError("Failed to execute 'reportError': 1 argument required, but only 0 present.");
        reportar(e);
    };
    // Los oyentes de un objeto (nodo o window) en una fase: 1 captura, 2 en el objetivo, 3 subida
    function avisar(n, ev, fase) {
        ev.currentTarget = n;
        ev.eventPhase = fase;
        var l = n.__ev && n.__ev[ev.type];
        var h = fase != 1 ? n['on' + ev.type] : null;
        if (fase != 1 && typeof h != 'function' && n.nodeType == 1 && n.hasAttribute('on' + ev.type)) {
            try { h = new Function('event', n.getAttribute('on' + ev.type)); } catch (e) { console.log('JS: ' + e); }
        }
        if (typeof h != 'function' && !l) return;
        // (window.event: el evento, salvo si n está en una sombra)
        var actual = ev;
        if (haySombras && n.nodeType) { var rz = n.getRootNode(); if (rz.nodeType == 11 && rz.host) actual = undefined; }
        if (typeof h == 'function') {
            // (window.onerror recibe mensaje, fichero, línea, columna y error; true lo cancela)
            if (n === g && ev.type == 'error' && g.ErrorEvent && ev instanceof g.ErrorEvent) {
                if (llamar(function (e) { return h.call(g, e.message, e.filename, e.lineno, e.colno, e.error); }, n, ev, actual) === true && ev.cancelable) ev.defaultPrevented = true;
            } else if (llamar(h, n, ev, actual) === false && ev.cancelable) ev.defaultPrevented = true;
        }
        if (!l) return;
        l.slice().forEach(function (o) {
            if (ev._pararYa || o.quitado) return;
            if (fase == 1 && !o.captura || fase == 3 && o.captura) return;
            if (o.una) olvidar(n, ev.type, o.f, o.captura);
            ev._pasivo = o.pasivo;
            llamar(o.f, n, ev, actual);
            ev._pasivo = false;
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
        // (en la captura solo cuentan los oyentes: sin ellos, ni se llama; tarea 61)
        var t = ev.type;
        for (var i = camino.length - 1; i >= 0 && !ev._parar; i--) { var c = camino[i].__ev; if (c && c[t]) avisar(camino[i], ev, 1); }
        if (!ev._parar) avisar(nodo, ev, 2);
        if (ev.bubbles) for (i = 0; i < camino.length && !ev._parar; i++) avisar(camino[i], ev, 3);
        ev.currentTarget = null;
        ev.eventPhase = 0;
        return !ev.defaultPrevented;
    }
    // Los on* de HTML (onclick, ontransitionend...): null hasta que se ponen, en los elementos y en la ventana (WPT
    // dom/events). Sin los táctiles: 'ontouchstart' in window es como muchas webs deciden que es un móvil, y en Chrome de
    // escritorio no está
    ['abort', 'animationcancel', 'animationend', 'animationiteration', 'animationstart', 'auxclick', 'beforeinput',
     'blur', 'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close', 'contextmenu', 'copy', 'cuechange',
     'cut', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop', 'durationchange',
     'emptied', 'ended', 'error', 'focus', 'focusin', 'focusout', 'formdata', 'input', 'invalid', 'keydown', 'keypress',
     'keyup', 'load', 'loadeddata', 'loadedmetadata', 'loadstart', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove',
     'mouseout', 'mouseover', 'mouseup', 'paste', 'pause', 'play', 'playing', 'pointercancel', 'pointerdown',
     'pointerenter', 'pointerleave', 'pointermove', 'pointerout', 'pointerover', 'pointerup', 'progress', 'ratechange',
     'reset', 'resize', 'scroll', 'scrollend', 'seeked', 'seeking', 'select', 'selectionchange', 'selectstart',
     'slotchange', 'stalled', 'submit', 'suspend', 'timeupdate', 'toggle', 'transitioncancel', 'transitionend',
     'transitionrun', 'transitionstart', 'volumechange', 'waiting', 'webkitanimationend', 'webkitanimationiteration',
     'webkitanimationstart', 'webkittransitionend', 'wheel'].forEach(function (k) {
        var d = {configurable: true, enumerable: true,
            get: function () { var h = this.__on && this.__on[k]; return h === undefined ? null : h; },
            set: function (v) {
                if (!this.__on) Object.defineProperty(this, '__on', {value: {}, configurable: true});
                this.__on[k] = typeof v == 'function' || (v && typeof v == 'object') ? v : null;
            }};
        Object.defineProperty(N, 'on' + k, d);
        if (!Object.getOwnPropertyDescriptor(g, 'on' + k)) Object.defineProperty(g, 'on' + k, d);
    });
    N.addEventListener = function (t, f, o) { escuchar(this, t, f, o); };
    N.removeEventListener = function (t, f, o) { olvidar(this, t, f, o); };
    // (uno sin inicializar, el de createEvent sin initEvent, o que ya se está despachando: InvalidStateError)
    N.dispatchEvent = function (ev) {
        if (!(ev instanceof Ev)) throw new TypeError("Failed to execute 'dispatchEvent': parameter 1 is not of type 'Event'.");
        if (ev._despachando || ev._inicializado === false) g.__dashweb_lanzar('InvalidStateError', 'The event is already being dispatched or was not initialized.');
        ev._despachando = true;
        var el = this;
        try { return conActivacion(el, ev, function () { return despachar(el, ev); }); }
        finally { ev._despachando = false; }
    };
    g.addEventListener = function (t, f, o) { escuchar(g, t, f, o); };
    g.removeEventListener = function (t, f, o) { olvidar(g, t, f, o); };
    g.dispatchEvent = function (ev) { return N.dispatchEvent.call(g, ev); };
    // La activación de DOM (tarea 41d, WPT dom/events): un clic (MouseEvent click, de click() o de dispatchEvent) activa
    // el primero del camino que tiene algo que hacer: él, o subiendo si el evento sube. Antes del evento, lo previo
    // (un checkbox cambia, un radio se marca: Acid3 43 y 54); si alguien lo cancela, vuelve; si no, lo que hace: input y
    // change, enviar o vaciar su formulario, abrir o cerrar un <details> desde su <summary>, seguir un enlace, o el clic
    // en el control de un <label>. Un control desactivado no hace nada. (Los clics de verdad van por
    // __dashweb_despachar y lib/formularios.dash.)
    function tipoDe(el) { return el.localName == 'input' ? String(el.type).toLowerCase() : ''; }
    function interactivo(e) {
        return /^(a|button|details|embed|iframe|label|select|textarea)$/.test(e.localName) ||
            (e.localName == 'input' && tipoDe(e) != 'hidden');
    }
    function controlDe(lb) {
        var id = lb.getAttribute('for');
        if (id !== null) { var c = document.getElementById(id); return c && /^(button|input|meter|output|progress|select|textarea)$/.test(c.localName) ? c : null; }
        var l = lb.querySelectorAll('button, input, meter, output, progress, select, textarea');
        for (var i = 0; i < l.length; i++) if (tipoDe(l[i]) != 'hidden') return l[i];
        return null;
    }
    function conActivacion(objetivo, ev, hacer) {
        var act = null;
        if (ev.type == 'click' && ev instanceof g.MouseEvent) {
            for (var e = objetivo; e && e.nodeType == 1; e = ev.bubbles ? e.parentNode : null) {
                if (tieneActivacion(e)) { act = e; break; }
            }
        }
        if (!act) return hacer();
        var t = tipoDe(act), antes = null, previo = null;
        if (t == 'checkbox') { antes = act.checked; act.checked = !antes; }
        else if (t == 'radio') {
            antes = act.checked;
            // (el que estaba marcado en su grupo, para volver a él si alguien cancela)
            var nm = act.getAttribute('name');
            if (!antes && nm) {
                var raiz = act.form || act.getRootNode();
                previo = Array.prototype.find.call(raiz.querySelectorAll('input'), function (o) {
                    return o !== act && tipoDe(o) == 'radio' && o.getAttribute('name') === nm && o.checked && o.form === act.form;
                }) || null;
            }
            act.checked = true;
        }
        var sigue = hacer();
        if (antes !== null) {
            if (!sigue) { act.checked = antes; if (previo) previo.checked = true; return sigue; }
            if (t == 'checkbox' || !antes) {
                despachar(act, new Ev('input', {bubbles: true, composed: true}));
                despachar(act, new Ev('change', {bubbles: true}));
            }
            return sigue;
        }
        if (sigue) activar(act, objetivo);
        return sigue;
    }
    function tieneActivacion(e) {
        var n = e.localName, t = tipoDe(e);
        if (n == 'input') return /^(checkbox|radio|submit|image|reset|button)$/.test(t) && !e.hasAttribute('disabled');
        if (n == 'button') return !e.hasAttribute('disabled');
        if (n == 'a' || n == 'area') return e.hasAttribute('href');
        if (n == 'summary') {
            var d = e.parentNode;
            if (!d || d.localName != 'details') return false;
            for (var h = d.firstElementChild; h; h = h.nextElementSibling) if (h.localName == 'summary') return h === e;
            return false;
        }
        return n == 'label';
    }
    function activar(act, objetivo) {
        var n = act.localName, t = tipoDe(act);
        var tb = n == 'button' ? (act.getAttribute('type') || 'submit').toLowerCase() : '';
        var f = act.form;
        if ((t == 'submit' || t == 'image' || tb == 'submit') && f) {
            if (despachar(f, new g.SubmitEvent('submit', {bubbles: true, cancelable: true, submitter: act})) && typeof f.submit == 'function') f.submit();
        } else if ((t == 'reset' || tb == 'reset') && f) {
            f.reset();
        } else if (n == 'summary') {
            var d = act.parentNode;
            if (d.hasAttribute('open')) d.removeAttribute('open'); else d.setAttribute('open', '');
            setTimeout(function () { despachar(d, new Ev('toggle')); }, 0);
        } else if (n == 'a' || n == 'area') {
            // (no los que bajan un fichero, van a otra ventana o son javascript:: navegar aquí rompería la página)
            var tg = (act.getAttribute('target') || '').toLowerCase();
            if (!act.hasAttribute('download') && (tg == '' || tg == '_self' || tg == '_top' || tg == '_parent') && !/^\s*javascript:/i.test(act.href)) location.href = act.href;
        } else if (n == 'label') {
            // (si el clic fue en su control o en algo interactivo de dentro, no hace nada)
            for (var e = objetivo; e && e !== act; e = e.parentNode) if (e.nodeType == 1 && interactivo(e)) return;
            var c = controlDe(act);
            if (c && c !== objetivo) c.click();
        }
    }
    N.click = function () {
        var el = this;
        if (el.nodeType == 1 && /^(button|input|select|textarea|option|optgroup|fieldset)$/.test(el.localName) && el.hasAttribute('disabled')) return;
        if (enClic.has(el)) return;
        enClic.add(el);
        try {
            var ev = new g.MouseEvent('click', {bubbles: true, cancelable: true, composed: true, button: 0});
            conActivacion(el, ev, function () { return despachar(el, ev); });
        } finally { enClic.delete(el); }
    };
    var enClic = new WeakSet();   // (click() dentro de su propio clic no hace nada: HTML, "click in progress flag")
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
    // form.reset(): el evento reset y, si nadie lo cancela, cada control a su valor del HTML
    N.reset = function () {
        if (this.localName != 'form' || !despachar(this, new Ev('reset', {bubbles: true, cancelable: true}))) return;
        Array.prototype.forEach.call(this.querySelectorAll('input, textarea, select'), function (c) {
            var t = tipoDe(c);
            if (t == 'checkbox' || t == 'radio') c.checked = c.hasAttribute('checked');
            else if (c.localName == 'textarea') c.value = c.textContent;
            else if (c.localName == 'input') c.value = c.getAttribute('value') || '';
        });
    };
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
    // (los nombres de DOM, sin mirar mayúsculas; otro da NotSupportedError; WPT dom/nodes Document-createEvent)
    var EVENTOS = ['beforeunloadevent', 'compositionevent', 'customevent', 'devicemotionevent', 'deviceorientationevent',
        'dragevent', 'event', 'events', 'focusevent', 'hashchangeevent', 'htmlevents', 'keyboardevent', 'messageevent',
        'mouseevent', 'mouseevents', 'storageevent', 'svgevents', 'textevent', 'touchevent', 'uievent', 'uievents'];
    document.createEvent = function (t) {
        if (arguments.length < 1) throw new TypeError("Failed to execute 'createEvent': 1 argument required.");
        var k = String(t).toLowerCase();
        if (EVENTOS.indexOf(k) < 0) g.__dashweb_lanzar('NotSupportedError', "The provided event type ('" + t + "') is invalid.");
        var ev = k == 'customevent' ? new g.CustomEvent('') : new Ev('');
        ev._inicializado = false;
        return ev;
    };
    // (los init* de DOM 2: initUIEvent y initMouseEvent dejan detail, view y lo del ratón; Acid3 30)
    Ev.prototype.initUIEvent = function (t, b, c, v, d) { this.initEvent(t, b, c); this.view = v === undefined ? null : v; this.detail = +d || 0; };
    Ev.prototype.initMouseEvent = function (t, b, c, v, d, sx, sy, cx, cy, ctrl, alt, shift, meta, boton, rel) {
        this.initUIEvent(t, b, c, v, d);
        this.screenX = sx | 0; this.screenY = sy | 0; this.clientX = cx | 0; this.clientY = cy | 0;
        this.ctrlKey = !!ctrl; this.altKey = !!alt; this.shiftKey = !!shift; this.metaKey = !!meta;
        this.button = boton | 0; this.relatedTarget = rel || null;
    };
    // (un set* de Date sin argumentos deja la fecha en NaN, como dice ECMAScript; Acid3 86. En el Amiga, QuickJS con un
    // argumento NaN la deja en 1970: se pasa por setTime(NaN), que sí vale)
    ['setMilliseconds', 'setUTCMilliseconds', 'setSeconds', 'setUTCSeconds', 'setMinutes', 'setUTCMinutes', 'setHours',
     'setUTCHours', 'setDate', 'setUTCDate', 'setMonth', 'setUTCMonth', 'setFullYear', 'setUTCFullYear'].forEach(function (k) {
        var f = Date.prototype[k];
        if (typeof f != 'function') return;
        Object.defineProperty(Date.prototype, k, {writable: true, configurable: true, value: function () {
            return arguments.length ? f.apply(this, arguments) : this.setTime(NaN);
        }});
    });

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
    function def(nombre, get, set, en) {
        Object.defineProperty(en || N, nombre, {get: get, configurable: true, set: function (v) {
            if (!__dashweb_es_nodo(this)) { Object.defineProperty(this, nombre, {value: v, writable: true, enumerable: true, configurable: true}); return; }
            if (set) set.call(this, v);
        }});
    }
    // la misma en el prototipo de cada una de esas etiquetas ("a area option")
    function defEn(etiquetas, nombre, get, set) {
        etiquetas.split(' ').forEach(function (e) { def(nombre, get, set, proto(e)); });
    }
    // Un accesor sin getter que una página pone en el prototipo de sus elementos sobre una propiedad de los nodos que
    // tiene getter (style...) se queda con el de los nodos: YouTube define así style en cada componente suyo
    // (Object.defineProperty(Z.prototype, 'style', {set: ..., get: undefined})) y luego le pone estilos a uno con
    // el.style.cssText = ...: "cannot set property 'cssText' of undefined", y su diálogo de cookies se quedaba debajo
    // de su fondo, sin posición ni z-index (tarea 38c5)
    (function () {
        var definir = Object.defineProperty, definirVarias = Object.defineProperties;
        function arreglar(o, k, d) {
            if (!d || d.get !== undefined || typeof d.set != 'function' || o === N || !N.isPrototypeOf(o)) return d;
            var nativo = Object.getOwnPropertyDescriptor(N, k);
            if (!nativo || !nativo.get) return d;
            var r = {};
            for (var p in d) r[p] = d[p];
            r.get = nativo.get;
            return r;
        }
        Object.defineProperty = function (o, k, d) { return definir(o, k, arreglar(o, k, d)); };
        Object.defineProperties = function (o, ds) {
            if (!ds || typeof ds != 'object' || o === N || !N.isPrototypeOf(o)) return definirVarias(o, ds);
            var r = {};
            Reflect.ownKeys(ds).forEach(function (k) { if (Object.prototype.propertyIsEnumerable.call(ds, k)) r[k] = arreglar(o, k, ds[k]); });
            return definirVarias(o, r);
        };
    })();
    N.hasChildNodes = function () { return this.childNodes.length > 0; };
    N.getRootNode = function () { var n = this; while (n.parentNode) n = n.parentNode; return n; };
    def('isConnected', function () { return this.getRootNode() === document; });
    // Shadow DOM mínimo: la raíz de sombra es un fragmento aparte (no se pinta; Next.js pone ahí su anunciador de
    // rutas, que no se ve)
    N.attachShadow = function (o) {
        haySombras = true;
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
    // (null en body, html y lo fijo, como en un navegador: el sticky-sidebar de amigatronics.com sube por offsetParent
    // hasta null, y body daba body: un bucle sin fin; tarea 55)
    def('offsetParent', function () {
        if (this === document.body || this === document.documentElement) return null;
        if (!__dashweb_caja(this) && !this.offsetWidth) return null;
        if (getComputedStyle(this).position == 'fixed') return null;
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
    // append, before, remove... con los insertBefore y removeChild del preludio (prim, al final del MutationObserver),
    // no con los de la página: el polyfill de customElements envuelve los dos y, si unos llaman a los otros, cada
    // movimiento le llegaba dos veces (en un navegador no se llaman): el buscador de YouTube se pintaba dos veces
    // (tarea 38c9)
    var prim = {ins: N.insertBefore, rem: N.removeChild};
    function meterAntes(p, n, ref) { return prim.ins.call(p, n, ref || null); }
    N.append = function () { nodos(arguments).forEach(function (n) { meterAntes(this, n, null); }, this); };
    N.prepend = function () { var f = this.firstChild; nodos(arguments).forEach(function (n) { meterAntes(this, n, f); }, this); };
    N.before = function () { var p = this.parentNode, y = this; if (p) nodos(arguments).forEach(function (n) { meterAntes(p, n, y); }); };
    N.after = function () { var p = this.parentNode, s = this.nextSibling; if (p) nodos(arguments).forEach(function (n) { meterAntes(p, n, s); }); };
    N.replaceWith = function () { var p = this.parentNode, y = this; if (p) { nodos(arguments).forEach(function (n) { meterAntes(p, n, y); }); prim.rem.call(p, this); } };
    N.remove = function () { if (this.parentNode) prim.rem.call(this.parentNode, this); };
    N.insertAdjacentHTML = function (donde, html) {
        var t = document.createElement('div'), f = document.createDocumentFragment();
        t.innerHTML = html;
        while (t.firstChild) f.appendChild(t.firstChild);
        this.insertAdjacentElement(donde, f);
    };
    N.insertAdjacentElement = function (donde, e) {
        donde = String(donde).toLowerCase();
        if (donde == 'beforebegin') meterAntes(this.parentNode, e, this);
        else if (donde == 'afterbegin') meterAntes(this, e, this.firstChild);
        else if (donde == 'beforeend') meterAntes(this, e, null);
        else if (donde == 'afterend') meterAntes(this.parentNode, e, this.nextSibling);
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
            // (sobre un objeto, no un Array: el length de un Array no se puede esconder de ownKeys; WPT
            // namednodemap-supported-property-names)
            Object.defineProperty(el, '__atributos', {configurable: true, enumerable: false, value: new Proxy({}, {
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
                has: function (t, k) { return k in copiaAtributos.call(el); },
                // los índices y los nombres de los atributos (como en los navegadores)
                ownKeys: function () {
                    var lista = copiaAtributos.call(el), r = [], i;
                    for (i = 0; i < lista.length; i++) r.push(String(i));
                    for (i = 0; i < lista.length; i++) if (r.indexOf(lista[i].name) < 0) r.push(lista[i].name);
                    return r;
                },
                getOwnPropertyDescriptor: function (t, k) {
                    var lista = copiaAtributos.call(el);
                    if (typeof k === 'string' && /^[0-9]+$/.test(k)) {
                        return +k < lista.length ? {value: lista[+k], writable: false, enumerable: true, configurable: true} : undefined;
                    }
                    return typeof k === 'string' && el.hasAttribute(k) ? {value: el.getAttributeNode(k), writable: false, enumerable: false, configurable: true} : undefined;
                }
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
    // HTMLCollection (src_c/tachyon.c, viva; tarea 41d): se recorre como un Array (for...of), sin forEach; children es
    // siempre la misma
    HTMLCollection.prototype[Symbol.iterator] = Array.prototype.values;
    (function () {
        var hijos = Object.getOwnPropertyDescriptor(N, 'children').get, de = new WeakMap();
        def('children', function () {
            var c = de.get(this);
            if (!c) { c = hijos.call(this); de.set(this, c); }
            return c;
        });
    })();
    def('childElementCount', function () { return this.children.length; });
    def('firstElementChild', function () { return this.children[0] || null; });
    def('lastElementChild', function () { var c = this.children; return c[c.length - 1] || null; });
    def('title', function () { return this.getAttribute('title') || ''; }, function (v) { this.setAttribute('title', v); });

    // atributos que se leen como propiedades
    // (las de todos los elementos, sin etiquetas; las demás, en las suyas)
    var MEDIOS = 'audio video', FORMULARIO = 'button fieldset input label legend object output select textarea option';
    [['name', 'a button fieldset form iframe img input map meta object output param select slot textarea embed frame'],
     ['href', 'a area link base'], ['src', 'img script iframe embed video audio source track input frame'],
     ['alt', 'img area input'], ['rel', 'a area link form'], ['target', 'a area form base'],
     ['placeholder', 'input textarea'], ['lang'], ['dir'], ['action', 'form'], ['method', 'form'], ['role'],
     ['width', 'img canvas video iframe embed object input source'],
     ['height', 'img canvas video iframe embed object input source'], ['htmlFor:for', 'label output'],
     ['accessKey:accesskey'], ['tabIndex:tabindex'], ['content', 'meta'], ['charset', 'meta script'],
     ['media', 'link style source meta'], ['download', 'a area'], ['hreflang', 'a link'],
     ['label', 'option optgroup track'], ['pattern', 'input'], ['accept', 'input'],
     ['autocomplete', 'input form select textarea'], ['enctype', 'form'], ['srcset', 'img source'],
     ['sizes', 'img source link'], ['loading', 'img iframe'], ['crossOrigin:crossorigin', 'img script link ' + MEDIOS],
     ['integrity', 'script link'], ['referrerPolicy:referrerpolicy', 'a area img iframe link script'],
     ['httpEquiv:http-equiv', 'meta']].forEach(function (q) {
        var k = q[0], en = q[1];
        var p = k.split(':'), a = p[1] || p[0];
        var completa = p[0] == 'href' || p[0] == 'src' || p[0] == 'action';
        (en ? defEn.bind(null, en) : def)(p[0], function () {
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
        defEn('template', 'content', function () {
            var f = this.__contenido;
            if (!f) { f = document.createDocumentFragment(); Object.defineProperty(this, '__contenido', {value: f, configurable: true}); }
            while (this.firstChild) f.appendChild(this.firstChild);
            return f;
        });
        var clonar = N.cloneNode;
        N.cloneNode = function (hondo) {
            var c = clonar.call(this, hondo);
            if (hondo && this.localName == 'template' && this.__contenido) c.content.appendChild(this.__contenido.cloneNode(true));
            // (el clon de un elemento propio se mejora, como lo que hace el analizador)
            if (ce && ce.n) ce_puestos(c, false, true);
            return c;
        };
    })();
    // una sola página: traer un nodo es clonarlo
    document.importNode = function (n, hondo) { return n.cloneNode(!!hondo); };
    document.adoptNode = function (n) { if (n.parentNode) n.parentNode.removeChild(n); return n; };
    // las partes de la dirección de un enlace (a.hash, a.pathname...: HTMLHyperlinkElementUtils)
    function urlEnlace(el) {
        var v = el.getAttribute('href');
        if (v === null) return null;
        try { return new URL(v, String(document.baseURI || location.href)); } catch (e) { return null; }
    }
    ['protocol', 'host', 'hostname', 'port', 'pathname', 'search', 'hash', 'origin', 'username', 'password'].forEach(function (k) {
        // (solo en <a> y <area>: ShadyDOM pone fragmento.host = el elemento de su raíz de sombra; tarea 38)
        // (HTML: sin href o con una dirección que no se analiza, protocol ":" y lo demás "", y los setters no hacen
        // nada; WPT url/a-element)
        defEn('a area', k, function () {
            var u = urlEnlace(this);
            if (u === null) return k == 'protocol' ? ':' : '';
            return u[k];
        }, function (v) {
            if (k == 'origin') return;
            var u = urlEnlace(this);
            if (u === null) return;
            u[k] = v;
            this.setAttribute('href', u.href);
        });
    });
    defEn('a button embed input link object ol ul li menu script source style select textarea', 'type', function () {
        var v = this.getAttribute('type');
        return v !== null ? v.toLowerCase() : this.localName == 'input' ? 'text' : this.localName == 'button' ? 'submit' : '';
    }, function (v) { this.setAttribute('type', v); });
    [['disabled', 'button fieldset input optgroup option select textarea link style'], ['defaultSelected:selected', 'option'],
     ['readOnly:readonly', 'input textarea'], ['multiple', 'input select'], ['required', 'input select textarea'],
     ['hidden'], ['autofocus'], ['async', 'script'], ['defer', 'script'], ['noValidate:novalidate', 'form'],
     ['open', 'details dialog'], ['controls', MEDIOS], ['autoplay', MEDIOS], ['loop', MEDIOS], ['muted', MEDIOS]].forEach(function (q) {
        var p = q[0].split(':'), a = p[1] || p[0];
        (q[1] ? defEn.bind(null, q[1]) : def)(p[0], function () { return this.hasAttribute(a); },
            function (v) { if (v) this.setAttribute(a, ''); else this.removeAttribute(a); });
    });
    // (con setter: React los pone al montar un <input>, y en modo estricto asignar a uno sin setter es un error que
    // tiraba la página entera; tarea 37h)
    defEn('input', 'defaultChecked', function () { return this.hasAttribute('checked'); },
        function (v) { if (v) this.setAttribute('checked', ''); else this.removeAttribute('checked'); });
    delete N.defaultValue;
    defEn('input textarea output', 'defaultValue', function () {
        return this.localName == 'textarea' ? this.textContent : (this.getAttribute('value') || '');
    }, function (v) { if (this.localName == 'textarea') this.textContent = String(v); else this.setAttribute('value', String(v)); });
    defEn('select datalist', 'options', function () { return this.querySelectorAll('option'); });
    defEn('select', 'selectedIndex', function () {
        var o = this.options;
        for (var i = 0; i < o.length; i++) if (o[i].selected) return i;
        return this.localName == 'select' && o.length && !this.multiple ? 0 : -1;
    }, function (k) { var o = this.options; for (var i = 0; i < o.length; i++) o[i].selected = i == k; });
    defEn('a area option script title', 'text', function () { return this.textContent; }, function (v) { this.textContent = v; });
    defEn(FORMULARIO, 'form', function () { return this.closest('form'); });
    // (selected de un option: si está elegido, como checked; el atributo es defaultSelected; tarea 41c)
    (function () {
        var m = Object.getOwnPropertyDescriptor(N, 'checked');
        if (m) defEn('option', 'selected', m.get, m.set);
    })();
    // form.elements: los controles (sin input type=image), por posición y por name o id; con un grupo de radios del
    // mismo name, una lista con value (RadioNodeList). form.length (Acid3 52 a 56)
    function controles(f) {
        var l = Array.prototype.filter.call(f.querySelectorAll('button, fieldset, input, object, output, select, textarea'),
            function (e) { return !(e.localName == 'input' && e.type == 'image'); });
        var porNombre = {};
        l.forEach(function (e) {
            [e.id, e.getAttribute('name')].forEach(function (k) {
                if (!k) return;
                if (!porNombre[k]) porNombre[k] = [];
                if (porNombre[k].indexOf(e) < 0) porNombre[k].push(e);
            });
        });
        Object.keys(porNombre).forEach(function (k) {
            if (/^\d+$/.test(k) || k in l) return;
            var v = porNombre[k];
            if (v.length > 1) {
                Object.defineProperty(v, 'value', {get: function () {
                    var r = v.filter(function (e) { return e.type == 'radio' && e.checked; })[0];
                    return r ? r.value : '';
                }});
                Object.defineProperty(l, k, {value: v, configurable: true});
            } else Object.defineProperty(l, k, {value: v[0], configurable: true});
        });
        Object.defineProperty(l, 'item', {value: function (i) { return l[i] || null; }});
        Object.defineProperty(l, 'namedItem', {value: function (k) { return porNombre[k] ? porNombre[k][0] : null; }});
        return l;
    }
    defEn('form fieldset', 'elements', function () { return controles(this); });
    defEn('form', 'length', function () { return controles(this).length; });
    defEn('select', 'length', function () { return this.options.length; });
    proto('select').add = function (el, antes) {
        if (typeof antes == 'number') antes = this.options[antes] || null;
        if (antes && antes.parentNode) antes.parentNode.insertBefore(el, antes);
        else this.appendChild(el);
    };
    proto('select').remove = function (i) {
        if (arguments.length == 0) { if (this.parentNode) this.parentNode.removeChild(this); return; }
        var o = this.options[i];
        if (o && o.parentNode) o.parentNode.removeChild(o);
    };
    proto('select').item = function (i) { return this.options[i] || null; };

    // classList como dice DOM (DOMTokenList; tarea 41d, WPT): los tokens son un conjunto ordenado (sin repetidos),
    // "" da SyntaxError y uno con blancos InvalidCharacterError antes de tocar nada; sin atributo y sin tokens no se
    // crea el atributo; el mismo objeto cada vez
    function ListaTokens(el, atr) { this.__el = el; this.__atr = atr; this.__yo = this; }
    // (el objeto de verdad, no su Proxy: una sola vuelta por la trampa en cada método; tarea 61)
    function yo(x) { return x.__yo || x; }
    // los tokens del atributo, partidos solo si su texto cambió (classList.contains partía el class en cada llamada:
    // ~0,65 ms cada una en la máquina RTG; tarea 61). Es la lista guardada: quien la cambie, sobre una copia
    function tokens(lt) {
        var v = lt.__el.getAttribute(lt.__atr), r = [];
        if (v === lt.__v && lt.__l) return lt.__l;
        if (v !== null) String(v).split(/[ \t\n\f\r]+/).forEach(function (t) { if (t && r.indexOf(t) < 0) r.push(t); });
        lt.__v = v;
        lt.__l = r;
        return r;
    }
    function validar(t) {
        t = String(t);
        if (t === '') g.__dashweb_lanzar('SyntaxError', 'The token provided must not be empty.');
        if (/[ \t\n\f\r]/.test(t)) g.__dashweb_lanzar('InvalidCharacterError', "The token provided ('" + t + "') contains HTML space characters, which are not valid in tokens.");
        return t;
    }
    function actualizar(lt, l) {
        if (!lt.__el.hasAttribute(lt.__atr) && !l.length) return;
        lt.__el.setAttribute(lt.__atr, l.join(' '));
    }
    ListaTokens.prototype = {
        get length() { return tokens(yo(this)).length; },
        get value() { var t = yo(this), v = t.__el.getAttribute(t.__atr); return v === null ? '' : v; },
        set value(v) { var t = yo(this); t.__el.setAttribute(t.__atr, String(v)); },
        item: function (i) { var l = tokens(yo(this)); i = i >>> 0; return i < l.length ? l[i] : null; },
        contains: function (t) { return tokens(yo(this)).indexOf(String(t)) >= 0; },
        add: function () {
            var q = Array.prototype.map.call(arguments, validar), l = tokens(yo(this)).slice();
            q.forEach(function (t) { if (l.indexOf(t) < 0) l.push(t); });
            actualizar(yo(this), l);
        },
        remove: function () {
            var q = Array.prototype.map.call(arguments, validar), l = tokens(yo(this));
            actualizar(yo(this), l.filter(function (t) { return q.indexOf(t) < 0; }));
        },
        toggle: function (t, si) {
            t = validar(t);
            var l = tokens(yo(this)).slice(), i = l.indexOf(t);
            if (i >= 0) {
                if (si === undefined || !si) { l.splice(i, 1); actualizar(yo(this), l); return false; }
                return true;
            }
            if (si !== undefined && !si) return false;
            l.push(t);
            actualizar(yo(this), l);
            return true;
        },
        replace: function (a, b) {
            a = validar(a); b = validar(b);
            var l = tokens(yo(this)), i = l.indexOf(a);
            if (i < 0) return false;
            // (el nuevo, donde estaba el primero de los dos; sin repetidos)
            var r = [];
            l.forEach(function (t) { var x = t === a || t === b ? b : t; if (r.indexOf(x) < 0) r.push(x); });
            actualizar(yo(this), r);
            return true;
        },
        supports: function () { throw new TypeError("DOMTokenList has no supported tokens."); },
        toString: function () { return this.value; },
        // (iterable con índices, como dice WebIDL: los de Array.prototype, que leen length y lt[i])
        forEach: Array.prototype.forEach,
        keys: Array.prototype.keys,
        values: Array.prototype.values,
        entries: Array.prototype.entries
    };
    ListaTokens.prototype[Symbol.iterator] = Array.prototype.values;
    ListaTokens.prototype[Symbol.toStringTag] = 'DOMTokenList';
    g.DOMTokenList = ListaTokens;
    function listaDe(el, atr, k) {
        if (!el[k]) {
            var lt = new ListaTokens(el, atr);
            // (se recorre como una lista: lt[0]; Lenis lo hace, tarea 37a3)
            Object.defineProperty(el, k, {value: new Proxy(lt, {get: function (t, p) {
                // (la expresión regular, solo si empieza por cifra: esta trampa se pasa en cada classList.add o contains)
                if (typeof p == 'string' && p.charCodeAt(0) <= 57 && p.charCodeAt(0) >= 48 && /^\d+$/.test(p)) { var l = tokens(t); return +p < l.length ? l[+p] : undefined; }
                // (sin bind: los métodos, llamados sobre la lista, leen __el por aquí; bind hacía una función nueva en
                // cada classList.add o contains, y forEach o keys no eran los de Array.prototype: WPT dom/lists)
                return t[p];
            }, has: function (t, p) {
                // (Array.prototype.forEach mira si está cada índice antes de leerlo)
                if (typeof p == 'string' && /^\d+$/.test(p)) return +p < tokens(t).length;
                return p in t;
            }, set: function (t, p, v) { t[p] = v; return true; }}), configurable: true});
        }
        return el[k];
    }
    def('classList', function () { return listaDe(this, 'class', '__clases'); },
        function (v) { this.setAttribute('class', String(v)); });
    defEn('a area link form', 'relList', function () { return listaDe(this, 'rel', '__rels'); },
        function (v) { this.setAttribute('rel', String(v)); });

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
            // (sin this: YouTube la llama suelta, (0, s.removeProperty)(k); tarea 38c5)
            removeProperty: function (k) { var v = api.getPropertyValue(k); api.setProperty(k, ''); return v; },
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
    // el doctype: un nodo de verdad (nodeType 10) con name, publicId y systemId (tarea 41c, Acid3 18, 71 y 98)
    Object.defineProperty(document, 'doctype', {configurable: true, get: function () {
        for (var c = this.firstChild; c; c = c.nextSibling) if (c.nodeType == 10) return c;
        return null;
    }});
    [['publicId', 'publicid'], ['systemId', 'systemid']].forEach(function (q) {
        def(q[0], function () { return this.nodeType == 10 ? this.getAttribute(q[1]) || '' : undefined; },
            function (v) { Object.defineProperty(this, q[0], {value: v, writable: true, configurable: true, enumerable: true}); });
    });
    def('name', function () { return this.nodeType == 10 ? this.nodeName : undefined; },
        function (v) { Object.defineProperty(this, 'name', {value: v, writable: true, configurable: true, enumerable: true}); });
    // las cookies de verdad (lib/cookies.dash): las mismas que van por HTTP, sin las HttpOnly
    Object.defineProperty(document, 'cookie', {
        get: function () { return __dashweb_galletas(String(location.href)); },
        set: function (v) { __dashweb_galleta(String(location.href), String(v)); }
    });
    // (también por name o id: document.forms.form; links lleva los <area> con href; Acid3 4 y 5)
    ['forms:form', 'images:img', 'links:a[href], area[href]', 'scripts:script', 'anchors:a[name]', 'embeds:embed', 'plugins:embed'].forEach(function (k) {
        var p = k.split(':');
        Object.defineProperty(document, p[0], {configurable: true, get: function () {
            var l = this.querySelectorAll(p[1]);
            Array.prototype.forEach.call(l, function (e) {
                [e.getAttribute('name'), e.id].forEach(function (n) {
                    if (n && !(n in l)) try { Object.defineProperty(l, n, {value: e, configurable: true}); } catch (x) {}
                });
            });
            return l;
        }});
    });
    document.getElementsByName = function (n) {
        return [].filter.call(document.querySelectorAll('[name]'), function (e) { return e.getAttribute('name') === String(n); });
    };
    // (mientras carga la página, lo escrito va justo detrás del <script> que escribe, en orden, como en un navegador; Acid3
    // 0 y 29: el <map> que escribe quedaba al final del body. Si no, al final del body)
    pon(document, 'write', function () {
        var html = [].join.call(arguments, ''), s = document.readyState == 'loading' ? document.currentScript : null;
        if (s && s.parentNode) {
            if (!('__escrito' in s)) Object.defineProperty(s, '__escrito', {value: s.nextSibling, writable: true});
            var ref = s.__escrito && s.__escrito.parentNode === s.parentNode ? s.__escrito : null;
            var t = document.createElement(s.parentNode.nodeType == 1 ? s.parentNode.localName : 'body');
            t.innerHTML = html;
            var f = document.createDocumentFragment();
            while (t.firstChild) f.appendChild(t.firstChild);
            s.parentNode.insertBefore(f, ref);
            return;
        }
        var cuerpo = document.body || document.documentElement;
        if (cuerpo) cuerpo.insertAdjacentHTML('beforeend', html);
    });
    pon(document, 'writeln', document.write);
    pon(document, 'open', function () {});
    pon(document, 'close', function () {});
    document.createElementNS = function (ns, n) { return document.createElement(n); };
    // (un Attr suelto: nombre en minúsculas en un documento HTML, valor "", sin elemento; WPT dom/nodes)
    function Atributo() { throw new TypeError('Illegal constructor'); }
    Object.defineProperty(Atributo, 'name', {value: 'Attr'});
    g.Attr = Atributo;
    document.createAttribute = function (n) {
        n = String(n);
        if (!/^[A-Za-z_:\u00C0-\uFFFD][A-Za-z0-9_:.\-\u00B7-\uFFFD]*$/.test(n)) g.__dashweb_lanzar('InvalidCharacterError', "The localName provided ('" + n + "') contains an invalid character.");
        if (!this.contentType || this.contentType == 'text/html') n = n.toLowerCase();
        var a = Object.create(Atributo.prototype), v = '';
        [['name', n], ['localName', n], ['nodeName', n], ['nodeType', 2], ['namespaceURI', null], ['prefix', null],
         ['ownerElement', null], ['specified', true], ['ownerDocument', this], ['parentNode', null],
         ['childNodes', []], ['firstChild', null]].forEach(function (q) {
            Object.defineProperty(a, q[0], {value: q[1], configurable: true, enumerable: true});
        });
        ['value', 'nodeValue', 'textContent'].forEach(function (k) {
            Object.defineProperty(a, k, {configurable: true, enumerable: true, get: function () { return v; },
                set: function (x) { v = x === null ? '' : String(x); }});
        });
        return a;
    };
    // Range (tarea 38: el código de YouTube mira Range.prototype y paraba en "Range is not defined"): los límites, el
    // contenido de un mismo contenedor (borrar, sacar, clonar), insertNode y HTML a nodos (createContextualFragment);
    // sus medidas, a cero
    // Range como dice DOM (tarea 41c, Acid3 8 a 13): puntos comparados en el orden del árbol, toString, extract, clone
    // y deleteContents, insertNode (parte el texto) y surroundContents; las vivas (WeakRef) se mueven al meter, quitar o
    // partir nodos. Antes solo valía dentro de un mismo contenedor.
    function lanzarR(n, m) { g.__dashweb_lanzar(n, m); }
    function esDatos(n) { return n.nodeType == 3 || n.nodeType == 4 || n.nodeType == 7 || n.nodeType == 8; }
    function indice(n) { var i = 0; while ((n = n.previousSibling)) i++; return i; }
    function largo(n) { return n.nodeType == 10 ? 0 : esDatos(n) ? n.data.length : n.childNodes.length; }
    function raizDe(n) { while (n.parentNode) n = n.parentNode; return n; }
    function dentroDe(a, n) { while (n && n !== a) n = n.parentNode; return !!n; }   // (a, ancestro de n o n)
    // -1, 0 o 1: el punto (a, oa) antes, en el mismo sitio o después de (b, ob)
    function posicion(a, oa, b, ob) {
        if (a === b) return oa == ob ? 0 : oa < ob ? -1 : 1;
        if (antesEnArbol(b, a)) return -posicion(b, ob, a, oa);
        if (dentroDe(a, b)) {
            var c = b;
            while (c.parentNode !== a) c = c.parentNode;
            if (indice(c) < oa) return 1;
        }
        return -1;
    }
    // (a va antes que b en el orden del árbol)
    function antesEnArbol(a, b) {
        if (a === b) return false;
        var la = [], lb = [];
        for (var x = a; x; x = x.parentNode) la.unshift(x);
        for (x = b; x; x = x.parentNode) lb.unshift(x);
        if (la[0] !== lb[0]) return false;
        var i = 0;
        while (i < la.length && i < lb.length && la[i] === lb[i]) i++;
        if (i == la.length) return true;
        if (i == lb.length) return false;
        return indice(la[i]) < indice(lb[i]);
    }
    var rangos = [];
    function Range() {
        this.startContainer = this.endContainer = document;
        this.startOffset = this.endOffset = 0;
        if (typeof WeakRef == 'function') {
            rangos = rangos.filter(function (r) { return r.deref(); });
            rangos.push(new WeakRef(this));
        }
    }
    function vivos(f) { rangos.forEach(function (w) { var r = w.deref(); if (r) f(r); }); }
    Object.defineProperty(Range.prototype, 'collapsed', {configurable: true, get: function () {
        return this.startContainer === this.endContainer && this.startOffset == this.endOffset;
    }});
    Object.defineProperty(Range.prototype, 'commonAncestorContainer', {configurable: true, get: function () {
        var c = this.startContainer;
        while (c && !dentroDe(c, this.endContainer)) c = c.parentNode;
        return c;
    }});
    function punto(n, o) {
        if (!n || n.nodeType === undefined) throw new TypeError("parameter 1 is not of type 'Node'.");
        if (n.nodeType == 10) lanzarR('InvalidNodeTypeError', 'The node provided is a doctype.');
        o = o >>> 0;
        if (o > largo(n)) lanzarR('IndexSizeError', 'There is no child at offset ' + o + '.');
        return o;
    }
    Range.prototype.setStart = function (n, o) {
        o = punto(n, o);
        if (raizDe(n) !== raizDe(this.startContainer) || posicion(n, o, this.endContainer, this.endOffset) > 0) { this.endContainer = n; this.endOffset = o; }
        this.startContainer = n; this.startOffset = o;
    };
    Range.prototype.setEnd = function (n, o) {
        o = punto(n, o);
        if (raizDe(n) !== raizDe(this.startContainer) || posicion(n, o, this.startContainer, this.startOffset) < 0) { this.startContainer = n; this.startOffset = o; }
        this.endContainer = n; this.endOffset = o;
    };
    function padreDe(n) {
        var p = n && n.parentNode;
        if (!p) lanzarR('InvalidNodeTypeError', 'the given Node has no parent.');
        return p;
    }
    Range.prototype.setStartBefore = function (n) { this.setStart(padreDe(n), indice(n)); };
    Range.prototype.setStartAfter = function (n) { this.setStart(padreDe(n), indice(n) + 1); };
    Range.prototype.setEndBefore = function (n) { this.setEnd(padreDe(n), indice(n)); };
    Range.prototype.setEndAfter = function (n) { this.setEnd(padreDe(n), indice(n) + 1); };
    Range.prototype.selectNode = function (n) {
        var p = padreDe(n), i = indice(n);
        this.startContainer = this.endContainer = p; this.startOffset = i; this.endOffset = i + 1;
    };
    Range.prototype.selectNodeContents = function (n) {
        if (n.nodeType == 10) lanzarR('InvalidNodeTypeError', 'The node provided is a doctype.');
        this.startContainer = this.endContainer = n; this.startOffset = 0; this.endOffset = largo(n);
    };
    Range.prototype.collapse = function (alInicio) {
        if (alInicio) { this.endContainer = this.startContainer; this.endOffset = this.startOffset; }
        else { this.startContainer = this.endContainer; this.startOffset = this.endOffset; }
    };
    Range.prototype.cloneRange = function () {
        var r = new Range();
        r.startContainer = this.startContainer; r.startOffset = this.startOffset;
        r.endContainer = this.endContainer; r.endOffset = this.endOffset;
        return r;
    };
    Range.prototype.detach = function () {};
    function contenido(r, n) {
        return raizDe(n) === raizDe(r.startContainer) && posicion(n, 0, r.startContainer, r.startOffset) > 0 &&
            posicion(n, largo(n), r.endContainer, r.endOffset) < 0;
    }
    // (cambiar el texto de un nodo de datos moviendo los puntos de las vivas que caen en lo cambiado)
    function cambiarDatos(n, o, cuenta, t) {
        var d = n.data;
        if (o + cuenta > d.length) cuenta = d.length - o;
        n.data = d.substring(0, o) + t + d.substring(o + cuenta);
        vivos(function (r) {
            if (r.startContainer === n && r.startOffset > o) r.startOffset = r.startOffset <= o + cuenta ? o : r.startOffset + t.length - cuenta;
            if (r.endContainer === n && r.endOffset > o) r.endOffset = r.endOffset <= o + cuenta ? o : r.endOffset + t.length - cuenta;
        });
    }
    function partirTexto(n, o) {
        var l = n.data.length;
        if (o > l) lanzarR('IndexSizeError', 'The offset ' + o + ' is larger than the Text node\'s length.');
        var nuevo = (n.ownerDocument || document).createTextNode(n.data.substring(o)), p = n.parentNode;
        if (p) {
            var i = indice(n);
            p.insertBefore(nuevo, n.nextSibling);
            vivos(function (r) {
                if (r.startContainer === n && r.startOffset > o) { r.startContainer = nuevo; r.startOffset -= o; }
                if (r.endContainer === n && r.endOffset > o) { r.endContainer = nuevo; r.endOffset -= o; }
                if (r.startContainer === p && r.startOffset == i + 1) r.startOffset++;
                if (r.endContainer === p && r.endOffset == i + 1) r.endOffset++;
            });
        }
        cambiarDatos(n, o, l - o, '');
        return nuevo;
    }
    function trozoRango(r, modo) {   // modo: 'sacar', 'clonar' o 'borrar'
        var doc = r.startContainer.ownerDocument || r.startContainer, f = doc.createDocumentFragment();
        if (r.collapsed) return f;
        var sc = r.startContainer, so = r.startOffset, ec = r.endContainer, eo = r.endOffset;
        if (sc === ec && esDatos(sc)) {
            if (modo != 'borrar') { var c0 = sc.cloneNode(false); c0.data = sc.data.substring(so, eo); f.appendChild(c0); }
            if (modo != 'clonar') cambiarDatos(sc, so, eo - so, '');
            return f;
        }
        var comun = r.commonAncestorContainer, primero = null, ultimo = null;
        if (!dentroDe(sc, ec)) for (var h = comun.firstChild; h; h = h.nextSibling) if (dentroDe(h, sc)) { primero = h; break; }
        if (!dentroDe(ec, sc)) for (h = comun.firstChild; h; h = h.nextSibling) if (dentroDe(h, ec)) { ultimo = h; break; }
        var dentro = [];
        for (h = comun.firstChild; h; h = h.nextSibling) if (contenido(r, h)) dentro.push(h);
        if (modo != 'clonar' && dentro.some(function (x) { return x.nodeType == 10; })) lanzarR('HierarchyRequestError', 'A doctype is contained.');
        var nn, no;
        if (dentroDe(sc, ec)) { nn = sc; no = so; }
        else {
            var ref = sc;
            while (!dentroDe(ref.parentNode, ec)) ref = ref.parentNode;
            nn = ref.parentNode; no = indice(ref) + 1;
        }
        var sub;
        if (primero && esDatos(primero)) {
            if (modo != 'borrar') { var c1 = sc.cloneNode(false); c1.data = sc.data.substring(so); f.appendChild(c1); }
            if (modo != 'clonar') cambiarDatos(sc, so, sc.data.length - so, '');
        } else if (primero) {
            sub = new Range(); sub.startContainer = sc; sub.startOffset = so; sub.endContainer = primero; sub.endOffset = largo(primero);
            if (modo == 'borrar') trozoRango(sub, 'borrar');
            else { var c2 = primero.cloneNode(false); f.appendChild(c2); c2.appendChild(trozoRango(sub, modo)); }
        }
        dentro.forEach(function (x) {
            if (modo == 'clonar') f.appendChild(x.cloneNode(true));
            else if (modo == 'sacar') f.appendChild(x);
            else x.parentNode.removeChild(x);
        });
        if (ultimo && esDatos(ultimo)) {
            if (modo != 'borrar') { var c3 = ec.cloneNode(false); c3.data = ec.data.substring(0, eo); f.appendChild(c3); }
            if (modo != 'clonar') cambiarDatos(ec, 0, eo, '');
        } else if (ultimo) {
            sub = new Range(); sub.startContainer = ultimo; sub.startOffset = 0; sub.endContainer = ec; sub.endOffset = eo;
            if (modo == 'borrar') trozoRango(sub, 'borrar');
            else { var c4 = ultimo.cloneNode(false); f.appendChild(c4); c4.appendChild(trozoRango(sub, modo)); }
        }
        if (modo != 'clonar') { r.startContainer = r.endContainer = nn; r.startOffset = r.endOffset = no; }
        return f;
    }
    Range.prototype.deleteContents = function () { trozoRango(this, 'borrar'); };
    Range.prototype.extractContents = function () { return trozoRango(this, 'sacar'); };
    Range.prototype.cloneContents = function () { return trozoRango(this, 'clonar'); };
    Range.prototype.insertNode = function (n) {
        var sc = this.startContainer, so = this.startOffset;
        if (sc.nodeType == 7 || sc.nodeType == 8 || (sc.nodeType == 3 && !sc.parentNode) || sc === n)
            lanzarR('HierarchyRequestError', 'The node cannot be inserted here.');
        var ref = sc.nodeType == 3 ? sc : sc.childNodes[so] || null;
        var p = ref ? ref.parentNode : sc;
        if (sc.nodeType == 3) ref = partirTexto(sc, so);
        if (n === ref) ref = ref.nextSibling;
        if (n.parentNode) n.parentNode.removeChild(n);
        var no = (ref ? indice(ref) : largo(p)) + (n.nodeType == 11 ? n.childNodes.length : 1);
        var plegado = this.collapsed;
        p.insertBefore(n, ref);
        if (plegado) { this.endContainer = p; this.endOffset = no; }
    };
    Range.prototype.surroundContents = function (e) {
        var sc = this.startContainer, ec = this.endContainer, comun = this.commonAncestorContainer;
        for (var a = sc; a && a !== comun; a = a.parentNode) if (a.nodeType != 3 && !dentroDe(a, ec)) lanzarR('InvalidStateError', 'The Range has partially selected a non-Text node.');
        for (a = ec; a && a !== comun; a = a.parentNode) if (a.nodeType != 3 && !dentroDe(a, sc)) lanzarR('InvalidStateError', 'The Range has partially selected a non-Text node.');
        if (e.nodeType == 9 || e.nodeType == 10 || e.nodeType == 11) lanzarR('InvalidNodeTypeError', 'The node provided is of an invalid type.');
        var f = this.extractContents();
        while (e.firstChild) e.removeChild(e.firstChild);
        this.insertNode(e);
        e.appendChild(f);
        this.selectNode(e);
    };
    Range.prototype.createContextualFragment = function (h) {
        var t = document.createElement('div'), f = document.createDocumentFragment();
        t.innerHTML = h;
        while (t.firstChild) f.appendChild(t.firstChild);
        return f;
    };
    Range.prototype.getBoundingClientRect = function () { return {x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0}; };
    Range.prototype.getClientRects = function () { return []; };
    Range.prototype.toString = function () {
        var sc = this.startContainer, ec = this.endContainer, s = '';
        if (sc === ec && sc.nodeType == 3) return sc.data.substring(this.startOffset, this.endOffset);
        if (sc.nodeType == 3) s += sc.data.substring(this.startOffset);
        var raiz = this.commonAncestorContainer;
        for (var n = raiz.firstChild; n; ) {
            if (n.nodeType == 3 && contenido(this, n)) s += n.data;
            if (n.firstChild) { n = n.firstChild; continue; }
            while (n && n !== raiz && !n.nextSibling) n = n.parentNode;
            if (!n || n === raiz) break;
            n = n.nextSibling;
        }
        if (ec.nodeType == 3) s += ec.data.substring(0, this.endOffset);
        return s;
    };
    // (how es un unsigned short de WebIDL: NaN e Infinity 0, el resto módulo 65536; fuera de 0-3, NotSupportedError
    // antes de mirar si los dos están en el mismo árbol)
    Range.prototype.compareBoundaryPoints = function (como, otro) {
        como = +como;
        como = isFinite(como) ? Math.trunc(como) % 65536 : 0;
        if (como < 0) como += 65536;
        if (como > 3) lanzarR('NotSupportedError', 'The comparison method provided must be one of START_TO_START, START_TO_END, END_TO_END, or END_TO_START.');
        if (raizDe(this.startContainer) !== raizDe(otro.startContainer)) lanzarR('WrongDocumentError', 'The two Ranges are not in the same tree.');
        if (como == 0) return posicion(this.startContainer, this.startOffset, otro.startContainer, otro.startOffset);
        if (como == 1) return posicion(this.endContainer, this.endOffset, otro.startContainer, otro.startOffset);
        if (como == 2) return posicion(this.endContainer, this.endOffset, otro.endContainer, otro.endOffset);
        if (como == 3) return posicion(this.startContainer, this.startOffset, otro.endContainer, otro.endOffset);
        lanzarR('NotSupportedError', 'The comparison method provided must be one of START_TO_START, START_TO_END, END_TO_END, or END_TO_START.');
    };
    Range.prototype.comparePoint = function (n, o) {
        if (raizDe(n) !== raizDe(this.startContainer)) lanzarR('WrongDocumentError', 'The node provided and the Range are not in the same tree.');
        o = punto(n, o);
        if (posicion(n, o, this.startContainer, this.startOffset) < 0) return -1;
        if (posicion(n, o, this.endContainer, this.endOffset) > 0) return 1;
        return 0;
    };
    Range.prototype.isPointInRange = function (n, o) {
        if (raizDe(n) !== raizDe(this.startContainer)) return false;
        o = punto(n, o);
        return posicion(n, o, this.startContainer, this.startOffset) >= 0 && posicion(n, o, this.endContainer, this.endOffset) <= 0;
    };
    Range.prototype.intersectsNode = function (n) {
        if (raizDe(n) !== raizDe(this.startContainer)) return false;
        var p = n.parentNode;
        if (!p) return true;
        var i = indice(n);
        return posicion(p, i, this.endContainer, this.endOffset) < 0 && posicion(p, i + 1, this.startContainer, this.startOffset) > 0;
    };
    Range.START_TO_START = 0; Range.START_TO_END = 1; Range.END_TO_END = 2; Range.END_TO_START = 3;
    ['START_TO_START', 'START_TO_END', 'END_TO_END', 'END_TO_START'].forEach(function (k) { Range.prototype[k] = Range[k]; });
    g.Range = Range;
    g.StaticRange = Range;
    document.createRange = function () { return new Range(); };
    // Text.splitText (con las vivas)
    N.splitText = function (o) {
        if (this.nodeType != 3) throw new TypeError('splitText is not a function');
        return partirTexto(this, o >>> 0);
    };
    // (las vivas, al meter y al quitar nodos)
    function rangosQuitar(n) {
        var p = n.parentNode;
        if (!p) return;
        var i = indice(n);
        vivos(function (r) {
            if (dentroDe(n, r.startContainer)) { r.startContainer = p; r.startOffset = i; }
            if (dentroDe(n, r.endContainer)) { r.endContainer = p; r.endOffset = i; }
            if (r.startContainer === p && r.startOffset > i) r.startOffset--;
            if (r.endContainer === p && r.endOffset > i) r.endOffset--;
        });
    }
    function rangosMeter(p, n, ref) {
        var i = ref ? indice(ref) : p.childNodes.length, c = n.nodeType == 11 ? n.childNodes.length : 1;
        vivos(function (r) {
            if (r.startContainer === p && r.startOffset > i) r.startOffset += c;
            if (r.endContainer === p && r.endOffset > i) r.endOffset += c;
        });
    }
    (function () {
        var quitar = N.removeChild, meter = N.appendChild, antes = N.insertBefore, cambiar = N.replaceChild;
        function hay() { return rangos.length > 0; }
        N.removeChild = function (n) { if (hay() && n && n.parentNode === this) rangosQuitar(n); return quitar.apply(this, arguments); };
        N.appendChild = function (n) {
            if (hay() && n && n.nodeType !== undefined) { if (n.parentNode) rangosQuitar(n); rangosMeter(this, n, null); }
            return meter.apply(this, arguments);
        };
        N.insertBefore = function (n, ref) {
            if (hay() && n && n.nodeType !== undefined) {
                if (n.parentNode) rangosQuitar(n);
                rangosMeter(this, n, ref && ref.parentNode === this ? ref : null);
            }
            return antes.apply(this, arguments);
        };
        N.replaceChild = function (n, viejo) {
            if (hay() && n && viejo && viejo.parentNode === this) {
                if (n.parentNode) rangosQuitar(n);
                var sig = viejo.nextSibling;
                rangosQuitar(viejo);
                cambiar.apply(this, arguments);
                rangosMeter(this, n, sig);
                return viejo;
            }
            return cambiar.apply(this, arguments);
        };
    })();
    document.getSelection = g.getSelection = function () {
        return {rangeCount: 0, removeAllRanges: function () {}, addRange: function () {}, toString: function () { return ''; }};
    };
    document.elementFromPoint = function () { return document.body; };
    document.implementation = {
        hasFeature: function () { return true; },
        createHTMLDocument: function (t) {
            return docAparte(__dashweb_documento_nuevo(t === undefined ? '' : t));
        }
    };
    // (lo de un documento, del prototipo del documento; antes de tenerlo, se copiaba de document)
    function docAparte(d) {
        var P = Object.getPrototypeOf(document);
        if (P !== N) Object.setPrototypeOf(d, P);
        else Object.getOwnPropertyNames(document).forEach(function (k) {
            if (!(k in Object.getPrototypeOf(d)) || ['body', 'head', 'documentElement'].indexOf(k) >= 0) {
                try { Object.defineProperty(d, k, Object.getOwnPropertyDescriptor(document, k)); } catch (e) {}
            }
        });
        d.readyState = 'complete';
        // (un documento aparte: about:blank, sin location, UTF-8; WPT dom/nodes)
        [['URL', 'about:blank'], ['documentURI', 'about:blank'], ['location', null], ['characterSet', 'UTF-8'],
         ['charset', 'UTF-8'], ['inputEncoding', 'UTF-8'], ['compatMode', 'CSS1Compat'], ['contentType', 'text/html']].forEach(function (q) {
            Object.defineProperty(d, q[0], {value: q[1], writable: true, configurable: true});
        });
        // open, write y close (Acid3 71): open vacía el documento, write junta el texto y close lo lee con el analizador
        // de HTML5 (con su doctype)
        pon(d, 'open', function () {
            while (this.firstChild) this.removeChild(this.firstChild);
            Object.defineProperty(this, '__escrito', {value: '', writable: true, configurable: true});
            return this;
        });
        pon(d, 'write', function () {
            if (typeof this.__escrito != 'string') this.open();
            this.__escrito += [].join.call(arguments, '');
        });
        pon(d, 'writeln', function () { this.write([].join.call(arguments, '') + '\n'); });
        pon(d, 'close', function () {
            var t = this.__escrito;
            if (typeof t != 'string') return;
            this.__escrito = null;
            var n = __dashweb_documento_html(t);
            while (n.firstChild) this.appendChild(n.firstChild);
        });
        return d;
    }

    // DOMParser (tarea 55: la cinta de amigatronics.com lee su RSS con parseFromString(texto, "application/xml") y,
    // sin DOMParser, daba "No se pudo cargar el feed"). text/html, con el analizador de HTML; lo demás (XML, RSS, Atom,
    // SVG), con uno de XML sencillo: <link> con su texto, CDATA, entidades, prefijos (atom:link) y, si está mal
    // formado, un <parsererror> como en Firefox y Chrome.
    function DOMParser() {}
    var XML_ENT = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
    function xmlTexto(t) {
        return t.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, function (m, e) {
            if (e[0] == '#') return String.fromCodePoint(e[1] == 'x' || e[1] == 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
            return XML_ENT.hasOwnProperty(e) ? XML_ENT[e] : m;
        });
    }
    function xmlAnalizar(d, t) {
        var raiz = null, pila = [], i = 0, n = t.length, f = d.createDocumentFragment();
        function dentro() { return pila.length ? pila[pila.length - 1] : f; }
        while (i < n) {
            var lt = t.indexOf('<', i);
            if (lt < 0) lt = n;
            if (lt > i) {
                var txt = t.slice(i, lt);
                if (pila.length) dentro().appendChild(d.createTextNode(xmlTexto(txt)));
                else if (/\S/.test(txt)) throw new Error('texto fuera del elemento ra\u00edz');
                i = lt;
                continue;
            }
            if (t.startsWith('<!--', i)) {
                var c = t.indexOf('-->', i + 4);
                if (c < 0) throw new Error('comentario sin cerrar');
                dentro().appendChild(d.createComment(t.slice(i + 4, c)));
                i = c + 3;
            } else if (t.startsWith('<![CDATA[', i)) {
                var cd = t.indexOf(']]>', i + 9);
                if (cd < 0 || !pila.length) throw new Error('CDATA mal puesto');
                dentro().appendChild(d.createTextNode(t.slice(i + 9, cd)));
                i = cd + 3;
            } else if (t.startsWith('<?', i) || t.startsWith('<!', i)) {
                var q = t.indexOf('>', i);
                if (q < 0) throw new Error('declaraci\u00f3n sin cerrar');
                i = q + 1;
            } else if (t[i + 1] == '/') {
                var cierra = t.indexOf('>', i), nombre = t.slice(i + 2, cierra).trim();
                var abierto = pila.pop();
                if (cierra < 0 || !abierto || abierto.__xml != nombre) throw new Error('</' + nombre + '> no cierra lo abierto');
                i = cierra + 1;
            } else {
                var m = /^<([^\s\/>]+)((?:\s+[^\s=\/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/.exec(t.slice(i, i + 65536));
                if (!m) throw new Error('etiqueta mal formada');
                if (!pila.length && raiz) throw new Error('m\u00e1s de un elemento ra\u00edz');
                var el = d.createElement(m[1]), re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g, at;
                Object.defineProperty(el, '__xml', {value: m[1], configurable: true});
                while ((at = re.exec(m[2]))) el.setAttribute(at[1], xmlTexto(at[3] !== undefined ? at[3] : at[4]));
                dentro().appendChild(el);
                if (!pila.length) raiz = el;
                if (!m[3]) pila.push(el);
                i += m[0].length;
            }
        }
        if (pila.length || !raiz) throw new Error(raiz ? '<' + pila[pila.length - 1].__xml + '> sin cerrar' : 'sin elemento ra\u00edz');
        return raiz;
    }
    DOMParser.prototype.parseFromString = function (texto, tipo) {
        texto = String(texto);
        tipo = String(tipo || 'text/html').toLowerCase();
        var d = document.implementation.createHTMLDocument('');
        if (tipo == 'text/html') {
            d.documentElement.innerHTML = texto.replace(/^\s*<!doctype[^>]*>/i, '').replace(/^\s*<html[^>]*>|<\/html>\s*$/gi, '');
            return d;
        }
        var raiz;
        try { raiz = xmlAnalizar(d, texto); }
        catch (e) {
            raiz = d.createElement('parsererror');
            raiz.textContent = 'XML Parsing Error: ' + e.message;
        }
        while (d.firstChild) d.removeChild(d.firstChild);
        d.appendChild(raiz);
        Object.defineProperty(d, 'documentElement', {value: raiz, configurable: true});
        Object.defineProperty(d, 'contentType', {value: tipo, configurable: true});
        return d;
    };
    g.DOMParser = DOMParser;

    // <iframe>, <object> y <frame>: su documento (contentDocument, contentWindow, getSVGDocument; tarea 41c, Acid3).
    // Uno aparte, de createHTMLDocument, que se llena con lo que hay en src (data en <object>) al entrar en el
    // documento o cambiar la dirección: HTML, XML y SVG con los analizadores de arriba, texto en un <pre>; al acabar,
    // load en el elemento. Su getComputedStyle calcula con sus propios <style> (lib/jsdom.dash, "aparte"). No se pinta.
    var MARCOS = {iframe: true, object: true, frame: true};
    function marcoDir(el) {
        var v = el.getAttribute(el.localName == 'object' ? 'data' : 'src');
        return v ? String(v).trim() : '';
    }
    // (location del marco: href con lo que se le pone, que se analiza contra la base de quien lo pone, la de la página;
    // no contra la suya, que al empezar es el src tal cual, quizá relativo; en w, accesor como en la página)
    function marcoLugar(dir) {
        var l = {}, h = dir;
        Object.defineProperty(l, 'href', {get: function () { return h; }, set: function (v) { h = dirValida(v); },
            enumerable: true, configurable: true});
        l.toString = function () { return h; };
        return l;
    }
    function marcoNuevo(el, dir, html) {
        var d = html === undefined ? document.implementation.createHTMLDocument('') : docAparte(__dashweb_documento_html(html));
        // (la ventana del marco hereda de la de la página lo que no es suyo: DOMException, Node, los constructores...;
        // WPT usa doc.defaultView.DOMException)
        var w = Object.create(g);
        var propio = {document: d, parent: g, top: g, frameElement: el, closed: false, name: el.getAttribute('name') || '',
            location: marcoLugar(dir || 'about:blank'),
            getComputedStyle: function (e, p) { marcoVista(el, w.document); return g.getComputedStyle(e, p); },
            postMessage: function () {}, addEventListener: function () {}, removeEventListener: function () {}};
        Object.keys(propio).forEach(function (k) {
            Object.defineProperty(w, k, {value: propio[k], writable: true, configurable: true, enumerable: true});
        });
        var lugarW = w.location;
        Object.defineProperty(w, 'location', {get: function () { return lugarW; }, set: function (v) { lugarW.href = v; },
            enumerable: true, configurable: true});
        Object.defineProperty(w, 'window', {value: w, writable: true, configurable: true});
        Object.defineProperty(w, 'self', {value: w, writable: true, configurable: true});
        Object.defineProperty(d, 'defaultView', {value: w, writable: true, configurable: true});
        Object.defineProperty(d, 'URL', {value: w.location.href, configurable: true});
        Object.defineProperty(d, 'documentURI', {value: w.location.href, configurable: true});
        Object.defineProperty(d, 'location', {value: w.location, writable: true, configurable: true});
        Object.defineProperty(el, '__marco', {value: d, writable: true, configurable: true});
        return d;
    }
    // (la ventana del documento de un marco es la caja del marco: su ancho y alto van al atributo "vista" del documento,
    // que lib/jsdom.dash usa para @media, vw y vh; Acid3 46 cambia el tamaño del iframe y mira las media queries)
    function marcoVista(el, d) {
        var cs = g.getComputedStyle(el), w = parseFloat(cs.width), h = parseFloat(cs.height);
        if (isNaN(w)) w = 300;
        if (isNaN(h)) h = 150;
        var v = Math.round(w) + ' ' + Math.round(h);
        if (d.__vista !== v) {
            Object.defineProperty(d, '__vista', {value: v, writable: true, configurable: true});
            N.setAttribute.call(d, 'vista', v);
        }
    }
    // (un XHTML bien formado ejecuta sus <script> del espacio de nombres de XHTML, con window, document, parent y self
    // de su marco; uno mal formado, o con otro espacio de nombres, no; Acid3 80. Los de un marco HTML no se ejecutan)
    function marcoScriptsXhtml(d, raiz) {
        var XHTML = 'http://www.w3.org/1999/xhtml';
        if (raiz.localName == 'parsererror') return;
        function ns(e) {
            for (; e && e.nodeType == 1; e = e.parentNode) {
                var v = e.getAttribute('xmlns');
                if (v !== null) return v;
            }
            return null;
        }
        var w = d.defaultView;
        Array.prototype.forEach.call(raiz.getElementsByTagName('script'), function (s) {
            if (ns(s) !== XHTML) return;
            var t = (s.getAttribute('type') || '').toLowerCase();
            if (t && t != 'text/javascript' && t != 'application/javascript') return;
            try { new Function('window', 'document', 'parent', 'self', 'top', s.textContent).call(w, w, d, g, w, g); }
            catch (e) { console.log('JS (script de un marco): ' + e); }
        });
    }
    function marcoLlenar(d, tipo, texto) {
        if (/[\/+]xml$/.test(tipo)) {
            var raiz;
            try { raiz = xmlAnalizar(d, texto); }
            catch (e) { raiz = d.createElement('parsererror'); raiz.textContent = 'XML Parsing Error: ' + e.message; }
            while (d.firstChild) d.removeChild(d.firstChild);
            d.appendChild(raiz);
            Object.defineProperty(d, 'documentElement', {value: raiz, configurable: true});
            Object.defineProperty(d, 'contentType', {value: tipo, configurable: true});
            marcoScriptsXhtml(d, raiz);
        } else if (/^text\//.test(tipo)) {
            var pre = d.createElement('pre');
            pre.textContent = texto;
            d.body.appendChild(pre);
        }
    }
    function marcoCargar(el) {
        var dir = marcoDir(el), d = marcoNuevo(el, dir);
        Object.defineProperty(el, '__marco_dir', {value: dir, writable: true, configurable: true});
        if (!dir || dir == 'about:blank') { g.setTimeout(function () { if (el.__marco === d) despachar(el, new Ev('load')); }, 0); return; }
        var url;
        try { url = new URL(dir, String(document.baseURI || location.href)).href; } catch (e) { return; }
        d.defaultView.location.href = url;
        var x = new g.XMLHttpRequest();
        x.open('GET', url);
        x.onload = function () {
            if (el.__marco !== d) return;
            var tipo = (x.getResponseHeader('content-type') || '').split(';')[0].trim().toLowerCase();
            if (x.status >= 200 && x.status < 300) {
                // (HTML: un documento nuevo con el analizador de HTML5, como el de una página; el de antes se deja)
                if (tipo == 'text/html' || tipo == '') {
                    var w = d.defaultView;
                    d = marcoNuevo(el, url, x.responseText);
                    w.document = d;
                    Object.defineProperty(d, 'defaultView', {value: w, writable: true, configurable: true});
                    // (su characterSet: el charset del Content-Type o, si no, el de su <meta>; WPT dom/nodes)
                    var cs = /;\s*charset\s*=\s*"?([^";]+)/i.exec(x.getResponseHeader('content-type') || ''), mc;
                    if (!cs) {
                        mc = d.querySelector('meta[charset]');
                        if (mc) cs = [0, mc.getAttribute('charset')];
                        else if ((mc = d.querySelector('meta[http-equiv="content-type" i]')))
                            cs = /charset\s*=\s*["']?([^"';\s]+)/i.exec(mc.getAttribute('content') || '');
                    }
                    var nc = cs && encDoc(cs[1]);
                    if (nc) ['characterSet', 'charset', 'inputEncoding'].forEach(function (k) {
                        Object.defineProperty(d, k, {value: nc, writable: true, configurable: true});
                    });
                } else marcoLlenar(d, tipo, x.responseText);
            }
            despachar(el, new Ev('load'));
        };
        x.onerror = function () { if (el.__marco === d) despachar(el, new Ev('load')); };
        x.send();
    }
    function marcosDe(n) {
        if (!n || n.nodeType != 1) return [];
        if (MARCOS[n.localName] === true) return [n];
        return Array.prototype.slice.call(n.querySelectorAll('iframe, object, frame'));
    }
    function marcoPuesto(el) {
        if (el.isConnected && el.__marco_dir !== marcoDir(el)) marcoCargar(el);
    }
    function marcoDoc(el) {
        marcoPuesto(el);
        return el.__marco || marcoNuevo(el, '');
    }
    defEn('iframe object frame', 'contentDocument', function () { return marcoDoc(this); });
    defEn('iframe object frame', 'contentWindow', function () { return marcoDoc(this).defaultView; });
    defEn('object', 'data', function () {
        var v = this.getAttribute('data');
        if (v === null) return '';
        try { return new URL(v, String(document.baseURI || location.href)).href; } catch (e) { return v; }
    }, function (v) { this.setAttribute('data', v); });
    ['iframe', 'object', 'embed', 'frame'].forEach(function (t) {
        Object.defineProperty(proto(t), 'getSVGDocument', {value: function () { return this.localName == 'embed' ? null : this.contentDocument; },
            writable: true, configurable: true});
    });
    (function () {
        ['appendChild', 'insertBefore', 'replaceChild'].forEach(function (k) {
            var orig = N[k];
            N[k] = function (nuevo) {
                var lista = nuevo && nuevo.nodeType == 11 ? Array.prototype.slice.call(nuevo.childNodes) : [nuevo];
                var r = orig.apply(this, arguments);
                if (this.isConnected) lista.forEach(function (n) { marcosDe(n).forEach(marcoPuesto); });
                return r;
            };
        });
        var poner = N.setAttribute;
        N.setAttribute = function (nombre, v) {
            var r = poner.apply(this, arguments);
            if (MARCOS[this.localName] === true && /^(src|data)$/i.test(String(nombre))) marcoPuesto(this);
            return r;
        };
    })();
    // (un nombre con prefijo, como atom:link, no es un selector: ":" sería una pseudoclase; se compara a mano)
    (function () {
        var porSelector = N.getElementsByTagName;
        N.getElementsByTagName = function (t) {
            t = String(t);
            if (!/[^\w\-*]/.test(t)) return porSelector.call(this, t);
            var b = t.toLowerCase();
            return __dashweb_coleccion(this, function (e) { return e.nodeName.toLowerCase() == b; });
        };
    })();
    function XMLSerializer() {}
    XMLSerializer.prototype.serializeToString = function (n) { return n.nodeType == 9 ? n.documentElement.outerHTML : n.outerHTML !== undefined ? n.outerHTML : n.textContent; };
    g.XMLSerializer = XMLSerializer;

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
    // (HTML: una dirección que no se analiza da SyntaxError en window.open, location y XHR.open; WPT url/failure)
    function dirValida(u, base) {
        try { return new URL(String(u), base === undefined ? String(document.baseURI || location.href) : base).href; }
        catch (e) { g.__dashweb_lanzar('SyntaxError', "Invalid URL '" + u + "'"); }
    }
    g.open = function (u) { if (u !== undefined && u !== '') dirValida(u); return null; };
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
        sendBeacon: function (u) { new URL(String(u), String(document.baseURI || location.href)); return false; },
        userAgentData: undefined
    };
    g.clientInformation = g.navigator;
    // localStorage y sessionStorage como dice HTML (tarea 41d, WPT webstorage): objetos Storage con propiedades con
    // nombre (localStorage.x = 1 lo guarda como "1"; 'x' in, delete, Object.keys...), los métodos de Storage.prototype
    // por delante de una clave del mismo nombre al leer, y un cupo (QuotaExceededError). localStorage dura: lo de su
    // origen (http y https) se trae de lib/almacen.dash la primera vez que se usa, y lo que cambia un script se le
    // da al acabar (una vez, aunque ponga mil claves; solo los cambios, en JSON y ASCII); sessionStorage, solo la
    // página.
    var ALMACEN_CUPO = 1000000;   // (caracteres, claves y valores: 2 MB; un Amiga no tiene para los 5 MB de Chrome)
    var almacenes = new WeakMap();
    function Storage() { throw new TypeError('Illegal constructor'); }
    // (lo que da lib/almacen.dash: los cambios en orden, ["k","v"] pone, ["k"] quita, [] borra; si sobran muchos, se
    // le da todo junto en su lugar)
    function almacenListo(d) {
        if (d.origen !== undefined) return d;
        d.origen = null;
        var o = g.location && g.location.origin;
        if (typeof o != 'string' || !/^https?:\/\//.test(o)) return d;
        d.origen = o;
        var t = __dashweb_almacen(o), l;
        try { l = t ? JSON.parse('[' + t + ']') : []; } catch (e) { l = []; }
        for (var i = 0; i < l.length; i++) {
            var p = l[i];
            if (!Array.isArray(p)) continue;
            if (!p.length) { d.m.clear(); d.usado = 0; }
            else if (typeof p[0] != 'string') continue;
            else if (p.length == 1) { if (d.m.has(p[0])) { d.usado -= p[0].length + d.m.get(p[0]).length; d.m.delete(p[0]); } }
            else if (typeof p[1] == 'string') {
                if (d.m.has(p[0])) d.usado -= p[0].length + d.m.get(p[0]).length;
                d.m.set(p[0], p[1]);
                d.usado += p[0].length + p[1].length;
            }
        }
        if (l.length > d.m.size + 16) {
            var r = [];
            d.m.forEach(function (v, k) { r.push(JSON.stringify([k, v])); });
            __dashweb_almacen_poner(o, almacenAscii(r.join(',')), true);
        }
        return d;
    }
    function almacenAscii(t) {
        return t.replace(/[\u007f-\uffff]/g, function (c) { return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4); });
    }
    // (de cada clave, lo último que le hizo el script: v, o null si la quitó; clear: lo de antes ya no hace falta y
    // lo de después va en su lugar. El texto, al acabar el script, una vez)
    function almacenCambio(d, k, v) {
        if (!d.origen) return;
        var primero = !d.cambios.size && !d.todo;
        if (k === null) { d.cambios.clear(); d.todo = true; }
        else d.cambios.set(k, v);
        if (!primero) return;
        Promise.resolve().then(function () {
            var r = [], todo = d.todo;
            d.cambios.forEach(function (v, k) { r.push(JSON.stringify(v === null ? [k] : [k, v])); });
            d.cambios.clear();
            d.todo = false;
            __dashweb_almacen_poner(d.origen, almacenAscii(r.join(',')), todo);
        });
    }
    function datosDe(o) {
        var d = almacenes.get(o);
        if (!d) throw new TypeError('Illegal invocation');
        return almacenListo(d);
    }
    function pide(n, a, f) { if (a.length < n) throw new TypeError("Failed to execute '" + f + "' on 'Storage': " + n + ' argument' + (n > 1 ? 's' : '') + ' required, but only ' + a.length + ' present.'); }
    function almacenPoner(d, k, v) {
        var viejo = d.m.has(k) ? d.m.get(k) : null, crece = v.length - (viejo === null ? -k.length : viejo.length);
        if (d.usado + crece > ALMACEN_CUPO) g.__dashweb_lanzar('QuotaExceededError', "Failed to execute 'setItem' on 'Storage': Setting the value of '" + k + "' exceeded the quota.");
        d.m.set(k, v);
        d.usado += crece;
        almacenCambio(d, k, v);
    }
    function almacenQuitar(d, k) {
        if (!d.m.has(k)) return;
        d.usado -= k.length + d.m.get(k).length;
        d.m.delete(k);
        almacenCambio(d, k, null);
    }
    var SP = Storage.prototype;
    SP.key = function (i) {
        pide(1, arguments, 'key');
        var d = datosDe(this), n = Number(i);
        n = isFinite(n) ? Math.trunc(n) % 4294967296 : 0;
        if (n < 0) n += 4294967296;
        if (n >= d.m.size) return null;
        var j = 0;
        for (var k of d.m.keys()) if (j++ === n) return k;
        return null;
    };
    SP.getItem = function (k) { pide(1, arguments, 'getItem'); var d = datosDe(this); k = String(k); return d.m.has(k) ? d.m.get(k) : null; };
    SP.setItem = function (k, v) { pide(2, arguments, 'setItem'); almacenPoner(datosDe(this), String(k), String(v)); };
    SP.removeItem = function (k) { pide(1, arguments, 'removeItem'); almacenQuitar(datosDe(this), String(k)); };
    SP.clear = function () { var d = datosDe(this); if (!d.m.size) return; d.m.clear(); d.usado = 0; almacenCambio(d, null); };
    Object.defineProperty(SP, 'length', {get: function () { return datosDe(this).m.size; }, configurable: true, enumerable: true});
    Object.defineProperty(SP, Symbol.toStringTag, {value: 'Storage', configurable: true});
    ['key', 'getItem', 'setItem', 'removeItem', 'clear'].forEach(function (k) {
        Object.defineProperty(SP, k, {enumerable: true});
    });
    Object.defineProperty(SP, 'constructor', {value: Storage, writable: true, configurable: true});
    g.Storage = Storage;
    function Almacen(dura) {
        var d = {m: new Map(), usado: 0, origen: dura ? undefined : null, cambios: new Map(), todo: false}, blanco = Object.create(SP);
        // (una clave se ve si no hay una propiedad con ese nombre en el objeto ni en su prototipo)
        function visible(t, p) { return typeof p == 'string' && almacenListo(d).m.has(p) && !(p in t); }
        var o = new Proxy(blanco, {
            get: function (t, p, r) { return visible(t, p) ? d.m.get(p) : Reflect.get(t, p, r); },
            set: function (t, p, v, r) {
                if (typeof p != 'string' || r !== o) return Reflect.set(t, p, v, r);
                almacenPoner(almacenListo(d), p, String(v));
                return true;
            },
            has: function (t, p) { return (typeof p == 'string' && almacenListo(d).m.has(p)) || Reflect.has(t, p); },
            deleteProperty: function (t, p) {
                if (visible(t, p)) { almacenQuitar(d, p); return true; }
                return Reflect.deleteProperty(t, p);
            },
            ownKeys: function (t) {
                var r = Array.from(almacenListo(d).m.keys());
                Reflect.ownKeys(t).forEach(function (k) { if (r.indexOf(k) < 0) r.push(k); });
                return r;
            },
            getOwnPropertyDescriptor: function (t, p) {
                if (visible(t, p)) return {value: d.m.get(p), writable: true, enumerable: true, configurable: true};
                return Reflect.getOwnPropertyDescriptor(t, p);
            },
            defineProperty: function (t, p, desc) {
                if (typeof p != 'string') return Reflect.defineProperty(t, p, desc);
                if ('get' in desc || 'set' in desc) return false;
                almacenPoner(almacenListo(d), p, String(desc.value));
                return true;
            }
        });
        almacenes.set(o, d);
        return o;
    }
    g.localStorage = Almacen(true);
    g.sessionStorage = Almacen(false);
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
    function TreeWalker(raiz, ver, filtro) { recorridoBase(this, raiz, ver, filtro); this._actual = raiz; }
    // (root, whatToShow y filter, de solo lectura; whatToShow, entero sin signo: null es 0; la raíz, un nodo: WPT
    // dom/traversal)
    function recorridoBase(r, raiz, ver, filtro) {
        if (!__dashweb_es_nodo(raiz)) throw new TypeError("Failed to execute: parameter 1 is not of type 'Node'.");
        r._raiz = raiz; r._ver = ver === undefined ? 0xFFFFFFFF : ver >>> 0; r._filtro = filtro || null;
    }
    function soloLectura(C, nombre) {
        ['root', 'whatToShow', 'filter'].forEach(function (k, i) {
            Object.defineProperty(C.prototype, k, {get: function () { return [this._raiz, this._ver, this._filtro][i]; }, configurable: true, enumerable: true});
        });
        C.prototype[Symbol.toStringTag] = nombre;
    }
    soloLectura(TreeWalker, 'TreeWalker');
    Object.defineProperty(TreeWalker.prototype, 'currentNode', {get: function () { return this._actual; }, set: function (n) {
        if (!__dashweb_es_nodo(n)) throw new TypeError("Failed to set the 'currentNode' property on 'TreeWalker': The provided value is not of type 'Node'.");
        this._actual = n;
    }, configurable: true, enumerable: true});
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
    // NodeIterator como dice DOM (tarea 41c, Acid3 1 a 3): el filtro se llama antes de mover la referencia (si lanza,
    // el iterador se queda donde estaba) y, al quitar un nodo que tiene dentro la referencia, ésta pasa al de al lado
    // ("pre-removing steps"; los iteradores vivos se apuntan con WeakRef)
    function siguienteEn(raiz, n) {
        if (n.firstChild) return n.firstChild;
        for (var t = n; t && t !== raiz; t = t.parentNode) if (t.nextSibling) return t.nextSibling;
        return null;
    }
    function anteriorEn(raiz, n) {
        if (n === raiz) return null;
        var s = n.previousSibling;
        if (s) { while (s.lastChild) s = s.lastChild; return s; }
        return n.parentNode;
    }
    var iteradores = [];
    function NodeIterator(raiz, ver, filtro) {
        recorridoBase(this, raiz, ver, filtro);
        this.referenceNode = raiz; this.pointerBeforeReferenceNode = true;
        if (typeof WeakRef == 'function') {
            iteradores = iteradores.filter(function (r) { return r.deref(); });
            iteradores.push(new WeakRef(this));
        }
    }
    // (el candidato del recorrido va en it.__cand: si el filtro quita un nodo, se mueve como la referencia, como en
    // Chrome; Acid3 2)
    function recorrer(it, siguiente) {
        var c = {ref: it.referenceNode, antes: it.pointerBeforeReferenceNode}, previo = it.__cand, nodo;
        it.__cand = c;
        try {
            for (;;) {
                if (siguiente) {
                    if (!c.antes) { c.ref = siguienteEn(it.root, c.ref); if (!c.ref) return null; }
                    else c.antes = false;
                } else {
                    if (c.antes) { c.ref = anteriorEn(it.root, c.ref); if (!c.ref) return null; }
                    else c.antes = true;
                }
                nodo = c.ref;
                if (filtrar(it, nodo) == 1) break;
            }
        } finally { it.__cand = previo; }
        // (se devuelve el que aceptó el filtro aunque él lo quitara; la referencia es el candidato ya movido)
        it.referenceNode = c.ref;
        it.pointerBeforeReferenceNode = c.antes;
        return nodo;
    }
    NodeIterator.prototype.nextNode = function () { return recorrer(this, true); };
    NodeIterator.prototype.previousNode = function () { return recorrer(this, false); };
    NodeIterator.prototype.detach = function () {};
    soloLectura(NodeIterator, 'NodeIterator');
    g.NodeIterator = NodeIterator;
    document.createNodeIterator = function (raiz, ver, filtro) { return new NodeIterator(raiz, ver, filtro); };
    // (antes de quitar n de su padre)
    function iteradoresQuitar(n) {
        iteradores.forEach(function (r) {
            var it = r.deref();
            if (!it || n === it.root) return;
            var p = {ref: it.referenceNode, antes: it.pointerBeforeReferenceNode};
            ajustarPunto(it, p, n);
            it.referenceNode = p.ref; it.pointerBeforeReferenceNode = p.antes;
            if (it.__cand) ajustarPunto(it, it.__cand, n);
        });
    }
    function ajustarPunto(it, p, n) {
        var a = p.ref;
        while (a && a !== n) a = a.parentNode;
        if (!a) return;
        if (p.antes) {
            var sig = null;
            for (var t = n; t && t !== it.root; t = t.parentNode) if (t.nextSibling) { sig = t.nextSibling; break; }
            if (sig) { p.ref = sig; return; }
            p.antes = false;
        }
        var s = n.previousSibling;
        if (s) { while (s.lastChild) s = s.lastChild; p.ref = s; }
        else p.ref = n.parentNode;
    }
    (function () {
        var quitar = N.removeChild, meter = N.appendChild, antes = N.insertBefore, cambiar = N.replaceChild;
        function mueve(n) { if (iteradores.length && n && n.parentNode) iteradoresQuitar(n); }
        N.removeChild = function (n) { if (iteradores.length && n && n.parentNode === this) iteradoresQuitar(n); return quitar.apply(this, arguments); };
        N.appendChild = function (n) { mueve(n); return meter.apply(this, arguments); };
        N.insertBefore = function (n) { mueve(n); return antes.apply(this, arguments); };
        N.replaceChild = function (n, viejo) { mueve(n); if (iteradores.length && viejo && viejo.parentNode === this) iteradoresQuitar(viejo); return cambiar.apply(this, arguments); };
    })();
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
    // === customElements de serie (tarea 38c9b) ===
    // Con él, YouTube no carga el polyfill de customElements: ese, junto a ShadyDOM, recorría dos veces lo que hay
    // dentro de una sombra (por los hijos del anfitrión y por la sombra) y su buscador recibía dos desconexiones y
    // dos conexiones (se pintaba dos veces). Aquí las reacciones salen de los appendChild, insertBefore, removeChild,
    // innerHTML... de abajo, sobre el árbol de verdad: cada elemento, una vez.
    // (__ce en cada elemento: 1 hecho, 2 fallido; sin él, aún sin mejorar)
    var ce = {n: 0, defs: Object.create(null), clases: new Map(), haciendo: null, esperas: Object.create(null)};
    function errorDom(m, n) { var e = new Error(m); e.name = n; return e; }
    function ce_llamar(f, el, args) { try { f.apply(el, args); } catch (e) { console.error(e); } }
    // n y los elementos de dentro, en orden; lo de dentro de un <template> no cuenta (es inerte)
    function ce_todos(n) {
        var t = n.nodeType;
        if (t != 1 && t != 11 && t != 9) return [];
        if (t == 1 && n.closest('template')) return [];
        var l = n.querySelectorAll('*'), hay = l.length && n.querySelector('template'), r = t == 1 ? [n] : [];
        for (var i = 0; i < l.length; i++) if (!hay || !l[i].closest('template')) r.push(l[i]);
        return r;
    }
    function ce_mejorar(el) {
        var d = el.__ce === undefined && ce.defs[el.localName];
        if (!d || d.amplia) return;
        Object.defineProperty(el, '__ce', {value: 0, writable: true, configurable: true});
        ce.haciendo = el;
        try {
            if (new d.clase() !== el) throw new TypeError('The custom element constructor did not produce the element being upgraded');
        } catch (e) { ce.haciendo = null; el.__ce = 2; console.error(e); return; }
        ce.haciendo = null;
        if (d.atributos) d.atributos.forEach(function (a) { if (el.hasAttribute(a)) ce_llamar(d.cambio, el, [a, null, el.getAttribute(a)]); });
        if (d.con && el.isConnected) ce_llamar(d.con, el, []);
    }
    // metido en el árbol (con: en el documento) o recién hecho por el analizador (frescos: innerHTML, cloneNode)
    function ce_puestos(n, con, frescos) {
        ce_todos(n).forEach(function (e) {
            if (e.__ce === undefined) { if (con || frescos) ce_mejorar(e); }
            else if (con && e.__ce === 1) { var d = ce.defs[e.localName]; if (d && d.con) ce_llamar(d.con, e, []); }
        });
    }
    // sacado del documento
    function ce_quitados(n) {
        ce_todos(n).forEach(function (e) {
            if (e.__ce !== 1) return;
            var d = ce.defs[e.localName];
            if (d && d.des) ce_llamar(d.des, e, []);
        });
    }
    function ce_atributo(el, a, viejo) {
        if (el.__ce !== 1) return;
        var d = ce.defs[el.localName];
        if (d && d.atributos && d.atributos.indexOf(a) >= 0) ce_llamar(d.cambio, el, [a, viejo, el.getAttribute(a)]);
    }
    // HTMLElement como base de una clase: super() da el elemento que se está mejorando, o uno nuevo con su etiqueta
    var crearElemento = document.createElement;
    g.HTMLElement.__construir = function (nt) {
        var d = ce.clases.get(nt), el = ce.haciendo;
        if (!d || d.amplia) throw new TypeError('Illegal constructor');
        if (el) ce.haciendo = null;
        else el = crearElemento.call(document, d.nombre);
        Object.setPrototypeOf(el, nt.prototype);
        Object.defineProperty(el, '__ce', {value: 1, writable: true, configurable: true});
        return el;
    };
    document.createElement = function (n, op) {
        var d = ce.n && ce.defs[String(n).toLowerCase()];
        if (!d || d.amplia) return crearElemento.call(this, n, op);
        try {
            var el = new d.clase();
            if (!__dashweb_es_nodo(el) || el.localName != d.nombre) throw new TypeError('The result must implement HTMLElement');
            return el;
        } catch (e) {
            console.error(e);
            el = crearElemento.call(this, n, op);
            Object.defineProperty(el, '__ce', {value: 2, writable: true, configurable: true});
            return el;
        }
    };
    function CustomElementRegistry() { throw new TypeError('Illegal constructor'); }
    var registro = Object.create(CustomElementRegistry.prototype);
    CustomElementRegistry.prototype.define = function (nombre, clase, op) {
        nombre = String(nombre);
        if (typeof clase != 'function' || !clase.prototype) throw new TypeError("Failed to execute 'define' on 'CustomElementRegistry': parameter 2 is not a constructor");
        if (!/^[a-z][^A-Z\s]*-[^A-Z\s]*$/.test(nombre)) throw errorDom('"' + nombre + '" is not a valid custom element name', 'SyntaxError');
        if (ce.defs[nombre]) throw errorDom('the name "' + nombre + '" has already been used with this registry', 'NotSupportedError');
        if (ce.clases.has(clase)) throw errorDom('this constructor has already been used with this registry', 'NotSupportedError');
        var p = clase.prototype, f = function (k) { return typeof p[k] == 'function' ? p[k] : null; };
        var d = {nombre: nombre, clase: clase, con: f('connectedCallback'), des: f('disconnectedCallback'),
                 cambio: f('attributeChangedCallback'), atributos: null};
        if (d.cambio && clase.observedAttributes) d.atributos = Array.prototype.slice.call(clase.observedAttributes).map(String);
        // (los que amplían una etiqueta, <button is="x-y">, no se mejoran: se guardan para get)
        if (op && op.extends) { d.amplia = true; ce.clases.set(clase, d); ce.defs[nombre] = d; return; }
        ce.defs[nombre] = d; ce.clases.set(clase, d); ce.n++;
        Array.prototype.slice.call(document.querySelectorAll(nombre)).forEach(function (e) {
            if (!e.closest('template')) ce_mejorar(e);
        });
        var w = ce.esperas[nombre];
        if (w) { delete ce.esperas[nombre]; w.listo(clase); }
    };
    CustomElementRegistry.prototype.get = function (nombre) { var d = ce.defs[String(nombre)]; return d ? d.clase : undefined; };
    CustomElementRegistry.prototype.getName = function (clase) { var d = ce.clases.get(clase); return d ? d.nombre : null; };
    CustomElementRegistry.prototype.whenDefined = function (nombre) {
        nombre = String(nombre);
        if (ce.defs[nombre]) return Promise.resolve(ce.defs[nombre].clase);
        if (!/^[a-z][^A-Z\s]*-[^A-Z\s]*$/.test(nombre)) return Promise.reject(errorDom('"' + nombre + '" is not a valid custom element name', 'SyntaxError'));
        var w = ce.esperas[nombre];
        if (!w) { w = ce.esperas[nombre] = {}; w.promesa = new Promise(function (r) { w.listo = r; }); }
        return w.promesa;
    };
    CustomElementRegistry.prototype.upgrade = function (n) { if (ce.n) ce_puestos(n, false, true); };
    g.CustomElementRegistry = CustomElementRegistry;
    Object.defineProperty(g, 'customElements', {value: registro, configurable: true, enumerable: true, writable: true});
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
        // (con customElements: el que se mueve desde el documento se desconecta y, si llega a él, se conecta)
        function meter(padre, c, antes, f) {
            var nuevos = c && c.nodeType == 11 ? hijos(c) : [c], a = antes ? antes.previousSibling : padre.lastChild;
            var estaba = ce.n && c && c.nodeType != 11 && c.isConnected;
            if (mo_vivos && (!c || c.nodeType != 11)) sacar(c);
            var r = f();
            if (mo_vivos && nuevos.length) mo_apuntar(padre, 'childList', function (x) { x.addedNodes = nuevos; x.previousSibling = a; x.nextSibling = antes || null; });
            if (estaba) ce_quitados(c);
            if (ce.n && padre.isConnected) nuevos.forEach(function (n) { ce_puestos(n, true); });
            return r;
        }
        N.appendChild = function (c) {
            if (!mo_vivos && !ce.n) return appendChild.call(this, c);
            var p = this; return meter(p, c, null, function () { return appendChild.call(p, c); });
        };
        N.insertBefore = function (c, antes) {
            if (!mo_vivos && !ce.n) return insertBefore.call(this, c, antes);
            var p = this; return meter(p, c, antes, function () { return insertBefore.call(p, c, antes); });
        };
        N.removeChild = function (c) {
            if (!mo_vivos && !ce.n) return removeChild.call(this, c);
            var a = c.previousSibling, s = c.nextSibling, estaba = ce.n && c.isConnected, r = removeChild.call(this, c);
            if (mo_vivos) mo_apuntar(this, 'childList', function (x) { x.removedNodes = [c]; x.previousSibling = a; x.nextSibling = s; });
            if (estaba) ce_quitados(c);
            return r;
        };
        N.replaceChild = function (n, viejo) {
            if (!mo_vivos && !ce.n) return replaceChild.call(this, n, viejo);
            var a = viejo.previousSibling, s = viejo.nextSibling, nuevos = n.nodeType == 11 ? hijos(n) : [n];
            var estaban = ce.n ? [viejo, n].filter(function (x) { return x.nodeType != 11 && x.isConnected; }) : [];
            if (mo_vivos && n.nodeType != 11 && n !== viejo) sacar(n);
            var r = replaceChild.call(this, n, viejo);
            if (mo_vivos) mo_apuntar(this, 'childList', function (x) { x.addedNodes = nuevos; x.removedNodes = [viejo]; x.previousSibling = a; x.nextSibling = s; });
            estaban.forEach(ce_quitados);
            if (ce.n && this.isConnected) nuevos.forEach(function (x) { ce_puestos(x, true); });
            return r;
        };
        N.setAttribute = function (nombre, v) {
            if (!mo_vivos && !ce.n) return setAttribute.call(this, nombre, v);
            nombre = String(nombre).toLowerCase();
            var viejo = this.getAttribute(nombre), r = setAttribute.call(this, nombre, v);
            if (mo_vivos) mo_apuntar(this, 'attributes', function () {}, nombre, viejo);
            if (ce.n) ce_atributo(this, nombre, viejo);
            return r;
        };
        N.removeAttribute = function (nombre) {
            if (!mo_vivos && !ce.n || !this.hasAttribute(nombre)) return removeAttribute.call(this, nombre);
            nombre = String(nombre).toLowerCase();
            var viejo = this.getAttribute(nombre), r = removeAttribute.call(this, nombre);
            if (mo_vivos) mo_apuntar(this, 'attributes', function () {}, nombre, viejo);
            if (ce.n) ce_atributo(this, nombre, viejo);
            return r;
        };
        // las propiedades de C que cambian el árbol, el texto o un atributo
        // (una sola capa por propiedad, que la pila no da para muchas: aquí también lo del prototipo de una clase y que
        // innerHTML en un <template> sustituye su contenido)
        function envolver(prop, hacer, en) {
            en = en || N;
            if (en === N && !Object.getOwnPropertyDescriptor(N, prop)) {
                // (lo que está en los prototipos del texto y los comentarios: data)
                envolver(prop, hacer, proto('#text'));
                envolver(prop, hacer, proto('#comment'));
                return;
            }
            var d = Object.getOwnPropertyDescriptor(en, prop);
            if (!d || !d.set) return;
            var poner = function (v) {
                if (!__dashweb_es_nodo(this)) { Object.defineProperty(this, prop, {value: v, writable: true, enumerable: true, configurable: true}); return; }
                if (prop == 'innerHTML' && this.__contenido && this.localName == 'template') while (this.__contenido.firstChild) this.__contenido.removeChild(this.__contenido.firstChild);
                if (!mo_vivos && !ce.n) return d.set.call(this, v);
                hacer(this, v, d);
            };
            poner.__seguro = true;
            Object.defineProperty(en, prop, {get: d.get, configurable: true, enumerable: d.enumerable, set: poner});
        }
        function contenido(n, v, d) {
            if (n.nodeType == 3 || n.nodeType == 8) { texto(n, v, d); return; }
            var quitados = hijos(n), estaba = ce.n && n.isConnected;
            d.set.call(n, v);
            var puestos = hijos(n);
            if (mo_vivos && (quitados.length || puestos.length))
                mo_apuntar(n, 'childList', function (x) { x.removedNodes = quitados; x.addedNodes = puestos; });
            // (lo que hace el analizador se mejora aunque no esté en el documento)
            if (estaba) quitados.forEach(ce_quitados);
            if (ce.n) puestos.forEach(function (x) { ce_puestos(x, estaba, true); });
        }
        function texto(n, v, d) {
            var viejo = n.data;
            d.set.call(n, v);
            if (mo_vivos) mo_apuntar(n, 'characterData', function () {}, null, viejo);
        }
        envolver('innerHTML', contenido);
        envolver('textContent', contenido);
        envolver('data', texto);
        envolver('nodeValue', texto);
        [['id', 'id'], ['className', 'class']].forEach(function (p) {
            envolver(p[0], function (n, v, d) {
                var viejo = n.getAttribute(p[1]);
                d.set.call(n, v);
                if (mo_vivos) mo_apuntar(n, 'attributes', function () {}, p[1], viejo);
                if (ce.n) ce_atributo(n, p[1], viejo);
            });
        });
    })();
    // (los que avisan al MutationObserver, para append, before, remove...)
    prim.ins = N.insertBefore; prim.rem = N.removeChild;

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
    // (WHATWG Encoding: las etiquetas de lo que se sabe leer, de encodings.json)
    var ENC_ETIQUETAS = {"866":"ibm866","unicode-1-1-utf-8":"utf-8","unicode11utf8":"utf-8","unicode20utf8":"utf-8","utf-8":"utf-8","utf8":"utf-8","x-unicode20utf8":"utf-8","cp866":"ibm866","csibm866":"ibm866","ibm866":"ibm866","csisolatin2":"iso-8859-2","iso-8859-2":"iso-8859-2","iso-ir-101":"iso-8859-2","iso8859-2":"iso-8859-2","iso88592":"iso-8859-2","iso_8859-2":"iso-8859-2","iso_8859-2:1987":"iso-8859-2","l2":"iso-8859-2","latin2":"iso-8859-2","csisolatin3":"iso-8859-3","iso-8859-3":"iso-8859-3","iso-ir-109":"iso-8859-3","iso8859-3":"iso-8859-3","iso88593":"iso-8859-3","iso_8859-3":"iso-8859-3","iso_8859-3:1988":"iso-8859-3","l3":"iso-8859-3","latin3":"iso-8859-3","csisolatin4":"iso-8859-4","iso-8859-4":"iso-8859-4","iso-ir-110":"iso-8859-4","iso8859-4":"iso-8859-4","iso88594":"iso-8859-4","iso_8859-4":"iso-8859-4","iso_8859-4:1988":"iso-8859-4","l4":"iso-8859-4","latin4":"iso-8859-4","csisolatincyrillic":"iso-8859-5","cyrillic":"iso-8859-5","iso-8859-5":"iso-8859-5","iso-ir-144":"iso-8859-5","iso8859-5":"iso-8859-5","iso88595":"iso-8859-5","iso_8859-5":"iso-8859-5","iso_8859-5:1988":"iso-8859-5","arabic":"iso-8859-6","asmo-708":"iso-8859-6","csiso88596e":"iso-8859-6","csiso88596i":"iso-8859-6","csisolatinarabic":"iso-8859-6","ecma-114":"iso-8859-6","iso-8859-6":"iso-8859-6","iso-8859-6-e":"iso-8859-6","iso-8859-6-i":"iso-8859-6","iso-ir-127":"iso-8859-6","iso8859-6":"iso-8859-6","iso88596":"iso-8859-6","iso_8859-6":"iso-8859-6","iso_8859-6:1987":"iso-8859-6","csisolatingreek":"iso-8859-7","ecma-118":"iso-8859-7","elot_928":"iso-8859-7","greek":"iso-8859-7","greek8":"iso-8859-7","iso-8859-7":"iso-8859-7","iso-ir-126":"iso-8859-7","iso8859-7":"iso-8859-7","iso88597":"iso-8859-7","iso_8859-7":"iso-8859-7","iso_8859-7:1987":"iso-8859-7","sun_eu_greek":"iso-8859-7","csiso88598e":"iso-8859-8","csisolatinhebrew":"iso-8859-8","hebrew":"iso-8859-8","iso-8859-8":"iso-8859-8","iso-8859-8-e":"iso-8859-8","iso-ir-138":"iso-8859-8","iso8859-8":"iso-8859-8","iso88598":"iso-8859-8","iso_8859-8":"iso-8859-8","iso_8859-8:1988":"iso-8859-8","visual":"iso-8859-8","csisolatin6":"iso-8859-10","iso-8859-10":"iso-8859-10","iso-ir-157":"iso-8859-10","iso8859-10":"iso-8859-10","iso885910":"iso-8859-10","l6":"iso-8859-10","latin6":"iso-8859-10","iso-8859-13":"iso-8859-13","iso8859-13":"iso-8859-13","iso885913":"iso-8859-13","iso-8859-14":"iso-8859-14","iso8859-14":"iso-8859-14","iso885914":"iso-8859-14","csisolatin9":"iso-8859-15","iso-8859-15":"iso-8859-15","iso8859-15":"iso-8859-15","iso885915":"iso-8859-15","iso_8859-15":"iso-8859-15","l9":"iso-8859-15","iso-8859-16":"iso-8859-16","cskoi8r":"koi8-r","koi":"koi8-r","koi8":"koi8-r","koi8-r":"koi8-r","koi8_r":"koi8-r","koi8-ru":"koi8-u","koi8-u":"koi8-u","csmacintosh":"macintosh","mac":"macintosh","macintosh":"macintosh","x-mac-roman":"macintosh","dos-874":"windows-874","iso-8859-11":"windows-874","iso8859-11":"windows-874","iso885911":"windows-874","tis-620":"windows-874","windows-874":"windows-874","cp1250":"windows-1250","windows-1250":"windows-1250","x-cp1250":"windows-1250","cp1251":"windows-1251","windows-1251":"windows-1251","x-cp1251":"windows-1251","ansi_x3.4-1968":"windows-1252","ascii":"windows-1252","cp1252":"windows-1252","cp819":"windows-1252","csisolatin1":"windows-1252","ibm819":"windows-1252","iso-8859-1":"windows-1252","iso-ir-100":"windows-1252","iso8859-1":"windows-1252","iso88591":"windows-1252","iso_8859-1":"windows-1252","iso_8859-1:1987":"windows-1252","l1":"windows-1252","latin1":"windows-1252","us-ascii":"windows-1252","windows-1252":"windows-1252","x-cp1252":"windows-1252","cp1253":"windows-1253","windows-1253":"windows-1253","x-cp1253":"windows-1253","cp1254":"windows-1254","csisolatin5":"windows-1254","iso-8859-9":"windows-1254","iso-ir-148":"windows-1254","iso8859-9":"windows-1254","iso88599":"windows-1254","iso_8859-9":"windows-1254","iso_8859-9:1989":"windows-1254","l5":"windows-1254","latin5":"windows-1254","windows-1254":"windows-1254","x-cp1254":"windows-1254","cp1255":"windows-1255","windows-1255":"windows-1255","x-cp1255":"windows-1255","cp1256":"windows-1256","windows-1256":"windows-1256","x-cp1256":"windows-1256","cp1257":"windows-1257","windows-1257":"windows-1257","x-cp1257":"windows-1257","cp1258":"windows-1258","windows-1258":"windows-1258","x-cp1258":"windows-1258","x-mac-cyrillic":"x-mac-cyrillic","x-mac-ukrainian":"x-mac-cyrillic","unicodefffe":"utf-16be","utf-16be":"utf-16be","csunicode":"utf-16le","iso-10646-ucs-2":"utf-16le","ucs-2":"utf-16le","unicode":"utf-16le","unicodefeff":"utf-16le","utf-16":"utf-16le","utf-16le":"utf-16le","x-user-defined":"x-user-defined"};
    // (las etiquetas de lo que no se sabe leer, para characterSet: nombre:etiquetas;...; se abren al usarlas)
    var ENC_MAS = 'ISO-8859-8-I:csiso88598i,iso-8859-8-i,logical;GBK:chinese,csgb2312,csiso58gb231280,gb2312,gb_2312,gb_2312-80,gbk,iso-ir-58,x-gbk;gb18030:gb18030;Big5:big5,big5-hkscs,cn-big5,csbig5,x-x-big5;EUC-JP:cseucpkdfmtjapanese,euc-jp,x-euc-jp;ISO-2022-JP:csiso2022jp,iso-2022-jp;Shift_JIS:csshiftjis,ms932,ms_kanji,shift-jis,shift_jis,sjis,windows-31j,x-sjis;EUC-KR:cseuckr,csksc56011987,euc-kr,iso-ir-149,korean,ks_c_5601-1987,ks_c_5601-1989,ksc5601,ksc_5601,windows-949;replacement:csiso2022kr,hz-gb-2312,iso-2022-cn,iso-2022-cn-ext,iso-2022-kr,replacement', encMas = null;
    // El characterSet de un documento por la etiqueta de su Content-Type o de su <meta charset> (Encoding, "get an
    // encoding"; HTML: UTF-16 da UTF-8 y x-user-defined windows-1252); null si no es ninguna
    function encDoc(et) {
        var t = String(et).replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase(), n = null;
        if (Object.prototype.hasOwnProperty.call(ENC_ETIQUETAS, t)) {
            n = ENC_ETIQUETAS[t];
            if (/^(utf|ibm|iso|koi)/.test(n)) n = n.toUpperCase();
        } else {
            if (!encMas) {
                encMas = Object.create(null);
                ENC_MAS.split(';').forEach(function (q) { var p = q.split(':'); p[1].split(',').forEach(function (l) { encMas[l] = p[0]; }); });
            }
            n = encMas[t] || null;
        }
        if (n == 'UTF-16BE' || n == 'UTF-16LE') n = 'UTF-8';
        if (n == 'x-user-defined') n = 'windows-1252';
        return n;
    }
    // (las tablas de un byte, de indexes.json, comprimidas: cada código en base 36, "+k" los k siguientes de uno en uno,
    // "-" sin carácter; se abren la primera vez que se usan: de 26 a 6 KB de preludio, tarea 61)
    var ENC_UN_BYTE = {
        "ibm866": 'sw,+1b,7f5,+2,7b6,7c4,7dt,7du,7di,7dh,7dv,7dd,7dj,7dp,7do,7dn,7bk,7bo,7ck,7cc,7bw,7b4,7cs,7dq,7dr,7dm,7dg,7e1,7dy,7ds,7dc,7e4,7dz,7e0,7dw,7dx,7dl,7dk,7de,7df,7e3,7e2,7bs,7bg,7ew,7es,7f0,7f4,7eo,u8,+f,sh,up,sk,us,sn,uv,su,v2,4w,6qh,53,6qi,6ja,4k,7fk,4g',
        "iso-8859-2": '3k,+w,78,k8,8x,4k,8t,9m,4n,4o,9s,9q,9w,ah,4t,al,aj,4w,79,kb,8y,50,8u,9n,jr,54,9t,9r,9x,ai,kd,am,ak,9g,5d,5e,76,5g,8p,7a,5j,7g,5l,7s,5n,7u,5p,5q,7i,7k,8z,93,5v,5w,9c,5y,5z,9k,a6,62,a8,64,65,9u,67,9h,69,6a,77,6c,8q,7b,6f,7h,6h,7t,6j,7v,6l,6m,7j,7l,90,94,6r,6s,9d,6u,6v,9l,a7,6y,a9,70,71,9v,k9',
        "iso-8859-3": '3k,+w,86,k8,4j,4k,-,84,4n,4o,8g,9q,7y,8k,4t,-,aj,4w,87,4y,+3,85,53,54,8h,9r,7z,8l,59,-,ak,5c,+2,-,5g,7e,7c,5j,+8,-,5t,+3,80,5y,5z,7w,61,+3,a4,9o,67,+3,-,6c,7f,7d,6f,+8,-,6p,+3,81,6u,6v,7x,6x,+3,a5,9p,k9',
        "iso-8859-4": '3k,+w,78,8o,9i,4k,88,8r,4n,4o,9s,7m,82,9y,4t,al,4v,4w,79,kb,9j,50,89,8s,jr,54,9t,7n,83,9z,96,am,97,74,5d,+5,8e,7g,5l,7s,5n,7q,5p,5q,8a,7k,91,98,8m,5w,+4,aa,62,+2,a0,a2,67,75,69,+5,8f,7h,6h,7t,6j,7r,6l,6m,8b,7l,92,99,8n,6s,+4,ab,6y,+2,a1,a3,k9',
        "iso-8859-5": '3k,+w,sh,+b,4t,su,+1t,6ja,up,+b,4n,v2,v3',
        "iso-8859-6": '3k,+w,-,-,-,4k,-,-,-,-,-,-,-,170,4t,-,-,-,-,-,-,-,-,-,-,-,-,-,17f,-,-,-,17j,-,17l,+p,-,-,-,-,-,18g,+i,-,-,-,-,-,-,-,-,-,-,-,-,-',
        "iso-8859-7": '3k,+w,6c8,6c9,4j,6gc,6gf,4m,+3,oq,4r,+2,-,6c5,4w,+3,p0,+2,53,p4,+2,57,p8,59,pa,+j,-,pv,+17,-',
        "iso-8859-8": '3k,+w,-,4i,+7,5z,4r,+e,6v,57,+3,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,-,6c7,15c,+q,-,-,6by,6bz,-',
        "iso-8859-10": '3k,+w,78,7m,82,8a,88,8m,4n,8r,7k,9s,9y,al,4t,a2,96,4w,79,7n,83,8b,89,8n,53,8s,7l,9t,9z,am,6c5,a3,97,74,5d,+5,8e,7g,5l,7s,5n,7q,5p,+3,91,98,5v,+3,a0,60,aa,62,+5,75,69,+5,8f,7h,6h,7t,6j,7r,6l,+3,92,99,6r,+3,a1,6w,ab,6y,+4,8o',
        "iso-8859-13": '3k,+w,6cd,4i,+2,6ce,4m,4n,60,4p,9i,4r,+3,5i,4w,+3,6cc,51,+2,6w,55,9j,57,+3,6e,78,8e,74,7a,5g,5h,7s,7m,7g,5l,ah,7q,82,8m,8a,8r,9s,8z,91,5v,98,5x,+2,aa,8x,9m,a2,64,aj,al,67,79,8f,75,7b,6c,6d,7t,7n,7h,6h,ai,7r,83,8n,8b,8s,9t,90,92,6r,99,6t,+2,ab,8y,9n,a3,70,ak,am,6c9',
        "iso-8859-14": '3k,+w,5xe,5xf,4j,7e,7f,5xm,4n,60w,4p,60y,5xn,642,4t,4u,ag,5y6,5y7,80,81,5z4,5z5,52,5zq,60x,5zr,60z,600,643,610,611,601,5c,+f,ac,5t,+5,60a,60,+5,ae,67,+g,ad,6p,+5,60b,6w,+5,af,73',
        "iso-8859-15": '3k,+z,6gc,4l,9s,4n,9t,4p,+a,al,51,+2,am,55,+2,9e,9f,ag,5b,+1s',
        "iso-8859-16": '3k,+w,78,79,8x,6gc,6ce,9s,4n,9t,4p,ew,4r,ah,4t,ai,aj,4w,4x,7g,8y,al,6cd,52,53,am,7h,ex,57,9e,9f,ag,ak,5c,+2,76,5g,7a,5i,+9,7k,8z,5u,+2,9c,5y,9m,a8,61,+3,7s,ey,67,+3,77,6c,7b,6e,+9,7l,90,6q,+2,9d,6u,9n,a9,6x,+3,7t,ez,73',
        "koi8-r": '7b4,7b6,7bg,7bk,7bo,7bs,7bw,7c4,7cc,7ck,7cs,7eo,7es,7ew,7f0,7f4,+3,6xs,7fk,6qh,6qi,6rs,6sk,6sl,4g,6xt,4w,4y,53,6v,7dc,+2,up,7df,+e,sh,7du,+a,4p,um,ts,tt,ue,tw,tx,uc,tv,ud,u0,+7,un,u8,+3,ty,tu,uk,uj,tz,ug,ul,uh,uf,ui,tq,sw,sx,ti,t0,t1,tg,sz,th,t4,+7,tr,tc,+3,t2,sy,to,tn,t3,tk,tp,tl,tj,tm',
        "koi8-u": '7b4,7b6,7bg,7bk,7bo,7bs,7bw,7c4,7cc,7ck,7cs,7eo,7es,7ew,7f0,7f4,+3,6xs,7fk,6qh,6qi,6rs,6sk,6sl,4g,6xt,4w,4y,53,6v,7dc,+2,up,us,7dg,uu,uv,7dj,+4,wh,v2,7dq,+3,sh,sk,7dv,sm,sn,7dy,+4,wg,su,4p,um,ts,tt,ue,tw,tx,uc,tv,ud,u0,+7,un,u8,+3,ty,tu,uk,uj,tz,ug,ul,uh,uf,ui,tq,sw,sx,ti,t0,t1,tg,sz,th,t4,+7,tr,tc,+3,t2,sy,to,tn,t3,tk,tp,tl,tj,tm',
        "macintosh": '5g,5h,5j,5l,5t,5y,64,69,68,6a,6c,6b,6d,6f,6h,6g,6i,6j,6l,6k,6m,6n,6p,6r,6q,6s,6u,6t,6y,6x,6z,70,6cg,4w,4i,4j,4n,6ci,52,67,4u,4p,6jm,50,4o,6sg,5i,60,6qm,4x,6sk,6sl,4l,51,6pu,6q9,6q7,qo,6qz,4q,56,q1,6e,6w,5b,4h,4s,6qi,b6,6rs,6py,4r,57,6cm,4g,5c,5f,5x,9e,9f,6c3,6c4,6cc,6cd,6c8,6c9,6v,7gq,73,ag,6dg,6gc,6d5,6d6,1dkx,1dky,6ch,53,6ca,6ce,6cw,5e,5m,5d,5n,5k,5p,+2,5o,5v,5w,1d6n,5u,62,63,61,8h,jq,kc,4v,k8,+2,54,kd,kb,jr',
        "windows-874": '6gc,3l,+3,6cm,3q,+a,6c8,6c9,6cc,6cd,6ci,6c3,6c4,48,+8,2rl,+1l,-,-,-,-,2tb,+s,-,-,-,-',
        "windows-1250": '6gc,3l,6ca,3n,6ce,6cm,6cg,6ch,3s,6cw,9s,6d5,9m,9w,al,ah,40,6c8,6c9,6cc,6cd,6ci,6c3,6c4,48,6jm,9t,6d6,9n,9x,am,ai,4g,jr,k8,8x,4k,78,4m,+3,9q,4r,+3,aj,4w,4x,kb,8y,50,+4,79,9r,57,8t,kd,8u,ak,9g,5d,5e,76,5g,8p,7a,5j,7g,5l,7s,5n,7u,5p,5q,7i,7k,8z,93,5v,5w,9c,5y,5z,9k,a6,62,a8,64,65,9u,67,9h,69,6a,77,6c,8q,7b,6f,7h,6h,7t,6j,7v,6l,6m,7j,7l,90,94,6r,6s,9d,6u,6v,9l,a7,6y,a9,70,71,9v,k9',
        "windows-1251": 'si,sj,6ca,ur,6ce,6cm,6cg,6ch,6gc,6cw,sp,6d5,sq,ss,sr,sv,uq,6c8,6c9,6cc,6cd,6ci,6c3,6c4,48,6jm,ux,6d6,uy,v0,uz,v3,4g,su,v2,so,4k,wg,4m,4n,sh,4p,sk,4r,+3,sn,4w,4x,sm,uu,wh,51,+2,up,6ja,us,57,uw,sl,ut,uv,sw,+1r',
        "windows-1252": '6gc,3l,6ca,b6,6ce,6cm,6cg,6ch,jq,6cw,9s,6d5,9e,3x,al,3z,40,6c8,6c9,6cc,6cd,6ci,6c3,6c4,kc,6jm,9t,6d6,9f,4d,am,ag,4g,+2n',
        "windows-1253": '6gc,3l,6ca,b6,6ce,6cm,6cg,6ch,3s,6cw,3u,6d5,3w,+4,6c8,6c9,6cc,6cd,6ci,6c3,6c4,48,6jm,4a,6d6,4c,+4,p1,p2,4j,+6,-,4r,+3,6c5,4w,+3,p0,51,+2,p4,+2,57,p8,59,pa,+j,-,pv,+17,-',
        "windows-1254": '6gc,3l,6ca,b6,6ce,6cm,6cg,6ch,jq,6cw,9s,6d5,9e,3x,+3,6c8,6c9,6cc,6cd,6ci,6c3,6c4,kc,6jm,9t,6d6,9f,4d,4e,ag,4g,+1b,7y,5t,+b,8g,9q,67,+g,7z,6p,+b,8h,9r,73',
        "windows-1255": '6gc,3l,6ca,b6,6ce,6cm,6cg,6ch,jq,6cw,3u,6d5,3w,+4,6c8,6c9,6cc,6cd,6ci,6c3,6c4,kc,6jm,4a,6d6,4c,+7,6ga,4l,+4,5z,4r,+e,6v,57,+4,14g,+j,168,+4,-,-,-,-,-,-,-,15c,+q,-,-,6by,6bz,-',
        "windows-1256": '6gc,1a6,6ca,b6,6ce,6cm,6cg,6ch,jq,6cw,1a1,6d5,9e,1ae,1aw,1ag,1bj,6c8,6c9,6cc,6cd,6ci,6c3,6c4,1bd,6jm,1ap,6d6,9f,6bw,6bx,1bu,4g,170,4i,+7,1by,4r,+e,17f,57,+3,17j,1c1,17l,+l,5z,187,+3,18g,+3,68,18k,6a,18l,+3,6f,+4,18p,18q,6m,6n,18r,+3,6s,18v,18w,6v,18x,6x,18y,6z,70,6by,6bz,1ci',
        "windows-1257": '6gc,3l,6ca,3n,6ce,6cm,6cg,6ch,3s,6cw,3u,6d5,3w,4o,jr,54,40,6c8,6c9,6cc,6cd,6ci,6c3,6c4,48,6jm,4a,6d6,4c,4v,kb,4f,4g,-,4i,+2,-,4m,4n,60,4p,9i,4r,+3,5i,4w,+7,6w,55,9j,57,+3,6e,78,8e,74,7a,5g,5h,7s,7m,7g,5l,ah,7q,82,8m,8a,8r,9s,8z,91,5v,98,5x,+2,aa,8x,9m,a2,64,aj,al,67,79,8f,75,7b,6c,6d,7t,7n,7h,6h,ai,7r,83,8n,8b,8s,9t,90,92,6r,99,6t,+2,ab,8y,9n,a3,70,ak,am,k9',
        "windows-1258": '6gc,3l,6ca,b6,6ce,6cm,6cg,6ch,jq,6cw,3u,6d5,9e,3x,+3,6c8,6c9,6cc,6cd,6ci,6c3,6c4,kc,6jm,4a,6d6,9f,4d,4e,ag,4g,+y,76,5g,+7,lc,5p,+2,7k,5t,ll,5v,5w,bk,5y,+6,bz,lf,67,+3,77,6c,+7,ld,6l,+2,7l,6p,mb,6r,6s,bl,6u,+6,c0,6gb,73',
        "x-mac-cyrillic": 'sw,+v,6cg,4w,wg,4j,4n,6ci,52,sm,4u,4p,6jm,si,uq,6sg,sj,ur,6qm,4x,6sk,6sl,uu,51,wh,so,sk,us,sn,uv,sp,ux,sq,uy,uw,sl,4s,6qi,b6,6rs,6py,4r,57,6cm,4g,sr,uz,ss,v0,ut,6c3,6c4,6cc,6cd,6c8,6c9,6v,6ce,su,v2,sv,v3,6ja,sh,up,un,ts,+u,6gc'
    };
    var encTablas = {};
    function encTabla(nombre) {
        if (encTablas[nombre] !== undefined) return encTablas[nombre];
        var c = ENC_UN_BYTE[nombre];
        if (c === undefined) return (encTablas[nombre] = null);
        var r = [], f = c.split(',');
        for (var i = 0; i < f.length; i++) {
            var x = f[i];
            if (x === '-') r.push(0xFFFF);
            else if (x.charAt(0) === '+') { var k = parseInt(x.slice(1), 36), u = r[r.length - 1]; for (var q = 1; q <= k; q++) r.push(u + q); }
            else r.push(parseInt(x, 36));
        }
        return (encTablas[nombre] = String.fromCharCode.apply(null, r));
    }
    // (las de varios bytes de Asia, la "replacement" y las que no son, RangeError: no se saben leer)
    function TextDecoder(etiqueta, o) {
        var t = String(etiqueta === undefined ? 'utf-8' : etiqueta).replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase();
        var e = Object.prototype.hasOwnProperty.call(ENC_ETIQUETAS, t) ? ENC_ETIQUETAS[t] : null;
        if (!e) throw new RangeError("Failed to construct 'TextDecoder': The encoding label provided ('" + etiqueta + "') is invalid.");
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
        var tabla = encTabla(this.encoding);
        if (tabla) {
            // (las de un byte: lo de 0x80 a 0xFF, de su tabla; donde no hay nada, U+FFFD o error con fatal)
            for (; i < n; i++) {
                var x = b[i];
                if (x < 0x80) poner(x);
                else { var y = tabla.charCodeAt(x - 0x80); if (y === 0xFFFF) malo(); else poner(y); }
            }
        } else if (this.encoding === 'x-user-defined') {
            for (; i < n; i++) poner(b[i] < 0x80 ? b[i] : 0xF780 + b[i] - 0x80);
        } else if (this.encoding === 'utf-16le' || this.encoding === 'utf-16be') {
            var be = this.encoding === 'utf-16be', alto = -1;
            if (!this.ignoreBOM && !this._empezado && n >= 2 && b[0] === (be ? 0xFE : 0xFF) && b[1] === (be ? 0xFF : 0xFE)) i = 2;
            for (; i + 1 < n; i += 2) {
                var u16 = be ? b[i] << 8 | b[i + 1] : b[i] | b[i + 1] << 8;
                // (los suplentes, por pares; uno suelto es un error)
                if (alto >= 0) {
                    if (u16 >= 0xDC00 && u16 <= 0xDFFF) { poner(alto); poner(u16); alto = -1; continue; }
                    alto = -1; malo();
                }
                if (u16 >= 0xD800 && u16 <= 0xDBFF) alto = u16;
                else if (u16 >= 0xDC00 && u16 <= 0xDFFF) malo();
                else poner(u16);
            }
            // (lo que queda a medias: para el trozo siguiente con stream; si no, un solo error, como el estándar)
            if (alto >= 0 || i < n) {
                if (seguir) this._resto = b.slice(alto >= 0 ? i - 2 : i);
                else malo();
            }
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

    // URL y URLSearchParams (WHATWG URL, lo que usan las webs; tarea 37a2: el runtime de Turbopack los necesita).
    // Desde la 41d, la máquina de estados del estándar (WPT urltestdata 896/896 y setters 278/278 en node)
    // === URL de WHATWG (tarea 41d): la máquina de estados del estándar (url.spec.whatwg.org, "basic URL parser") ===
    // Un registro: {scheme, username, password, host (null o el texto ya serializado), port (null o número), path
    // (lista, o texto si es opaco), query (null o texto), fragment (null o texto)}
    var URL_ESPECIALES = {'ftp:': 21, 'file:': null, 'http:': 80, 'https:': 443, 'ws:': 80, 'wss:': 443};
    function urlEspecial(esquema) { return Object.prototype.hasOwnProperty.call(URL_ESPECIALES, esquema + ':'); }
    function urlPuertoDe(esquema) { var p = URL_ESPECIALES[esquema + ':']; return p === undefined ? null : p; }
    // los conjuntos de percent-encode, como funciones de un código
    function pcC0(c) { return c < 0x20 || c > 0x7e; }
    function pcFragmento(c) { return pcC0(c) || c == 0x20 || c == 0x22 || c == 0x3c || c == 0x3e || c == 0x60; }
    function pcConsulta(c) { return pcC0(c) || c == 0x20 || c == 0x22 || c == 0x23 || c == 0x3c || c == 0x3e; }
    function pcConsultaEsp(c) { return pcConsulta(c) || c == 0x27; }
    function pcRuta(c) { return pcConsulta(c) || c == 0x3f || c == 0x5e || c == 0x60 || c == 0x7b || c == 0x7d; }
    function pcUsuario(c) {
        return pcRuta(c) || c == 0x2f || c == 0x3a || c == 0x3b || c == 0x3d || c == 0x40 || (c >= 0x5b && c <= 0x5d) || c == 0x7c;
    }
    function pcComponente(c) { return pcUsuario(c) || (c >= 0x24 && c <= 0x26) || c == 0x2b || c == 0x2c; }
    function pcFormulario(c) { return pcComponente(c) || c == 0x21 || (c >= 0x27 && c <= 0x29) || c == 0x7e; }
    var HEX = '0123456789ABCDEF';
    function urlBytes(cp) {
        if (cp < 0x80) return [cp];
        if (cp < 0x800) return [0xc0 | cp >> 6, 0x80 | cp & 63];
        if (cp < 0x10000) return [0xe0 | cp >> 12, 0x80 | cp >> 6 & 63, 0x80 | cp & 63];
        return [0xf0 | cp >> 18, 0x80 | cp >> 12 & 63, 0x80 | cp >> 6 & 63, 0x80 | cp & 63];
    }
    // un código (los sustitutos sueltos, como U+FFFD) con percent-encode si está en el conjunto
    function urlPc(cp, en) {
        if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
        if (!en(cp)) return String.fromCodePoint(cp);
        var b = urlBytes(cp), r = '';
        for (var i = 0; i < b.length; i++) r += '%' + HEX[b[i] >> 4] + HEX[b[i] & 15];
        return r;
    }
    function urlPcTexto(s, en) {
        var r = '';
        for (var i = 0; i < s.length; i++) {
            var c = s.codePointAt(i);
            if (c > 0xffff) i++;
            r += c < 0x80 && !en(c) ? s[i] : urlPc(c, en);
        }
        return r;
    }
    function esHex(c) { return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102); }
    // percent-decode a bytes y de vuelta a texto en UTF-8 (lo que no es UTF-8 válido, U+FFFD)
    function urlDecodificar(s) {
        var b = [];
        for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c == 37 && i + 2 < s.length && esHex(s.charCodeAt(i + 1)) && esHex(s.charCodeAt(i + 2))) {
                b.push(parseInt(s.substr(i + 1, 2), 16));
                i += 2;
            } else {
                var cp = s.codePointAt(i);
                if (cp > 0xffff) i++;
                b.push.apply(b, urlBytes(cp >= 0xd800 && cp <= 0xdfff ? 0xfffd : cp));
            }
        }
        return urlUtf8(b);
    }
    function urlUtf8(b) {
        var r = '', i = 0;
        while (i < b.length) {
            var x = b[i], n = x < 0x80 ? 0 : x >= 0xc2 && x <= 0xdf ? 1 : x >= 0xe0 && x <= 0xef ? 2 : x >= 0xf0 && x <= 0xf4 ? 3 : -1;
            if (n < 0) { r += '\ufffd'; i++; continue; }
            var cp = n ? x & (0x3f >> n) : x, ok = true, j;
            for (j = 1; j <= n; j++) {
                var y = b[i + j];
                var lo = 0x80, hi = 0xbf;
                if (j == 1) {
                    if (x == 0xe0) lo = 0xa0; else if (x == 0xed) hi = 0x9f; else if (x == 0xf0) lo = 0x90; else if (x == 0xf4) hi = 0x8f;
                }
                if (y === undefined || y < lo || y > hi) { ok = false; break; }
                cp = cp << 6 | y & 0x3f;
            }
            if (!ok) { r += '\ufffd'; i += j; continue; }
            r += String.fromCodePoint(cp);
            i += n + 1;
        }
        return r;
    }
    // Punycode (RFC 3492) de una etiqueta: "тест" -> "e1aybc"
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
    // De Punycode a texto (para comprobar las etiquetas "xn--"); null si no vale
    function urlDePunycode(s) {
        var n = 128, i = 0, sesgo = 72, sale = [], d = s.lastIndexOf('-'), k, j;
        if (d > 0) { for (j = 0; j < d; j++) { if (s.charCodeAt(j) >= 128) return null; sale.push(s.charCodeAt(j)); } }
        function adaptar(x, num, primero) {
            x = primero ? Math.floor(x / 700) : x >> 1;
            x += Math.floor(x / num);
            var kk = 0;
            while (x > 455) { x = Math.floor(x / 35); kk += 36; }
            return kk + Math.floor(36 * x / (x + 38));
        }
        for (j = d > 0 ? d + 1 : 0; j < s.length; ) {
            var viejo = i, w = 1;
            for (k = 36; ; k += 36) {
                if (j >= s.length) return null;
                var c = s.charCodeAt(j++), dig = c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : 36;
                if (dig >= 36) return null;
                i += dig * w;
                var t = k <= sesgo ? 1 : k >= sesgo + 26 ? 26 : k - sesgo;
                if (dig < t) break;
                w *= 36 - t;
            }
            sesgo = adaptar(i - viejo, sale.length + 1, viejo == 0);
            n += Math.floor(i / (sale.length + 1));
            i %= sale.length + 1;
            if (n > 0x10ffff) return null;
            sale.splice(i++, 0, n);
        }
        return String.fromCodePoint.apply(null, sale);
    }
    var URL_PROHIBIDO_HOST = /[\u0000\t\n\r #\/:<>?@\[\\\]^|]/;
    var URL_PROHIBIDO_DOMINIO = /[\u0000-\u001f #%\/:<>?@\[\\\]^|\u007f]/;
    // (lo que UTS 46 quita: guion blando, selectores de variante, espacios de ancho cero...)
    var URL_IGNORADOS = /[\u00ad\u034f\u180b-\u180f\u200b\u2060\ufe00-\ufe0f\ufeff]/g;
    // (lo que UTS 46 no deja: U+FFFD y los no-caracteres)
    var URL_NO_DEJA = /[\ufdd0-\ufdef\ufffd-\uffff]|[\ud83f\ud87f\ud8bf\ud8ff\ud93f\ud97f\ud9bf\ud9ff\uda3f\uda7f\udabf\udaff\udb3f\udb7f\udbbf\udbff][\udffe\udfff]/;
    // domainToASCII aproximado (UTS 46 sin sus tablas: NFKC y minúsculas; las etiquetas con algo de fuera de ASCII,
    // en Punycode); null si no vale
    function urlAscii(dominio, estricto) {
        var s = dominio.replace(URL_IGNORADOS, '');
        if (/[^\u0000-\u007f]/.test(s)) {
            try { s = s.normalize('NFKC'); } catch (e) {}
            s = s.replace(/[\u3002\uff0e\uff61]/g, '.');
        }
        s = s.toLowerCase();
        if (URL_NO_DEJA.test(s)) return null;
        var etiquetas = s.split('.');
        for (var i = 0; i < etiquetas.length; i++) {
            var e = etiquetas[i];
            if (/[^\u0000-\u007f]/.test(e)) e = 'xn--' + urlPunycode(e);
            else if (e.slice(0, 4) == 'xn--') {
                var d = urlDePunycode(e.slice(4));
                if (d === null || (d !== '' && !/[^\u0000-\u007f]/.test(d)) || /[\u0080-\u009f]/.test(d) || URL_NO_DEJA.test(d)) return null;
            }
            if (e.length > 63 && estricto) return null;
            etiquetas[i] = e;
        }
        return etiquetas.join('.');
    }
    function urlNumeroV4(p) {
        if (p === '') return NaN;
        var base = 10;
        if (p.length >= 2 && (p.slice(0, 2) == '0x' || p.slice(0, 2) == '0X')) { p = p.slice(2); base = 16; }
        else if (p.length >= 2 && p.charAt(0) == '0') { p = p.slice(1); base = 8; }
        if (p === '') return 0;
        var re = base == 16 ? /^[0-9a-fA-F]+$/ : base == 8 ? /^[0-7]+$/ : /^[0-9]+$/;
        if (!re.test(p)) return NaN;
        return parseInt(p, base);
    }
    function urlTerminaEnNumero(s) {
        var p = s.split('.');
        if (p[p.length - 1] === '') { if (p.length == 1) return false; p.pop(); }
        var u = p[p.length - 1];
        if (u !== '' && /^[0-9]+$/.test(u)) return true;
        return !isNaN(urlNumeroV4(u)) && /^0[xX]/.test(u);
    }
    // IPv4: el número de 32 bits; null si no vale
    function urlIPv4(s) {
        var p = s.split('.');
        if (p[p.length - 1] === '' && p.length > 1) p.pop();
        if (p.length > 4) return null;
        var n = [];
        for (var i = 0; i < p.length; i++) {
            var x = urlNumeroV4(p[i]);
            if (isNaN(x)) return null;
            n.push(x);
        }
        for (i = 0; i < n.length - 1; i++) if (n[i] > 255) return null;
        if (n[n.length - 1] >= Math.pow(256, 5 - n.length)) return null;
        var v = n[n.length - 1];
        for (i = 0; i < n.length - 1; i++) v += n[i] * Math.pow(256, 3 - i);
        return v;
    }
    function urlIPv4Texto(v) {
        var r = [];
        for (var i = 0; i < 4; i++) { r.unshift(String(v % 256)); v = Math.floor(v / 256); }
        return r.join('.');
    }
    // IPv6: sus 8 números; null si no vale
    function urlIPv6(s) {
        var a = [0, 0, 0, 0, 0, 0, 0, 0], pieza = 0, comprimir = null, i = 0, c = function () { return s.charCodeAt(i); };
        if (c() == 58) {
            if (s.charCodeAt(1) != 58) return null;
            i += 2;
            comprimir = ++pieza;
        }
        while (i < s.length) {
            if (pieza == 8) return null;
            if (c() == 58) {
                if (comprimir !== null) return null;
                i++;
                comprimir = ++pieza;
                continue;
            }
            var v = 0, largo = 0;
            while (largo < 4 && i < s.length && esHex(c())) { v = v * 16 + parseInt(s[i], 16); i++; largo++; }
            if (i < s.length && c() == 46) {
                if (largo == 0) return null;
                i -= largo;
                if (pieza > 6) return null;
                var vistos = 0;
                while (i < s.length) {
                    var v4 = null;
                    if (vistos > 0) {
                        if (c() == 46 && vistos < 4) i++;
                        else return null;
                    }
                    if (i >= s.length || c() < 48 || c() > 57) return null;
                    while (i < s.length && c() >= 48 && c() <= 57) {
                        var d = c() - 48;
                        if (v4 === null) v4 = d;
                        else if (v4 === 0) return null;
                        else v4 = v4 * 10 + d;
                        if (v4 > 255) return null;
                        i++;
                    }
                    a[pieza] = a[pieza] * 256 + v4;
                    vistos++;
                    if (vistos == 2 || vistos == 4) pieza++;
                }
                if (vistos != 4) return null;
                break;
            } else if (i < s.length && c() == 58) {
                i++;
                if (i >= s.length) return null;
            } else if (i < s.length) return null;
            a[pieza] = v;
            pieza++;
        }
        if (comprimir !== null) {
            var cambio = pieza - comprimir;
            pieza = 7;
            while (pieza != 0 && cambio > 0) {
                var t = a[comprimir + cambio - 1];
                a[comprimir + cambio - 1] = a[pieza];
                a[pieza] = t;
                pieza--; cambio--;
            }
        } else if (pieza != 8) return null;
        return a;
    }
    function urlIPv6Texto(a) {
        var mejor = -1, largo = 1, i;
        for (i = 0; i < 8; i++) {
            if (a[i] !== 0) continue;
            var j = i;
            while (j < 8 && a[j] === 0) j++;
            if (j - i > largo) { mejor = i; largo = j - i; }
            i = j;
        }
        var r = '', ignorar = false;
        for (i = 0; i < 8; i++) {
            if (ignorar && a[i] === 0) continue;
            ignorar = false;
            if (mejor === i) { r += i === 0 ? '::' : ':'; ignorar = true; continue; }
            r += a[i].toString(16);
            if (i != 7) r += ':';
        }
        return '[' + r + ']';
    }
    // host parser: el host serializado; null si no vale
    function urlHost(s, noEspecial) {
        if (s.charAt(0) == '[') {
            if (s.charAt(s.length - 1) != ']') return null;
            var v6 = urlIPv6(s.slice(1, -1));
            return v6 ? urlIPv6Texto(v6) : null;
        }
        if (noEspecial) {
            if (URL_PROHIBIDO_HOST.test(s)) return null;
            return urlPcTexto(s, pcC0);
        }
        // (lo de siempre, un nombre en ASCII sin %: sin decodificar ni mirar etiqueta a etiqueta)
        var ascii = !/[^\x21-\x7e]|%|xn--/i.test(s) ? s.toLowerCase() : urlAscii(urlDecodificar(s), false);
        if (ascii === null || ascii === '' || URL_PROHIBIDO_DOMINIO.test(ascii)) return null;
        // (solo puede ser IPv4 si acaba en cifra o su última parte empieza por 0x)
        var ult = ascii.charCodeAt(ascii.length - 1);
        if (((ult >= 48 && ult <= 57) || ult == 46 || /(^|\.)0x[^.]*\.?$/i.test(ascii)) && urlTerminaEnNumero(ascii)) {
            var v4 = urlIPv4(ascii);
            return v4 === null ? null : urlIPv4Texto(v4);
        }
        return ascii;
    }
    function urlLetra(c) { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }
    // ¿empieza por una letra de unidad de Windows ("C:", "C|", seguida de nada, /, \, ? o #)?
    function urlEmpiezaUnidad(cps, i) {
        if (cps.length - i < 2 || !urlLetra(cps[i]) || (cps[i + 1] != 58 && cps[i + 1] != 124)) return false;
        if (cps.length - i == 2) return true;
        var c = cps[i + 2];
        return c == 47 || c == 92 || c == 63 || c == 35;
    }
    function urlUnidadNormal(s) { return s.length == 2 && urlLetra(s.charCodeAt(0)) && s.charAt(1) == ':'; }
    function urlUnidad(s) { return s.length == 2 && urlLetra(s.charCodeAt(0)) && (s.charAt(1) == ':' || s.charAt(1) == '|'); }
    function urlAcortar(u) {
        if (u.scheme == 'file' && u.path.length == 1 && urlUnidadNormal(u.path[0])) return;
        u.path.pop();
    }
    function urlEsPunto(s) { s = s.toLowerCase(); return s == '.' || s == '%2e'; }
    function urlEsDosPuntos(s) { s = s.toLowerCase(); return s == '..' || s == '.%2e' || s == '%2e.' || s == '%2e%2e'; }
    function urlCopiaReg(b) {
        return {scheme: b.scheme, username: b.username, password: b.password, host: b.host, port: b.port,
                path: typeof b.path == 'string' ? b.path : b.path.slice(), query: b.query, fragment: b.fragment};
    }
    // Los estados
    var E_ESQ0 = 1, E_ESQ = 2, E_SIN_ESQ = 3, E_ESP_REL_AUT = 4, E_RUTA_AUT = 5, E_REL = 6, E_REL_BARRA = 7,
        E_ESP_AUT_BARRAS = 8, E_ESP_AUT_IGNORAR = 9, E_AUT = 10, E_HOST = 11, E_HOSTNAME = 12, E_PUERTO = 13,
        E_FILE = 14, E_FILE_BARRA = 15, E_FILE_HOST = 16, E_RUTA0 = 17, E_RUTA = 18, E_OPACA = 19, E_CONSULTA = 20,
        E_ANCLA = 21;
    // (qué hay que codificar en cada conjunto: si el trozo no tiene nada de eso, va tal cual; rápido en el 68k)
    var RE_C0 = /[^\x20-\x7e]/, RE_FRAG = /[^\x21\x23-\x3b\x3d\x3f-\x5f\x61-\x7e]/, RE_CONS = /[^\x21\x24-\x3b\x3d\x3f-\x7e]/,
        RE_CONS_ESP = /[^\x21\x24-\x26\x28-\x3b\x3d\x3f-\x7e]/, RE_RUTA = /[^\x21\x24-\x3b\x3d\x40-\x5d\x5f\x61-\x7a\x7c\x7e]/;
    var RE_ESQ = /^([a-zA-Z][a-zA-Z0-9+.\-]*):/;
    function urlCodificar(s, re, en) { return re.test(s) ? urlPcTexto(s, en) : s; }
    // basic URL parser: el registro (o url cambiado, con estado forzado); null si no vale. Con estado forzado
    // devuelve url, o null si no valía. Va sobre el texto con charCodeAt (los delimitadores son ASCII) y salta de
    // golpe los trozos de ruta, consulta, ancla, autoridad y host (tarea 41d: la versión carácter a carácter era
    // 3-4 veces más lenta que la de antes)
    // (la vía rápida: http, https, ws, wss o ftp absoluta, con un nombre de servidor normal y nada que codificar ni
    // normalizar; da lo mismo que la máquina de estados, que se queda para todo lo demás)
    var RE_RAPIDA = /^(https?|wss?|ftp):\/\/([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)(?::([0-9]{1,5}))?(\/[A-Za-z0-9\-._~!$&()*+,;=:@\/]*)?(\?[A-Za-z0-9\-._~!$&()*+,;=:@\/?%]*)?(#[A-Za-z0-9\-._~!$&'()*+,;=:@\/?%]*)?$/;
    function urlRapida(s) {
        var m = RE_RAPIDA.exec(s);
        if (!m) return null;
        var host = m[2].toLowerCase(), ult = host.charCodeAt(host.length - 1);
        if ((ult >= 48 && ult <= 57) || /(^|\.)xn--/.test(host) || /(^|\.)0x[^.]*$/.test(host)) return null;
        var ruta = m[4] || '/';
        if (/\/\.\.?(\/|$)/.test(ruta)) return null;
        var esquema = m[1].toLowerCase(), puerto = null;
        if (m[3] !== undefined) {
            puerto = parseInt(m[3], 10);
            if (puerto > 65535) return null;
            if (puerto === URL_ESPECIALES[esquema + ':']) puerto = null;
        }
        return {scheme: esquema, username: '', password: '', host: host, port: puerto, path: ruta.slice(1).split('/'),
                query: m[5] !== undefined ? m[5].slice(1) : null, fragment: m[6] !== undefined ? m[6].slice(1) : null};
    }
    function urlBasico(entrada, base, url, forzado) {
        var s = String(entrada);
        if (!url) {
            var r = urlRapida(s);
            if (r) return r;
            url = {scheme: '', username: '', password: '', host: null, port: null, path: [], query: null, fragment: null};
            if (/^[\u0000- ]|[\u0000- ]$/.test(s)) s = s.replace(/^[\u0000- ]+|[\u0000- ]+$/g, '');
        }
        if (/[\t\n\r]/.test(s)) s = s.replace(/[\t\n\r]/g, '');
        var n = s.length, esp = urlEspecial(url.scheme);
        var estado = forzado || E_ESQ0, buf = '', arroba = false, corchetes = false, clavePasada = false, p = 0, c, q, k;
        var FIN = -1;
        for (; p <= n; p++) {
            c = p < n ? s.charCodeAt(p) : FIN;
            switch (estado) {
            case E_ESQ0:
                // (el esquema de una vez; sin él, directamente a lo relativo)
                if (!forzado) {
                    var me = RE_ESQ.exec(s);
                    if (me) { buf = me[1].toLowerCase(); p = me[1].length - 1; estado = E_ESQ; }
                    else { estado = E_SIN_ESQ; p--; }
                    break;
                }
                if (c != FIN && urlLetra(c)) { buf += String.fromCharCode(c).toLowerCase(); estado = E_ESQ; }
                else if (!forzado) { estado = E_SIN_ESQ; p--; }
                else return null;
                break;
            case E_ESQ:
                if (c != FIN && (urlLetra(c) || (c >= 48 && c <= 57) || c == 43 || c == 45 || c == 46)) buf += String.fromCharCode(c).toLowerCase();
                else if (c == 58) {
                    if (forzado) {
                        if (urlEspecial(url.scheme) != urlEspecial(buf)) return null;
                        if ((url.username !== '' || url.password !== '' || url.port !== null) && buf == 'file') return null;
                        if (url.scheme == 'file' && url.host === '') return null;
                    }
                    url.scheme = buf;
                    esp = urlEspecial(buf);
                    if (forzado) {
                        if (url.port === urlPuertoDe(url.scheme)) url.port = null;
                        return url;
                    }
                    buf = '';
                    if (url.scheme == 'file') estado = E_FILE;
                    else if (esp && base && base.scheme == url.scheme) estado = E_ESP_REL_AUT;
                    else if (esp) estado = E_ESP_AUT_BARRAS;
                    else if (s.charCodeAt(p + 1) == 47) { estado = E_RUTA_AUT; p++; }
                    else { url.path = ''; estado = E_OPACA; }
                } else if (!forzado) { buf = ''; estado = E_SIN_ESQ; p = -1; }
                else return null;
                break;
            case E_SIN_ESQ:
                if (!base || (typeof base.path == 'string' && c != 35)) return null;
                if (typeof base.path == 'string' && c == 35) {
                    url.scheme = base.scheme; esp = urlEspecial(url.scheme);
                    url.path = base.path; url.query = base.query; url.fragment = ''; estado = E_ANCLA;
                } else if (base.scheme != 'file') { estado = E_REL; p--; }
                else { estado = E_FILE; p--; }
                break;
            case E_ESP_REL_AUT:
                if (c == 47 && s.charCodeAt(p + 1) == 47) { estado = E_ESP_AUT_IGNORAR; p++; }
                else { estado = E_REL; p--; }
                break;
            case E_RUTA_AUT:
                if (c == 47) estado = E_AUT;
                else { estado = E_RUTA; p--; }
                break;
            case E_REL:
                url.scheme = base.scheme;
                esp = urlEspecial(url.scheme);
                if (c == 47 || (esp && c == 92)) estado = E_REL_BARRA;
                else {
                    url.username = base.username; url.password = base.password; url.host = base.host; url.port = base.port;
                    url.path = base.path.slice(); url.query = base.query;
                    if (c == 63) { url.query = ''; estado = E_CONSULTA; }
                    else if (c == 35) { url.fragment = ''; estado = E_ANCLA; }
                    else if (c != FIN) { url.query = null; urlAcortar(url); estado = E_RUTA; p--; }
                }
                break;
            case E_REL_BARRA:
                if (esp && (c == 47 || c == 92)) estado = E_ESP_AUT_IGNORAR;
                else if (c == 47) estado = E_AUT;
                else {
                    url.username = base.username; url.password = base.password; url.host = base.host; url.port = base.port;
                    estado = E_RUTA; p--;
                }
                break;
            case E_ESP_AUT_BARRAS:
                if (c == 47 && s.charCodeAt(p + 1) == 47) { estado = E_ESP_AUT_IGNORAR; p++; }
                else { estado = E_ESP_AUT_IGNORAR; p--; }
                break;
            case E_ESP_AUT_IGNORAR:
                if (c != 47 && c != 92) { estado = E_AUT; p--; }
                break;
            case E_AUT:
                if (c == 64) {
                    if (arroba) buf = '%40' + buf;
                    arroba = true;
                    for (k = 0; k < buf.length; k++) {
                        var cc = buf.codePointAt(k);
                        if (cc > 0xffff) k++;
                        if (cc == 58 && !clavePasada) { clavePasada = true; continue; }
                        var enc = urlPc(cc, pcUsuario);
                        if (clavePasada) url.password += enc; else url.username += enc;
                    }
                    buf = '';
                } else if (c == FIN || c == 47 || c == 63 || c == 35 || (esp && c == 92)) {
                    if (arroba && buf === '') return null;
                    p -= buf.length + 1;
                    buf = '';
                    estado = E_HOST;
                } else {
                    // (de golpe hasta el siguiente @, /, ?, # o \)
                    for (q = p + 1; q < n; q++) {
                        k = s.charCodeAt(q);
                        if (k == 64 || k == 47 || k == 63 || k == 35 || (esp && k == 92)) break;
                    }
                    buf += s.slice(p, q);
                    p = q - 1;
                }
                break;
            case E_HOST:
            case E_HOSTNAME:
                if (forzado && url.scheme == 'file') { p--; estado = E_FILE_HOST; }
                else if (c == 58 && !corchetes) {
                    if (buf === '') return null;
                    if (forzado == E_HOSTNAME) return null;
                    var h = urlHost(buf, !esp);
                    if (h === null) return null;
                    url.host = h; buf = ''; estado = E_PUERTO;
                } else if (c == FIN || c == 47 || c == 63 || c == 35 || (esp && c == 92)) {
                    p--;
                    if (esp && buf === '') return null;
                    if (forzado && buf === '' && (url.username !== '' || url.password !== '' || url.port !== null)) return null;
                    var h2 = urlHost(buf, !esp);
                    if (h2 === null) return null;
                    url.host = h2; buf = ''; estado = E_RUTA0;
                    if (forzado) return url;
                } else {
                    if (c == 91) corchetes = true;
                    if (c == 93) corchetes = false;
                    // (de golpe hasta el siguiente delimitador o corchete)
                    for (q = p + 1; q < n; q++) {
                        k = s.charCodeAt(q);
                        if (k == 58 || k == 47 || k == 63 || k == 35 || k == 91 || k == 93 || (esp && k == 92)) break;
                    }
                    buf += s.slice(p, q);
                    p = q - 1;
                }
                break;
            case E_PUERTO:
                if (c >= 48 && c <= 57) buf += String.fromCharCode(c);
                else if (c == FIN || c == 47 || c == 63 || c == 35 || (esp && c == 92) || forzado) {
                    if (buf !== '') {
                        var puerto = parseInt(buf, 10);
                        // (con estado forzado, lo cambiado antes se queda: el host de un setter host con mal puerto)
                        if (puerto > 65535) return forzado ? url : null;
                        url.port = puerto === urlPuertoDe(url.scheme) ? null : puerto;
                        buf = '';
                    }
                    if (forzado) return url;
                    estado = E_RUTA0; p--;
                } else return null;
                break;
            case E_FILE:
                url.scheme = 'file';
                esp = true;
                url.host = '';
                if (c == 47 || c == 92) estado = E_FILE_BARRA;
                else if (base && base.scheme == 'file') {
                    url.host = base.host; url.path = base.path.slice(); url.query = base.query;
                    if (c == 63) { url.query = ''; estado = E_CONSULTA; }
                    else if (c == 35) { url.fragment = ''; estado = E_ANCLA; }
                    else if (c != FIN) {
                        url.query = null;
                        if (!urlEmpiezaUnidadS(s, p)) urlAcortar(url);
                        else url.path = [];
                        estado = E_RUTA; p--;
                    }
                } else { estado = E_RUTA; p--; }
                break;
            case E_FILE_BARRA:
                if (c == 47 || c == 92) estado = E_FILE_HOST;
                else {
                    if (base && base.scheme == 'file') {
                        url.host = base.host;
                        if (!urlEmpiezaUnidadS(s, p) && base.path.length > 0 && urlUnidadNormal(base.path[0])) url.path.push(base.path[0]);
                    }
                    estado = E_RUTA; p--;
                }
                break;
            case E_FILE_HOST:
                if (c == FIN || c == 47 || c == 92 || c == 63 || c == 35) {
                    p--;
                    if (!forzado && urlUnidad(buf)) estado = E_RUTA;
                    else if (buf === '') {
                        url.host = '';
                        if (forzado) return url;
                        estado = E_RUTA0;
                    } else {
                        var hf = urlHost(buf, false);
                        if (hf === null) return null;
                        if (hf == 'localhost') hf = '';
                        url.host = hf;
                        if (forzado) return url;
                        buf = ''; estado = E_RUTA0;
                    }
                } else buf += s.charAt(p);
                break;
            case E_RUTA0:
                if (esp) { estado = E_RUTA; if (c != 47 && c != 92) p--; }
                else if (!forzado && c == 63) { url.query = ''; estado = E_CONSULTA; }
                else if (!forzado && c == 35) { url.fragment = ''; estado = E_ANCLA; }
                else if (c != FIN) { estado = E_RUTA; if (c != 47) p--; }
                else if (forzado && url.host === null) url.path.push('');
                break;
            case E_RUTA:
                if (c == FIN || c == 47 || (esp && c == 92) || (!forzado && (c == 63 || c == 35))) {
                    var barra = c == 47 || (esp && c == 92);
                    if (urlEsDosPuntos(buf)) {
                        urlAcortar(url);
                        if (!barra) url.path.push('');
                    } else if (urlEsPunto(buf) && !barra) url.path.push('');
                    else if (!urlEsPunto(buf)) {
                        if (url.scheme == 'file' && url.path.length == 0 && urlUnidad(buf)) buf = buf.charAt(0) + ':';
                        url.path.push(buf);
                    }
                    buf = '';
                    if (c == 63) { url.query = ''; estado = E_CONSULTA; }
                    if (c == 35) { url.fragment = ''; estado = E_ANCLA; }
                } else {
                    // (el trozo entero hasta el siguiente /, \, ? o #, codificado de una vez)
                    for (q = p + 1; q < n; q++) {
                        k = s.charCodeAt(q);
                        if (k == 47 || (esp && k == 92) || (!forzado && (k == 63 || k == 35))) break;
                    }
                    buf += urlCodificar(s.slice(p, q), RE_RUTA, pcRuta);
                    p = q - 1;
                }
                break;
            case E_OPACA:
                if (c == 63) { url.query = ''; estado = E_CONSULTA; }
                else if (c == 35) { url.fragment = ''; estado = E_ANCLA; }
                else if (c == 32) {
                    var sig = s.charCodeAt(p + 1);
                    url.path += sig == 63 || sig == 35 ? '%20' : ' ';
                } else if (c != FIN) {
                    for (q = p + 1; q < n; q++) { k = s.charCodeAt(q); if (k == 63 || k == 35 || k == 32) break; }
                    url.path += urlCodificar(s.slice(p, q), RE_C0, pcC0);
                    p = q - 1;
                }
                break;
            case E_CONSULTA:
                if (c == FIN || (!forzado && c == 35)) {
                    url.query += esp ? urlCodificar(buf, RE_CONS_ESP, pcConsultaEsp) : urlCodificar(buf, RE_CONS, pcConsulta);
                    buf = '';
                    if (c == 35) { url.fragment = ''; estado = E_ANCLA; }
                } else {
                    q = forzado ? n : s.indexOf('#', p);
                    if (q < 0) q = n;
                    buf += s.slice(p, q);
                    p = q - 1;
                }
                break;
            case E_ANCLA:
                if (c != FIN) {
                    url.fragment += urlCodificar(s.slice(p), RE_FRAG, pcFragmento);
                    p = n - 1;
                }
                break;
            }
        }
        return url;
    }
    // urlEmpiezaUnidad sobre el texto
    function urlEmpiezaUnidadS(s, i) {
        if (s.length - i < 2 || !urlLetra(s.charCodeAt(i))) return false;
        var d = s.charCodeAt(i + 1);
        if (d != 58 && d != 124) return false;
        if (s.length - i == 2) return true;
        var c = s.charCodeAt(i + 2);
        return c == 47 || c == 92 || c == 63 || c == 35;
    }
    function urlRutaTexto(u) {
        if (typeof u.path == 'string') return u.path;
        var r = '';
        for (var i = 0; i < u.path.length; i++) r += '/' + u.path[i];
        return r;
    }
    function urlSerializar(u, sinAncla) {
        var r = u.scheme + ':';
        if (u.host !== null) {
            r += '//';
            if (u.username !== '' || u.password !== '') r += u.username + (u.password !== '' ? ':' + u.password : '') + '@';
            r += u.host;
            if (u.port !== null) r += ':' + u.port;
        } else if (typeof u.path != 'string' && u.path.length > 1 && u.path[0] === '') r += '/.';
        r += urlRutaTexto(u);
        if (u.query !== null) r += '?' + u.query;
        if (!sinAncla && u.fragment !== null) r += '#' + u.fragment;
        return r;
    }
    function urlOrigen(u) {
        if (u.scheme == 'blob') {
            var dentro = urlBasico(urlRutaTexto(u), null);
            return dentro && (dentro.scheme == 'http' || dentro.scheme == 'https') ? urlOrigen(dentro) : 'null';
        }
        if (/^(ftp|http|https|ws|wss)$/.test(u.scheme)) return u.scheme + '://' + u.host + (u.port !== null ? ':' + u.port : '');
        return 'null';
    }
    // (un camino opaco sin consulta ni ancla pierde los espacios del final)
    function urlQuitarEspacios(u) {
        if (typeof u.path == 'string' && u.fragment === null && u.query === null) u.path = u.path.replace(/ +$/, '');
    }
    // un setter: el análisis con estado forzado sobre una copia; si vale, se queda
    function urlForzar(url, entrada, estado) {
        var u = urlBasico(entrada, null, urlCopiaReg(url._u), estado);
        if (u) url._u = u;
        return !!u;
    }
    function urlSinCredenciales(u) { return u.host === null || u.host === '' || u.scheme == 'file'; }
    function URL(url, base) {
        if (!(this instanceof URL)) throw new TypeError("Failed to construct 'URL': Please use the 'new' operator.");
        var b = null;
        if (base !== undefined) {
            b = urlBasico(String(base), null);
            if (!b) throw new TypeError("Failed to construct 'URL': Invalid base URL");
        }
        var u = urlBasico(String(url), b);
        if (!u) throw new TypeError("Failed to construct 'URL': Invalid URL");
        this._u = u;
        this._params = null;
    }
    URL.canParse = function (url, base) {
        var b = null;
        if (base !== undefined) { b = urlBasico(String(base), null); if (!b) return false; }
        return !!urlBasico(String(url), b);
    };
    URL.parse = function (url, base) { try { return new URL(url, base); } catch (e) { return null; } };
    var blobs = 0;
    URL.createObjectURL = function () { return 'blob:' + (g.location ? g.location.origin : 'null') + '/' + (++blobs); };
    URL.revokeObjectURL = function () {};
    function urlProp(nombre, leer, escribir) {
        Object.defineProperty(URL.prototype, nombre, {get: leer, set: escribir, configurable: true, enumerable: true});
    }
    function urlParamsAlDia(url) { if (url._params) url._params._leer(url._u.query === null ? '' : url._u.query); }
    urlProp('href', function () { return urlSerializar(this._u); }, function (v) {
        var u = urlBasico(String(v), null);
        if (!u) throw new TypeError("Failed to set the 'href' property on 'URL': Invalid URL");
        this._u = u;
        urlParamsAlDia(this);
    });
    urlProp('origin', function () { return urlOrigen(this._u); });
    urlProp('protocol', function () { return this._u.scheme + ':'; }, function (v) { urlForzar(this, String(v) + ':', E_ESQ0); });
    urlProp('username', function () { return this._u.username; }, function (v) {
        if (!urlSinCredenciales(this._u)) this._u.username = urlPcTexto(String(v), pcUsuario);
    });
    urlProp('password', function () { return this._u.password; }, function (v) {
        if (!urlSinCredenciales(this._u)) this._u.password = urlPcTexto(String(v), pcUsuario);
    });
    urlProp('host', function () {
        var u = this._u;
        return u.host === null ? '' : u.port === null ? u.host : u.host + ':' + u.port;
    }, function (v) { if (typeof this._u.path != 'string') urlForzar(this, String(v), E_HOST); });
    urlProp('hostname', function () { return this._u.host === null ? '' : this._u.host; },
        function (v) { if (typeof this._u.path != 'string') urlForzar(this, String(v), E_HOSTNAME); });
    urlProp('port', function () { return this._u.port === null ? '' : String(this._u.port); }, function (v) {
        if (urlSinCredenciales(this._u)) return;
        v = String(v);
        if (v === '') this._u.port = null;
        else urlForzar(this, v, E_PUERTO);
    });
    urlProp('pathname', function () { return urlRutaTexto(this._u); }, function (v) {
        if (typeof this._u.path == 'string') return;
        var u = urlCopiaReg(this._u);
        u.path = [];
        u = urlBasico(String(v), null, u, E_RUTA0);
        if (u) this._u = u;
    });
    urlProp('search', function () { var q = this._u.query; return q === null || q === '' ? '' : '?' + q; }, function (v) {
        v = String(v);
        if (v === '') { this._u.query = null; urlQuitarEspacios(this._u); urlParamsAlDia(this); return; }
        var u = urlCopiaReg(this._u);
        u.query = '';
        u = urlBasico(v.charAt(0) == '?' ? v.slice(1) : v, null, u, E_CONSULTA);
        if (u) this._u = u;
        urlParamsAlDia(this);
    });
    urlProp('hash', function () { var f = this._u.fragment; return f === null || f === '' ? '' : '#' + f; }, function (v) {
        v = String(v);
        if (v === '') { this._u.fragment = null; urlQuitarEspacios(this._u); return; }
        var u = urlCopiaReg(this._u);
        u.fragment = '';
        u = urlBasico(v.charAt(0) == '#' ? v.slice(1) : v, null, u, E_ANCLA);
        if (u) this._u = u;
    });
    urlProp('searchParams', function () {
        // (la query tal cual, sin quitarle un "?" del principio como hace el constructor: "??a=b" da "?a" de nombre)
        if (!this._params) { this._params = new URLSearchParams(); this._params._leer(this._u.query === null ? '' : this._u.query); this._params._url = this; }
        return this._params;
    });
    URL.prototype.toString = URL.prototype.toJSON = function () { return urlSerializar(this._u); };
    URL.prototype[Symbol.toStringTag] = 'URL';

    // application/x-www-form-urlencoded (el de URLSearchParams)
    // (lo de siempre, sin % ni + ni nada que codificar: tal cual)
    function urlFormDes(s) { return /[%+]/.test(s) ? urlDecodificar(s.replace(/\+/g, ' ')) : s; }
    function urlFormCod(s) {
        s = String(s);
        if (!/[^A-Za-z0-9*\-._ ]/.test(s)) return s.indexOf(' ') < 0 ? s : s.replace(/ /g, '+');
        return urlPcTexto(s, pcFormulario).replace(/%20/g, '+');
    }
    function urlTextoUSV(s) { s = String(s); return !/[\ud800-\udfff]/.test(s) ? s : s.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(^|[^\ud800-\udbff])[\udc00-\udfff]/g, function (x) { return x.length == 2 ? x.charAt(0) + '\ufffd' : '\ufffd'; }); }
    function URLSearchParams(init) {
        this._lista = [];
        this._url = null;
        if (init === undefined || init === null) return;
        if (typeof init == 'object' || typeof init == 'function') {
            if (typeof init[Symbol.iterator] == 'function') {
                for (var par of init) {
                    if (typeof par !== 'object' || par === null || typeof par[Symbol.iterator] != 'function') throw new TypeError("Failed to construct 'URLSearchParams': The provided value cannot be converted to a sequence.");
                    var p = Array.from(par);
                    if (p.length != 2) throw new TypeError("Failed to construct 'URLSearchParams': Sequence initializer must only contain pair elements");
                    this._lista.push([urlTextoUSV(p[0]), urlTextoUSV(p[1])]);
                }
            } else {
                // (record<USVString, USVString>: dos claves que quedan iguales al cambiar sus sustitutos sueltos por
                // U+FFFD son una, en el sitio de la primera y con el valor de la última)
                var sitio = new Map();
                for (var k of Reflect.ownKeys(init)) {
                    var d = Object.getOwnPropertyDescriptor(init, k);
                    if (typeof k != 'string' || !d || !d.enumerable) continue;
                    var ku = urlTextoUSV(k), vu = urlTextoUSV(init[k]);
                    if (sitio.has(ku)) this._lista[sitio.get(ku)][1] = vu;
                    else { sitio.set(ku, this._lista.length); this._lista.push([ku, vu]); }
                }
            }
        } else {
            var t = String(init);
            this._leer(t.charAt(0) == '?' ? t.slice(1) : t);
        }
    }
    var USP = URLSearchParams.prototype;
    USP._leer = function (s) {
        this._lista = [];
        String(s).split('&').forEach(function (t) {
            if (t === '') return;
            var i = t.indexOf('=');
            this._lista.push(i >= 0 ? [urlFormDes(t.slice(0, i)), urlFormDes(t.slice(i + 1))] : [urlFormDes(t), '']);
        }, this);
    };
    USP._cambio = function () {
        if (!this._url) return;
        var t = this.toString();
        this._url._u.query = t === '' ? null : t;
        if (t === '') urlQuitarEspacios(this._url._u);
    };
    USP.append = function (k, v) { this._lista.push([urlTextoUSV(k), urlTextoUSV(v)]); this._cambio(); };
    USP['delete'] = function (k, v) {
        k = urlTextoUSV(k);
        if (v !== undefined) v = urlTextoUSV(v);
        this._lista = this._lista.filter(function (p) { return !(p[0] === k && (v === undefined || p[1] === v)); });
        this._cambio();
    };
    USP.get = function (k) { k = urlTextoUSV(k); for (var i = 0; i < this._lista.length; i++) if (this._lista[i][0] === k) return this._lista[i][1]; return null; };
    USP.getAll = function (k) { k = urlTextoUSV(k); return this._lista.filter(function (p) { return p[0] === k; }).map(function (p) { return p[1]; }); };
    USP.has = function (k, v) {
        k = urlTextoUSV(k);
        if (v !== undefined) v = urlTextoUSV(v);
        return this._lista.some(function (p) { return p[0] === k && (v === undefined || p[1] === v); });
    };
    USP.set = function (k, v) {
        k = urlTextoUSV(k); v = urlTextoUSV(v);
        var hecho = false, r = [];
        for (var i = 0; i < this._lista.length; i++) {
            var p = this._lista[i];
            if (p[0] !== k) r.push(p);
            else if (!hecho) { r.push([k, v]); hecho = true; }
        }
        if (!hecho) r.push([k, v]);
        this._lista = r;
        this._cambio();
    };
    // (por unidades de UTF-16, estable)
    USP.sort = function () {
        this._lista = this._lista.map(function (p, i) { return [p, i]; })
            .sort(function (a, b) { return a[0][0] < b[0][0] ? -1 : a[0][0] > b[0][0] ? 1 : a[1] - b[1]; })
            .map(function (x) { return x[0]; });
        this._cambio();
    };
    USP.toString = function () { return this._lista.map(function (p) { return urlFormCod(p[0]) + '=' + urlFormCod(p[1]); }).join('&'); };
    // sobre la lista viva (si f borra, lo borrado ya no sale: core-js lo comprueba)
    USP.forEach = function (f, esto) {
        if (typeof f != 'function') throw new TypeError("Failed to execute 'forEach' on 'URLSearchParams': parameter 1 is not of type 'Function'.");
        for (var i = 0; i < this._lista.length; i++) f.call(esto, this._lista[i][1], this._lista[i][0], this);
    };
    // los iteradores, vivos como los de los navegadores (los que se borran mientras tanto ya no salen)
    function uspIter(usp, que) {
        var i = 0;
        var it = {next: function () {
            if (i >= usp._lista.length) return {value: undefined, done: true};
            var p = usp._lista[i++];
            return {value: que == 0 ? [p[0], p[1]] : que == 1 ? p[0] : p[1], done: false};
        }};
        it[Symbol.iterator] = function () { return this; };
        return it;
    }
    USP.entries = USP[Symbol.iterator] = function () { return uspIter(this, 0); };
    USP.keys = function () { return uspIter(this, 1); };
    USP.values = function () { return uspIter(this, 2); };
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

    // AbortSignal y AbortController como dice DOM (tarea 41d, WPT dom/abort): el motivo por omisión es una DOMException
    // (AbortError, TimeoutError); AbortSignal.any da una señal dependiente de las de verdad (no de otras dependientes);
    // al abortar, primero se marcan la señal y sus dependientes y después llegan los eventos abort (de confianza), en orden
    function AbortSignal() { this.aborted = false; this.reason = undefined; this.onabort = null; this._deps = []; this._fuentes = null; this._algos = []; }
    AbortSignal.prototype.addEventListener = function (t, f, o) { escuchar(this, t, f, o); };
    AbortSignal.prototype.removeEventListener = function (t, f, o) { olvidar(this, t, f, o); };
    AbortSignal.prototype.dispatchEvent = function (e) { return despachar(this, e); };
    AbortSignal.prototype.throwIfAborted = function () { if (this.aborted) throw this.reason; };
    AbortSignal.prototype[Symbol.toStringTag] = 'AbortSignal';
    function errorAbortar(r, nombre, m) {
        if (r !== undefined) return r;
        return new g.DOMException(m || 'signal is aborted without reason', nombre || 'AbortError');
    }
    function senalAbortar(s, r) {
        if (s.aborted) return;
        s.aborted = true;
        s.reason = r;
        var marcadas = [];
        s._deps.forEach(function (d) { if (!d.aborted) { d.aborted = true; d.reason = r; marcadas.push(d); } });
        [s].concat(marcadas).forEach(function (x) {
            // (antes del evento, lo que esperaba a la señal: los oyentes con signal se quitan)
            var a = x._algos; x._algos = [];
            a.forEach(function (f) { f(); });
            var ev = new Ev('abort');
            ev.isTrusted = true;
            despachar(x, ev);
        });
    }
    AbortSignal.abort = function (r) { var s = new AbortSignal(); s.aborted = true; s.reason = errorAbortar(r); return s; };
    AbortSignal.timeout = function (ms) {
        var s = new AbortSignal();
        g.setTimeout(function () { senalAbortar(s, errorAbortar(undefined, 'TimeoutError', 'signal timed out')); }, ms);
        return s;
    };
    AbortSignal.any = function (lista) {
        var r = new AbortSignal(), fuentes = [];
        lista = Array.from(lista);
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].aborted) { r.aborted = true; r.reason = lista[i].reason; return r; }
        }
        lista.forEach(function (s) {
            (s._fuentes || [s]).forEach(function (f) { if (fuentes.indexOf(f) < 0) { fuentes.push(f); f._deps.push(r); } });
        });
        r._fuentes = fuentes;
        return r;
    };
    function AbortController() { this.signal = new AbortSignal(); }
    AbortController.prototype.abort = function (r) { senalAbortar(this.signal, errorAbortar(r)); };
    AbortController.prototype[Symbol.toStringTag] = 'AbortController';

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
        this._u = dirValida(u);
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

    // formData() de Response y Request (Fetch): según su Content-Type, urlencoded o multipart/form-data; otro, TypeError
    function aFormData(texto, tipo) {
        var t = String(tipo || '').toLowerCase(), f = new FormData();
        if (t.indexOf('multipart/form-data') >= 0) {
            var m = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(String(tipo));
            if (!m) throw new TypeError('Could not parse content as FormData.');
            texto.split('--' + (m[1] || m[2])).slice(1).forEach(function (parte) {
                if (parte.slice(0, 2) == '--') return;
                var i = parte.indexOf('\r\n\r\n');
                if (i < 0) return;
                var cab = parte.slice(0, i), cuerpo = parte.slice(i + 4).replace(/\r\n$/, '');
                var n = /name="([^"]*)"/i.exec(cab), fn = /filename="([^"]*)"/i.exec(cab);
                if (!n) return;
                if (!fn) { f.append(n[1], cuerpo); return; }
                var ct = /content-type:[ \t]*([^\r\n]*)/i.exec(cab);
                f.append(n[1], new Blob([cuerpo], {type: ct ? ct[1] : ''}), fn[1]);
            });
            return f;
        }
        if (t.indexOf('application/x-www-form-urlencoded') >= 0) {
            new URLSearchParams(texto).forEach(function (v, k) { f.append(k, v); });
            return f;
        }
        throw new TypeError('Could not parse content as FormData.');
    }
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
    RP.formData = function () { var r = this; return new Promise(function (ok) { ok(aFormData(r._t(), r.headers.get('content-type'))); }); };
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
        this.bodyUsed = false;
        if (this.body !== null && !this.headers.has('content-type')) {
            var tc = cuerpoDe(this.body).tipo;
            if (tc) this.headers.set('content-type', tc);
        }
    }
    var QP = Request.prototype;
    QP.clone = function () { return new Request(this); };
    QP._t = function () { this.bodyUsed = true; return cuerpoDe(this.body).texto; };
    QP.text = function () { return Promise.resolve(this._t()); };
    QP.json = function () { var t = this._t(); return new Promise(function (ok) { ok(JSON.parse(t)); }); };
    QP.arrayBuffer = function () { return Promise.resolve(new TextEncoder().encode(this._t()).buffer); };
    QP.bytes = function () { return Promise.resolve(new TextEncoder().encode(this._t())); };
    QP.blob = function () { return Promise.resolve(new Blob([this._t()], {type: this.headers.get('content-type') || ''})); };
    QP.formData = function () { var r = this; return new Promise(function (ok) { ok(aFormData(r._t(), r.headers.get('content-type'))); }); };

    // structuredClone (HTML): copia honda de lo que se puede pasar entre ventanas; funciones, símbolos y objetos de la
    // plataforma (nodos, URL, Promise...), DataCloneError. Las referencias repetidas y circulares se conservan.
    g.structuredClone = function (v) {
        if (arguments.length < 1) throw new TypeError("Failed to execute 'structuredClone': 1 argument required, but only 0 present.");
        var vistos = new Map(), NO = [g.Node, URL, URLSearchParams, Promise, WeakMap, WeakSet, g.Event, Headers, Request,
            Response, FormData, AbortSignal, g.XMLHttpRequest, g.EventTarget, g.WeakRef].filter(function (f) { return typeof f == 'function'; });
        function noSe(x) {
            var n = typeof x == 'function' ? 'function' : typeof x == 'symbol' ? 'Symbol()' : (x && x.constructor && x.constructor.name) || 'object';
            g.__dashweb_lanzar('DataCloneError', "Failed to execute 'structuredClone': " + n + ' could not be cloned.');
        }
        function copia(x) {
            if (typeof x == 'symbol' || typeof x == 'function') noSe(x);
            if (x === null || typeof x != 'object') return x;
            if (vistos.has(x)) return vistos.get(x);
            if (x === g || NO.some(function (f) { return x instanceof f; })) noSe(x);
            var r, T = Object.prototype.toString.call(x).slice(8, -1);
            if (T == 'Boolean' || T == 'Number' || T == 'String' || T == 'BigInt') r = Object(x.valueOf());
            else if (T == 'Date') r = new Date(x.getTime());
            else if (T == 'RegExp') r = new RegExp(x.source, x.flags);
            else if (T == 'ArrayBuffer') r = x.slice(0);
            else if (ArrayBuffer.isView(x)) {
                var b = copia(x.buffer);
                r = T == 'DataView' ? new DataView(b, x.byteOffset, x.byteLength) : new x.constructor(b, x.byteOffset, x.length);
            } else if (x instanceof Blob) r = new Blob([x._b], {type: x.type});
            else if (T == 'Map') { r = new Map(); vistos.set(x, r); x.forEach(function (w, k) { r.set(copia(k), copia(w)); }); return r; }
            else if (T == 'Set') { r = new Set(); vistos.set(x, r); x.forEach(function (w) { r.add(copia(w)); }); return r; }
            else if (T == 'Error' || x instanceof Error) {
                var C = {EvalError: EvalError, RangeError: RangeError, ReferenceError: ReferenceError, SyntaxError: SyntaxError,
                    TypeError: TypeError, URIError: URIError}[x.name] || Error;
                r = new C(x.message);
                if (x.stack !== undefined) r.stack = String(x.stack);
            } else {
                r = Array.isArray(x) ? new Array(x.length) : {};
                vistos.set(x, r);
                Object.keys(x).forEach(function (k) { r[k] = copia(x[k]); });
                return r;
            }
            vistos.set(x, r);
            return r;
        }
        return copia(v);
    };
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
    var lugar = {}, href = 'about:blank', hashActual = '';
    g.__dashweb_lugar = function (u) {
        var m = /^([a-z][a-z0-9+.-]*:)\/\/([^\/?#:]*)(?::(\d+))?([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(u) || [];
        lugar.protocol = m[1] || 'about:';
        lugar.hostname = m[2] || '';
        lugar.port = m[3] || '';
        lugar.host = lugar.hostname + (lugar.port ? ':' + lugar.port : '');
        lugar.pathname = m[4] || '/';
        lugar.search = m[5] && m[5].length > 1 ? m[5] : '';
        hashActual = m[6] && m[6].length > 1 ? m[6] : '';
        lugar.origin = lugar.protocol + '//' + lugar.host;
        href = u;
        ['URL', 'documentURI'].forEach(function (k) { pon(document, k, u); });
        baseGuardada.v = -1;
        pon(document, 'domain', lugar.hostname);
    };
    // document.baseURI: la del primer <base href> (resuelta contra la de la página) o la de la página; guardada
    // mientras no cambie el DOM (a.href, new URL de los scripts... la leen a menudo; tarea 41d, WPT url/a-element)
    var baseGuardada = {v: -1, r: ''};
    Object.defineProperty(document, 'baseURI', {get: function () {
        var v = __dashweb_version();
        if (v !== baseGuardada.v) {
            var b = document.querySelector('base[href]'), r = href;
            if (b) { try { r = new URL(b.getAttribute('href'), href).href; } catch (e) {} }
            baseGuardada.v = v;
            baseGuardada.r = r;
        }
        return baseGuardada.r;
    }, configurable: true, enumerable: true});
    // ir a otra página (tarea 51): dashweb la abre en el siguiente tic; replace la pone en lugar de esta en el historial
    // (a otra parte de la misma página: sin cargarla otra vez; location cambia, hashchange después y dashweb solo
    // desplaza; con "#" a secas, ni eso. Antes location.hash no hacía nada y location.href = '#x' la recargaba entera)
    function ir(u, sustituir) {
        u = dirValida(u);
        var sin = function (x) { return x.replace(/#.*$/, ''); };
        if (href != 'about:blank' && u.indexOf('#') >= 0 && sin(u) == sin(href)) {
            var viejo = href;
            if (u == viejo) return;
            g.__dashweb_lugar(u);
            if (/#./.test(u)) g.__dashweb_navegar(u, !!sustituir);
            setTimeout(function () {
                g.dispatchEvent(new g.HashChangeEvent('hashchange', {oldURL: viejo, newURL: u}));
            }, 0);
            return;
        }
        g.__dashweb_navegar(u, !!sustituir);
    }
    Object.defineProperty(lugar, 'hash', {get: function () { return hashActual; }, set: function (v) {
        v = String(v);
        ir(href.replace(/#.*$/, '') + '#' + (v.charAt(0) == '#' ? v.slice(1) : v), false);
    }, enumerable: true, configurable: true});
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
    // Las longitudes de las formas (rect.width, circle.r...: SVGAnimatedLength con baseVal y animVal, del atributo) y lo
    // del texto (getNumberOfChars, getComputedTextLength, getSubStringLength, aproximados; Acid3 75 y 77). Solo en los
    // elementos de un <svg>: un <img> o un <canvas> tienen su width
    function longitud(el, k) {
        var v = {get value() { return parseFloat(el.getAttribute(k)) || 0; }, set value(x) { el.setAttribute(k, String(x)); },
            get valueAsString() { return el.getAttribute(k) || '0'; }, unitType: 1,
            get valueInSpecifiedUnits() { return this.value; }, convertToSpecifiedUnits: function () {},
            newValueSpecifiedUnits: function (u, x) { this.value = x; }};
        return {baseVal: v, animVal: v};
    }
    [['rect', 'x y width height rx ry'], ['circle', 'cx cy r'], ['ellipse', 'cx cy rx ry'], ['line', 'x1 y1 x2 y2'],
     ['image', 'x y width height'], ['use', 'x y width height'], ['foreignObject', 'x y width height'],
     ['pattern', 'x y width height'], ['mask', 'x y width height'], ['filter', 'x y width height'],
     ['svg', 'x y width height']].forEach(function (q) {
        q[1].split(' ').forEach(function (k) {
            var previo = Object.getOwnPropertyDescriptor(proto(q[0]), k);
            Object.defineProperty(proto(q[0]), k, {configurable: true, get: function () {
                if (q[0] != 'svg' || this.ownerSVGElement || this.namespaceURI == 'http://www.w3.org/2000/svg' || esSvg(this)) return longitud(this, k);
                return previo && previo.get ? previo.get.call(this) : this.getAttribute(k);
            }, set: function (v) { if (previo && previo.set) previo.set.call(this, v); else this.setAttribute(k, v); }});
        });
    });
    ['text', 'tspan', 'textPath'].forEach(function (t) {
        var p = proto(t);
        p.getNumberOfChars = function () { return Array.from(this.textContent || '').length; };
        p.getComputedTextLength = function () {
            var tam = parseFloat(this.getAttribute('font-size') || g.getComputedStyle(this).fontSize) || 16;
            return this.getNumberOfChars() * tam * 0.5;
        };
        p.getSubStringLength = function (i, n) {
            var total = this.getNumberOfChars();
            if (i < 0 || i >= total) g.__dashweb_lanzar('IndexSizeError', 'The charnum provided is out of range.');
            return this.getComputedTextLength() * Math.min(n, total - i) / (total || 1);
        };
        p.getStartPositionOfChar = function (i) { return {x: this.getSubStringLength(0, i || 1) * (i ? 1 : 0), y: 0}; };
        p.selectSubString = function () {};
    });

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
                            else mal(new Error('crypto.subtle.digest: ' + alg + ' no est\u00e1'));
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
        // (en otro documento, el de un marco o de createDocument, su <title>; Acid3 98)
        Object.defineProperty(document, 'title', {configurable: true,
            get: function () {
                if (this !== document && this && this.nodeType == 9) {
                    var e = this.querySelector('title');
                    return e ? e.textContent.replace(/[ \t\n\f\r]+/g, ' ').trim() : '';
                }
                return leer ? leer.call(document) : '';
            },
            set: function (v) {
                var d = this && this.nodeType == 9 ? this : document, t = d.querySelector('title');
                if (!t) { t = d.createElement('title'); (d.head || d.documentElement).appendChild(t); }
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
        try { (0, eval)(codigo); } catch (e) { console.log('JS (script a\u00f1adido): ' + (e && e.stack ? e + ' | ' + e.stack : e)); }
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

    // === Tablas: caption, tHead, tFoot, tBodies, rows, cells, insertRow... (tarea 41c, Acid3 49 a 51) ===
    (function () {
        function metodo(etiquetas, nombre, f) {
            etiquetas.split(' ').forEach(function (t) {
                Object.defineProperty(proto(t), nombre, {value: f, writable: true, configurable: true});
            });
        }
        function hijos(el, nombres) {
            var r = [];
            for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType == 1 && nombres.indexOf(c.localName) >= 0) r.push(c);
            return r;
        }
        function coleccion(a) {
            Object.defineProperty(a, 'item', {value: function (i) { return a[i] || null; }});
            Object.defineProperty(a, 'namedItem', {value: function (k) { return a.filter(function (e) { return e.id == k || e.getAttribute('name') == k; })[0] || null; }});
            return a;
        }
        function quitar(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
        function fuera(i, n) { if (i < -1 || i > n) g.__dashweb_lanzar('IndexSizeError', 'The index provided (' + i + ') is outside the range [-1, ' + n + '].'); }
        function filas(t) {
            var r = [];
            hijos(t, ['thead']).forEach(function (s) { r = r.concat(hijos(s, ['tr'])); });
            for (var c = t.firstChild; c; c = c.nextSibling) {
                if (c.nodeType != 1) continue;
                if (c.localName == 'tr') r.push(c);
                else if (c.localName == 'tbody') r = r.concat(hijos(c, ['tr']));
            }
            hijos(t, ['tfoot']).forEach(function (s) { r = r.concat(hijos(s, ['tr'])); });
            return r;
        }
        function parte(nombre, antesDe) {
            return {
                get: function () { return hijos(this, [nombre])[0] || null; },
                set: function (v) {
                    quitar(hijos(this, [nombre])[0]);
                    if (v) this.insertBefore(v, antesDe(this));
                }
            };
        }
        // (thead, antes del primero que no sea caption ni colgroup; caption, el primero; tfoot, al final)
        function trasCabeza(t) {
            for (var c = t.firstChild; c; c = c.nextSibling) if (c.nodeType == 1 && c.localName != 'caption' && c.localName != 'colgroup') return c;
            return null;
        }
        var partes = {caption: function (t) { return t.firstChild; }, thead: trasCabeza, tfoot: function () { return null; }};
        [['caption', 'caption', 'Caption'], ['tHead', 'thead', 'THead'], ['tFoot', 'tfoot', 'TFoot']].forEach(function (q) {
            var d = parte(q[1], partes[q[1]]);
            defEn('table', q[0], d.get, d.set);
            metodo('table', 'create' + q[2], function () {
                var e = d.get.call(this);
                if (!e) { e = this.ownerDocument.createElement(q[1]); this.insertBefore(e, partes[q[1]](this)); }
                return e;
            });
            metodo('table', 'delete' + q[2], function () { quitar(d.get.call(this)); });
        });
        defEn('table', 'tBodies', function () { return coleccion(hijos(this, ['tbody'])); });
        defEn('table', 'rows', function () { return coleccion(filas(this)); });
        metodo('table', 'createTBody', function () {
            var b = this.ownerDocument.createElement('tbody'), l = hijos(this, ['tbody']);
            this.insertBefore(b, l.length ? l[l.length - 1].nextSibling : null);
            return b;
        });
        metodo('table', 'insertRow', function (i) {
            i = i === undefined ? -1 : +i;
            var r = filas(this), tr = this.ownerDocument.createElement('tr');
            fuera(i, r.length);
            var cuerpos = hijos(this, ['tbody']);
            if (!r.length && !cuerpos.length) {
                var b = this.ownerDocument.createElement('tbody');
                this.appendChild(b);
                b.appendChild(tr);
            } else if (!r.length) cuerpos[cuerpos.length - 1].appendChild(tr);
            else if (i == -1 || i == r.length) r[r.length - 1].parentNode.appendChild(tr);
            else r[i].parentNode.insertBefore(tr, r[i]);
            return tr;
        });
        metodo('table', 'deleteRow', function (i) {
            var r = filas(this);
            i = +i;
            if (i == -1) { quitar(r[r.length - 1]); return; }
            fuera(i, r.length - 1);
            quitar(r[i]);
        });
        defEn('thead tbody tfoot', 'rows', function () { return coleccion(hijos(this, ['tr'])); });
        metodo('thead tbody tfoot', 'insertRow', function (i) {
            i = i === undefined ? -1 : +i;
            var r = hijos(this, ['tr']), tr = this.ownerDocument.createElement('tr');
            fuera(i, r.length);
            this.insertBefore(tr, i == -1 || i == r.length ? null : r[i]);
            return tr;
        });
        metodo('thead tbody tfoot', 'deleteRow', function (i) {
            var r = hijos(this, ['tr']);
            i = +i;
            if (i == -1) { quitar(r[r.length - 1]); return; }
            fuera(i, r.length - 1);
            quitar(r[i]);
        });
        defEn('tr', 'cells', function () { return coleccion(hijos(this, ['td', 'th'])); });
        defEn('tr', 'rowIndex', function () {
            var p = this.parentNode, t = p && p.localName == 'table' ? p : p && /^t(head|body|foot)$/.test(p.localName) && p.parentNode && p.parentNode.localName == 'table' ? p.parentNode : null;
            return t ? filas(t).indexOf(this) : -1;
        });
        defEn('tr', 'sectionRowIndex', function () {
            var p = this.parentNode;
            return p ? hijos(p, ['tr']).indexOf(this) : -1;
        });
        metodo('tr', 'insertCell', function (i) {
            i = i === undefined ? -1 : +i;
            var c = hijos(this, ['td', 'th']), td = this.ownerDocument.createElement('td');
            fuera(i, c.length);
            this.insertBefore(td, i == -1 || i == c.length ? null : c[i]);
            return td;
        });
        metodo('tr', 'deleteCell', function (i) {
            var c = hijos(this, ['td', 'th']);
            i = +i;
            if (i == -1) { quitar(c[c.length - 1]); return; }
            fuera(i, c.length - 1);
            quitar(c[i]);
        });
        defEn('td th', 'cellIndex', function () { return this.parentNode ? hijos(this.parentNode, ['td', 'th']).indexOf(this) : -1; });
    })();

    // === DOMException y las comprobaciones del DOM (tarea 41c, Acid3) ===
    // Los nombres de createElement y createElementNS se comprueban (InvalidCharacterError, NamespaceError), meter un
    // nodo donde no cabe da HierarchyRequestError, y los errores llevan sus constantes y su code como en un navegador.
    (function () {
        var CONSTANTES = ['INDEX_SIZE_ERR', 'DOMSTRING_SIZE_ERR', 'HIERARCHY_REQUEST_ERR', 'WRONG_DOCUMENT_ERR',
            'INVALID_CHARACTER_ERR', 'NO_DATA_ALLOWED_ERR', 'NO_MODIFICATION_ALLOWED_ERR', 'NOT_FOUND_ERR',
            'NOT_SUPPORTED_ERR', 'INUSE_ATTRIBUTE_ERR', 'INVALID_STATE_ERR', 'SYNTAX_ERR', 'INVALID_MODIFICATION_ERR',
            'NAMESPACE_ERR', 'INVALID_ACCESS_ERR', 'VALIDATION_ERR', 'TYPE_MISMATCH_ERR', 'SECURITY_ERR', 'NETWORK_ERR',
            'ABORT_ERR', 'URL_MISMATCH_ERR', 'QUOTA_EXCEEDED_ERR', 'TIMEOUT_ERR', 'INVALID_NODE_TYPE_ERR', 'DATA_CLONE_ERR'];
        var NOMBRES = ['IndexSizeError', 'DOMStringSizeError', 'HierarchyRequestError', 'WrongDocumentError',
            'InvalidCharacterError', 'NoDataAllowedError', 'NoModificationAllowedError', 'NotFoundError',
            'NotSupportedError', 'InUseAttributeError', 'InvalidStateError', 'SyntaxError', 'InvalidModificationError',
            'NamespaceError', 'InvalidAccessError', 'ValidationError', 'TypeMismatchError', 'SecurityError', 'NetworkError',
            'AbortError', 'URLMismatchError', 'QuotaExceededError', 'TimeoutError', 'InvalidNodeTypeError', 'DataCloneError'];
        function DOMException(mensaje, nombre) {
            if (!(this instanceof DOMException)) throw new TypeError("Constructor DOMException requires 'new'");
            var n = nombre === undefined ? 'Error' : String(nombre);
            Object.defineProperty(this, 'message', {value: mensaje === undefined ? '' : String(mensaje), writable: true, configurable: true});
            Object.defineProperty(this, 'name', {value: n, writable: true, configurable: true});
            Object.defineProperty(this, 'code', {value: NOMBRES.indexOf(n) + 1, writable: true, configurable: true});
            Object.defineProperty(this, 'stack', {value: new Error(this.message).stack, writable: true, configurable: true});
        }
        DOMException.prototype = Object.create(Error.prototype);
        Object.defineProperty(DOMException.prototype, 'constructor', {value: DOMException, writable: true, configurable: true});
        CONSTANTES.forEach(function (k, i) {
            Object.defineProperty(DOMException, k, {value: i + 1, enumerable: true});
            Object.defineProperty(DOMException.prototype, k, {value: i + 1, enumerable: true});
        });
        if (typeof g.DOMException != 'function') g.DOMException = DOMException;
        function lanzar(nombre, m) { throw new g.DOMException(m || nombre, nombre); }
        g.__dashweb_lanzar = lanzar;

        var NOMBRE = /^[A-Za-z_:\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][A-Za-z0-9_:.\-\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]*$/;
        var XHTML = 'http://www.w3.org/1999/xhtml', SVGNS = 'http://www.w3.org/2000/svg',
            XMLNS = 'http://www.w3.org/2000/xmlns/', XMLNS_XML = 'http://www.w3.org/XML/1998/namespace';
        // (prefijo y nombre local de un nombre con espacio de nombres, o NamespaceError)
        function partir(ns, q) {
            if (!NOMBRE.test(q)) lanzar('InvalidCharacterError');
            var i = q.indexOf(':'), prefijo = null, local = q;
            if (i >= 0) {
                prefijo = q.slice(0, i);
                local = q.slice(i + 1);
                if (!prefijo || !local || local.indexOf(':') >= 0) lanzar('NamespaceError');
            }
            if (prefijo !== null && ns === null) lanzar('NamespaceError');
            if (prefijo == 'xml' && ns != XMLNS_XML) lanzar('NamespaceError');
            if ((q == 'xmlns' || prefijo == 'xmlns') != (ns == XMLNS)) lanzar('NamespaceError');
            return [prefijo, local];
        }
        var crear = document.createElement;
        document.createElement = function (n, op) {
            n = String(n);
            if (!NOMBRE.test(n)) lanzar('InvalidCharacterError', "The tag name provided ('" + n + "') is not a valid name.");
            var el = crear.call(this, n, op);
            // (en un documento XML, el nombre tal cual y sin espacio de nombres; en uno XHTML, el de XHTML: DOM)
            var ct = this && this.nodeType == 9 ? this.contentType : null;
            if (ct && ct != 'text/html') {
                var ns = ct == 'application/xhtml+xml' ? XHTML : null;
                [['tagName', n], ['nodeName', n], ['localName', n], ['namespaceURI', ns]].forEach(function (p) {
                    Object.defineProperty(el, p[0], {value: p[1], configurable: true});
                });
            }
            return el;
        };
        document.createElementNS = function (ns, q) {
            ns = ns === null || ns === undefined || ns === '' ? null : String(ns);
            q = String(q);
            var pl = partir(ns, q);
            if (ns == XHTML || ns == SVGNS) return crear.call(document, pl[1]);
            var el = crear.call(document, pl[1]);
            [['tagName', q], ['nodeName', q], ['prefix', pl[0]], ['localName', pl[1]], ['namespaceURI', ns]].forEach(function (p) {
                Object.defineProperty(el, p[0], {value: p[1], configurable: true});
            });
            return el;
        };
        var porId = document.getElementById;
        // (en otro documento, el de un marco o de createHTMLDocument, en el suyo: el de C mira siempre la página; Acid3 46)
        document.getElementById = function (id) {
            id = String(id);
            if (id.indexOf('\0') >= 0) return null;
            if (this === document || !this || this.nodeType != 9) return porId.call(document, id);
            var l = this.getElementsByTagName('*');
            for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
            return null;
        };
        var impl = document.implementation;
        impl.createDocumentType = function (q, publico, sistema) {
            q = String(q);
            partir(null, q);
            return __dashweb_tipo_doc(q, publico == null ? '' : String(publico), sistema == null ? '' : String(sistema));
        };
        impl.createDocument = function (ns, q, tipo) {
            var d = impl.createHTMLDocument('');
            while (d.firstChild) d.removeChild(d.firstChild);
            Object.defineProperty(d, 'documentElement', {configurable: true, get: function () {
                for (var c = this.firstChild; c; c = c.nextSibling) if (c.nodeType == 1) return c;
                return null;
            }});
            // (su tipo según el espacio de nombres, como dice DOM)
            var ct = ns == 'http://www.w3.org/1999/xhtml' ? 'application/xhtml+xml' : ns == 'http://www.w3.org/2000/svg' ? 'image/svg+xml' : 'application/xml';
            Object.defineProperty(d, 'contentType', {value: ct, configurable: true});
            if (tipo) d.appendChild(tipo);
            if (q) d.appendChild(d.createElementNS(ns, String(q)));
            return d;
        };
        // (meter n en p, en lugar de viejo si lo hay)
        function cabe(p, n, viejo) {
            if (!esNodo(n)) return;
            var tp = p.nodeType, tn = n.nodeType;
            if (tp != 1 && tp != 9 && tp != 11) lanzar('HierarchyRequestError', 'This node type does not support this method.');
            for (var a = p; a; a = a.parentNode) if (a === n) lanzar('HierarchyRequestError', 'The new child element contains the parent.');
            if (tn == 9 || tn == 2 || (tn == 10 && tp != 9)) lanzar('HierarchyRequestError', 'Nodes of this type may not be inserted.');
            if (tp == 9) {
                if (tn == 3) lanzar('HierarchyRequestError', 'Nodes of type #text may not be inserted inside nodes of type #document.');
                var el = tn == 1 ? 1 : tn == 11 ? n.children.length : 0;
                if (el > 1) lanzar('HierarchyRequestError', 'Only one element on document allowed.');
                if (el == 1) for (var c = p.firstChild; c; c = c.nextSibling)
                    if (c.nodeType == 1 && c !== viejo && c !== n) lanzar('HierarchyRequestError', 'Only one element on document allowed.');
            }
        }
        var meter = N.appendChild, antes = N.insertBefore, cambiar = N.replaceChild;
        N.appendChild = function (n) { cabe(this, n, null); return meter.apply(this, arguments); };
        N.insertBefore = function (n, ref) {
            cabe(this, n, null);
            if (ref != null && ref.parentNode !== this) lanzar('NotFoundError', 'The node before which the new node is to be inserted is not a child of this node.');
            return antes.apply(this, arguments);
        };
        N.replaceChild = function (n, viejo) {
            cabe(this, n, viejo);
            if (!viejo || viejo.parentNode !== this) lanzar('NotFoundError', 'The node to be replaced is not a child of this node.');
            return cambiar.apply(this, arguments);
        };
    })();

    // === document.styleSheets (CSSOM; tarea 41c, Acid3 72) ===
    // Una hoja por cada <style> y <link rel=stylesheet>: ownerNode, href (null en las de dentro), cssRules vivas (se leen
    // del texto del <style> cada vez), insertRule y deleteRule (que reescriben ese texto: el estilo se rehace). Las de
    // <link> no tienen reglas a la vista (como una de otro origen).
    (function () {
        function partir(t) {
            t = String(t).replace(/\/\*[\s\S]*?\*\//g, '');
            var r = [], i = 0, n = t.length;
            while (i < n) {
                while (i < n && /\s/.test(t[i])) i++;
                if (i >= n) break;
                var ini = i, prof = 0, comillas = null;
                for (; i < n; i++) {
                    var c = t[i];
                    if (comillas) { if (c == '\\') i++; else if (c == comillas) comillas = null; continue; }
                    if (c == '"' || c == "'") comillas = c;
                    else if (c == '{') prof++;
                    else if (c == '}') { prof--; if (prof <= 0) { i++; break; } }
                    else if (c == ';' && prof == 0) { i++; break; }
                }
                var txt = t.slice(ini, i).trim();
                if (txt) r.push(txt);
            }
            return r;
        }
        function regla(hoja, txt) {
            var a = txt.indexOf('{'), sel = a >= 0 ? txt.slice(0, a).trim() : '', cuerpo = a >= 0 ? txt.slice(a + 1, txt.lastIndexOf('}')) : '';
            var estilo = {cssText: cuerpo.trim(), getPropertyValue: function (k) {
                var m = new RegExp('(?:^|;)\\s*' + String(k).replace(/[^\w-]/g, '') + '\\s*:\\s*([^;]*)', 'i').exec(cuerpo);
                return m ? m[1].trim() : '';
            }};
            return {cssText: txt, selectorText: sel, style: estilo, parentStyleSheet: hoja, type: sel.charAt(0) == '@' ? 0 : 1};
        }
        function Hoja(el) { Object.defineProperty(this, 'ownerNode', {value: el}); }
        Hoja.prototype = {
            type: 'text/css', parentStyleSheet: null, ownerRule: null,
            get href() { return this.ownerNode.localName == 'link' ? this.ownerNode.href : null; },
            get title() { return this.ownerNode.getAttribute('title'); },
            get media() { var m = this.ownerNode.getAttribute('media') || ''; return {mediaText: m, length: m ? 1 : 0}; },
            get disabled() { return !!this.ownerNode.__desactivada; },
            set disabled(v) { this.ownerNode.__desactivada = !!v; },
            __textos: function () { return this.ownerNode.localName == 'style' ? partir(this.ownerNode.textContent) : []; },
            get cssRules() {
                var h = this;
                if (!h.__lista) h.__lista = new Proxy({}, {get: function (t, k) {
                    var l = h.__textos();
                    if (k === 'length') return l.length;
                    if (k === 'item') return function (i) { return l[i] !== undefined ? regla(h, l[i]) : null; };
                    if (typeof k == 'string' && /^\d+$/.test(k)) return l[+k] !== undefined ? regla(h, l[+k]) : undefined;
                    if (k === Symbol.iterator) return function () { return l.map(function (x) { return regla(h, x); })[Symbol.iterator](); };
                    return undefined;
                }});
                return h.__lista;
            },
            get rules() { return this.cssRules; },
            insertRule: function (txt, i) {
                var l = this.__textos();
                i = i === undefined ? 0 : i >>> 0;
                if (i > l.length) g.__dashweb_lanzar('IndexSizeError', 'The index provided (' + i + ') is larger than the maximum index (' + l.length + ').');
                l.splice(i, 0, String(txt).trim());
                this.ownerNode.textContent = l.join('\n');
                return i;
            },
            deleteRule: function (i) {
                var l = this.__textos();
                i = i >>> 0;
                if (i >= l.length) g.__dashweb_lanzar('IndexSizeError', 'The index provided (' + i + ') is larger than the maximum index (' + (l.length - 1) + ').');
                l.splice(i, 1);
                this.ownerNode.textContent = l.join('\n');
            },
            addRule: function (s, d, i) { return this.insertRule(s + ' { ' + d + ' }', i === undefined ? this.__textos().length : i); },
            removeRule: function (i) { this.deleteRule(i || 0); }
        };
        g.CSSStyleSheet = Hoja;
        g.StyleSheet = Hoja;
        Object.defineProperty(document, 'styleSheets', {configurable: true, get: function () {
            var d = this && this.nodeType == 9 ? this : document;
            var l = Array.prototype.filter.call(d.querySelectorAll('style, link'), function (e) {
                return e.localName == 'style' || /(^|\s)stylesheet(\s|$)/i.test(e.getAttribute('rel') || '');
            }).map(function (e) {
                if (!e.__hoja) Object.defineProperty(e, '__hoja', {value: new Hoja(e)});
                return e.__hoja;
            });
            Object.defineProperty(l, 'item', {value: function (i) { return l[i] || null; }});
            return l;
        }});
        ['style', 'link'].forEach(function (t) {
            Object.defineProperty(proto(t), 'sheet', {configurable: true, get: function () {
                if (this.localName == 'link' && !/(^|\s)stylesheet(\s|$)/i.test(this.getAttribute('rel') || '')) return null;
                if (!this.__hoja) Object.defineProperty(this, '__hoja', {value: new Hoja(this)});
                return this.__hoja;
            }});
        });
        // img.width y height: lo del CSS si va en px; si no, el atributo (como el tamaño que se pinta, a falta de medir)
        ['width', 'height'].forEach(function (k) {
            defEn('img', k, function () {
                var c = g.getComputedStyle(this)[k];
                if (/^-?[\d.]+px$/.test(c)) return Math.round(parseFloat(c));
                var a = parseInt(this.getAttribute(k));
                return isNaN(a) ? 0 : a;
            }, function (v) { this.setAttribute(k, String(v >>> 0)); });
        });
    })();

    // === Más DOM de WPT (tarea 41d, dom/nodes) ===
    (function () {
        function datos(n) { return n && (n.nodeType == 3 || n.nodeType == 4 || n.nodeType == 7 || n.nodeType == 8); }
        function fuera(n, o) {
            if (o > n.data.length) g.__dashweb_lanzar('IndexSizeError', 'The offset ' + o + ' is greater than the node\'s length (' + n.data.length + ').');
        }
        // CharacterData: substringData, appendData, insertData, deleteData, replaceData (con los Range vivos)
        N.substringData = function (o, k) {
            if (arguments.length < 2) throw new TypeError("Failed to execute 'substringData': 2 arguments required.");
            o = o >>> 0; k = k >>> 0; fuera(this, o);
            return this.data.substr(o, k);
        };
        N.appendData = function (t) {
            if (arguments.length < 1) throw new TypeError("Failed to execute 'appendData': 1 argument required.");
            cambiarDatos(this, this.data.length, 0, String(t));
        };
        N.insertData = function (o, t) {
            if (arguments.length < 2) throw new TypeError("Failed to execute 'insertData': 2 arguments required.");
            o = o >>> 0; fuera(this, o);
            cambiarDatos(this, o, 0, String(t));
        };
        N.deleteData = function (o, k) {
            if (arguments.length < 2) throw new TypeError("Failed to execute 'deleteData': 2 arguments required.");
            o = o >>> 0; k = k >>> 0; fuera(this, o);
            cambiarDatos(this, o, k, '');
        };
        N.replaceData = function (o, k, t) {
            if (arguments.length < 3) throw new TypeError("Failed to execute 'replaceData': 3 arguments required.");
            o = o >>> 0; k = k >>> 0; fuera(this, o);
            cambiarDatos(this, o, k, String(t));
        };
        // (sin length en los nodos: N es también el de los elementos, y un elemento con length parecería una lista a las
        // librerías que miran 'length' in x)
        // ParentNode.replaceChildren
        N.replaceChildren = function () {
            var d = this.ownerDocument || document, f = d.createDocumentFragment();
            Array.prototype.forEach.call(arguments, function (x) { f.appendChild(esNodo(x) ? x : d.createTextNode(String(x))); });
            while (this.firstChild) this.removeChild(this.firstChild);
            this.appendChild(f);
        };
        // getElementsByTagNameNS: por espacio de nombres y nombre local ("*" vale para cualquiera)
        N.getElementsByTagNameNS = function (ns, local) {
            ns = ns === null || ns === undefined || ns === '' ? null : String(ns);
            local = String(local);
            return __dashweb_coleccion(this, function (e) {
                return (ns === '*' || e.namespaceURI === ns) && (local === '*' || e.localName === local);
            });
        };
        // lookupNamespaceURI, lookupPrefix e isDefaultNamespace (DOM "locate a namespace", con los xmlns de los atributos)
        function elementoDe(n) {
            if (n.nodeType == 1) return n;
            if (n.nodeType == 9) return n.documentElement;
            if (n.nodeType == 10 || n.nodeType == 11) return null;
            return n.parentNode && n.parentNode.nodeType == 1 ? n.parentNode : n.parentElement || null;
        }
        function buscarNs(e, prefijo) {
            for (; e && e.nodeType == 1; e = e.parentNode) {
                if (e.namespaceURI && (e.prefix || null) === prefijo) return e.namespaceURI;
                var v = prefijo === null ? e.getAttribute('xmlns') : e.getAttribute('xmlns:' + prefijo);
                if (v !== null) return v === '' ? null : v;
            }
            return null;
        }
        N.lookupNamespaceURI = function (prefijo) {
            prefijo = prefijo === undefined || prefijo === null || prefijo === '' ? null : String(prefijo);
            if (prefijo === 'xml') return 'http://www.w3.org/XML/1998/namespace';
            if (prefijo === 'xmlns') return 'http://www.w3.org/2000/xmlns/';
            return buscarNs(elementoDe(this), prefijo);
        };
        N.isDefaultNamespace = function (ns) {
            ns = ns === undefined || ns === null || ns === '' ? null : String(ns);
            return this.lookupNamespaceURI(null) === ns;
        };
        N.lookupPrefix = function (ns) {
            ns = ns === undefined || ns === null || ns === '' ? null : String(ns);
            if (ns === null) return null;
            for (var e = elementoDe(this); e && e.nodeType == 1; e = e.parentNode) {
                if (e.namespaceURI === ns && e.prefix) return e.prefix;
                for (var i = 0; i < e.attributes.length; i++) {
                    var a = e.attributes[i];
                    if (/^xmlns:/.test(a.name) && a.value === ns) return a.name.slice(6);
                }
            }
            return null;
        };
        interfaz('XMLDocument', function (o) { return o.nodeType == 9 && !!o.contentType && o.contentType != 'text/html'; });
        // compareDocumentPosition de dos árboles distintos: desconectados y en un orden fijo entre las dos raíces (un
        // número para cada raíz), el contrario al revés (DOM; WPT dom/nodes)
        (function () {
            var f = N.compareDocumentPosition, raices = new WeakMap(), siguiente = 1;
            if (typeof f != 'function') return;
            function numero(n) {
                while (n.parentNode) n = n.parentNode;
                if (!raices.has(n)) raices.set(n, siguiente++);
                return raices.get(n);
            }
            N.compareDocumentPosition = function (o) {
                if (!esNodo(o)) throw new TypeError("Failed to execute 'compareDocumentPosition': parameter 1 is not of type 'Node'.");
                if (o === this) return 0;
                var a = numero(this), b = numero(o);
                if (a !== b) return 1 + 32 + (b < a ? 2 : 4);
                return f.call(this, o);
            };
        })();
        // createProcessingInstruction: destino con nombre válido y datos sin "?>" (DOM; WPT dom/nodes)
        document.createProcessingInstruction = function (destino, datos) {
            destino = String(destino); datos = String(datos);
            if (!/^[A-Za-z_:\u00C0-\uFFFD][A-Za-z0-9_:.\-\u00B7-\uFFFD]*$/.test(destino))
                g.__dashweb_lanzar('InvalidCharacterError', "The target provided ('" + destino + "') is not a valid name.");
            if (datos.indexOf('?>') >= 0)
                g.__dashweb_lanzar('InvalidCharacterError', "The data provided ('" + datos + "') contains '?>'.");
            var n = __dashweb_instruccion(destino, datos);
            // (su prototipo es el de su destino, que no tiene data: el de los textos)
            var dd = Object.getOwnPropertyDescriptor(proto('#text'), 'data');
            if (dd) Object.defineProperty(n, 'data', dd);
            Object.defineProperty(n, 'length', Object.getOwnPropertyDescriptor(proto('#text'), 'length'));
            if (this && this !== document && this.nodeType == 9)
                try { Object.defineProperty(n, '__doc', {value: this, writable: true, configurable: true}); } catch (e) {}
            return n;
        };
        // createCDATASection: en un documento XML, un texto con nodeType 4; en uno HTML, NotSupportedError (DOM)
        document.createCDATASection = function (datos) {
            datos = String(datos);
            if (!this.contentType || this.contentType == 'text/html') g.__dashweb_lanzar('NotSupportedError', 'This operation is not supported for HTML documents.');
            if (datos.indexOf(']]>') >= 0) g.__dashweb_lanzar('InvalidCharacterError', "String cannot contain ']]>' since that is the end delimiter of a CData section.");
            var n = this.createTextNode(datos);
            Object.defineProperty(n, 'nodeType', {value: 4, configurable: true});
            Object.defineProperty(n, 'nodeName', {value: '#cdata-section', configurable: true});
            return n;
        };
        def('target', function () { return this.nodeType == 7 ? this.nodeName : undefined; },
            function (v) { Object.defineProperty(this, 'target', {value: v, writable: true, configurable: true}); });
        // prefix de un elemento: null (el de createElementNS con prefijo va en el propio elemento)
        def('prefix', function () { return this.nodeType == 1 ? null : undefined; },
            function (v) { Object.defineProperty(this, 'prefix', {value: v, writable: true, configurable: true}); });
        // ownerDocument de un nodo hecho por otro documento (createElement de uno de createHTMLDocument, de un marco...)
        // mientras está suelto: el que lo hizo (el de C sube por el árbol y, suelto, da la página)
        ['createElement', 'createElementNS', 'createTextNode', 'createComment', 'createDocumentFragment',
         'createProcessingInstruction', 'createCDATASection', 'createAttribute', 'createRange'].forEach(function (k) {
            var f = document[k];
            if (typeof f != 'function') return;
            document[k] = function () {
                var n = f.apply(this, arguments);
                if (this && this !== document && this.nodeType == 9 && n && typeof n == 'object')
                    try { Object.defineProperty(n, '__doc', {value: this, writable: true, configurable: true}); } catch (e) {}
                return n;
            };
        });
        var od = Object.getOwnPropertyDescriptor(N, 'ownerDocument');
        if (od && od.get) Object.defineProperty(N, 'ownerDocument', {configurable: true, get: function () {
            var d = od.get.call(this);
            if (d === document && this.__doc) {
                var r = this;
                while (r.parentNode) r = r.parentNode;
                if (r.nodeType != 9) return this.__doc;
            }
            return d;
        }});
        // new Text(), new Comment(), new DocumentFragment(), new Document() (DOM; WPT dom/nodes)
        g.Text.__construir = function (nt, a) { return document.createTextNode(a.length ? String(a[0]) : ''); };
        g.Comment.__construir = function (nt, a) { return document.createComment(a.length ? String(a[0]) : ''); };
        g.DocumentFragment.__construir = function () { return document.createDocumentFragment(); };
        g.Document.__construir = function () {
            var d = document.implementation.createDocument(null, null, null);
            Object.defineProperty(d, 'contentType', {value: 'application/xml', configurable: true});
            return d;
        };
        // (un selector que no vale da un DOMException SyntaxError, no un SyntaxError de JavaScript)
        ['querySelector', 'querySelectorAll', 'matches', 'closest', 'webkitMatchesSelector'].forEach(function (k) {
            var f = N[k];
            if (typeof f != 'function') return;
            N[k] = function () {
                try { return f.apply(this, arguments); }
                catch (e) {
                    if (e instanceof SyntaxError) g.__dashweb_lanzar('SyntaxError', e.message);
                    throw e;
                }
            };
        });
        // isSameNode, isEqualNode (DOM: mismo tipo, nombre, espacio de nombres, atributos, datos e hijos iguales) y
        // normalize (junta los textos seguidos y quita los vacíos)
        N.isSameNode = function (o) { return this === o; };
        N.isEqualNode = function igual(o) {
            if (!esNodo(o)) return false;
            var a = this, b = o;
            if (a === b) return true;
            if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
            if (a.nodeType == 1) {
                if (a.namespaceURI !== b.namespaceURI || a.prefix !== b.prefix || a.localName !== b.localName) return false;
                var x = a.attributes, y = b.attributes;
                if (x.length !== y.length) return false;
                for (var i = 0; i < x.length; i++) if (b.getAttribute(x[i].name) !== x[i].value) return false;
            } else if (a.nodeType == 10) {
                if (a.name !== b.name || a.publicId !== b.publicId || a.systemId !== b.systemId) return false;
            } else if (a.nodeType == 3 || a.nodeType == 4 || a.nodeType == 7 || a.nodeType == 8) {
                if (a.data !== b.data) return false;
            }
            var ha = a.childNodes, hb = b.childNodes;
            if (ha.length !== hb.length) return false;
            for (var k = 0; k < ha.length; k++) if (!igual.call(ha[k], hb[k])) return false;
            return true;
        };
        N.normalize = function () {
            var c = this.firstChild;
            while (c) {
                var sig = c.nextSibling;
                if (c.nodeType == 3) {
                    while (sig && sig.nodeType == 3) {
                        var mas = sig.nextSibling;
                        if (sig.data) cambiarDatos(c, c.data.length, 0, sig.data);
                        this.removeChild(sig);
                        sig = mas;
                    }
                    if (c.data === '') this.removeChild(c);
                } else if (c.nodeType == 1) c.normalize();
                c = sig;
            }
        };
    })();

    // Al acabar los scripts: DOMContentLoaded y load (como un navegador)
    g.__dashweb_cargado = function () {
        // (los <script> de la página ya los ejecutó dashweb: si el JavaScript los mueve, no otra vez)
        Array.prototype.forEach.call(document.getElementsByTagName('script'), function (s) {
            if (!s.__dashweb_hecho) Object.defineProperty(s, '__dashweb_hecho', {value: true});
        });
        Array.prototype.forEach.call(document.querySelectorAll('iframe, object, frame'), marcoPuesto);
        pon(document, 'readyState', 'interactive');
        despachar(document, new Ev('readystatechange'));
        despachar(document, new Ev('DOMContentLoaded', {bubbles: true}));
        pon(document, 'activeElement', document.body);
        // load, después de lo que DOMContentLoaded haya dejado para luego (el ready de jQuery), de las imágenes (como
        // un navegador; __dashweb_imgs lo pone dashweb, como mucho 60 s) y de las peticiones que ya iban (como mucho
        // 4 s). Hay páginas que ponen su addEventListener('load') tras un await fetch (la barra de noticias de
        // amigatronics.com no se movía bajo la cabecera; tarea 55)
        var desde = Date.now();
        g.setTimeout(function cargar() {
            var t = Date.now() - desde;
            if ((g.__dashweb_imgs > 0 && t < 60000) || (Object.keys(peticiones).length > 0 && t < 4000)) {
                g.setTimeout(cargar, 50);
                return;
            }
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
