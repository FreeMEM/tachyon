/* src_c/tachyon.c: el C de lib/js.dash, lib/lienzo.dash, lib/jsdom.dash, lib/html5.dash, lib/documento.dash (antes @c y @native; Dash 2.0 no compila C en los
   programas). Lo compila tools/build_pegamento.sh; los .dash lo llaman con @extern. */
#include <exec/types.h>
#include <exec/memory.h>
#include <exec/execbase.h>
#include <dos/dos.h>
#include <proto/exec.h>
#include <proto/dos.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include "dash_tipos.h"

/* ==== lib/js.dash ==== */
#include <quickjs.h>
/* lib/js.dash: a QuickJS runtime and context, and the last exception as Latin-1 */

/* QuickJS stops with assert() and abort() when something is broken inside: say so in the output (libnix only
   writes "Program aborted", and its assert goes to stderr, which nobody sees) before leaving with 127 */
/* El registro de depuración (tarea 54): las últimas líneas de lo que el programa dice de las páginas (console.log,
   los errores de JavaScript, lo que anota registro_anotar), en una cola circular de 32 KB; registro_texto lo da para
   el informe que el usuario manda desde Tachyon (lib/informe.dash) */
#define _REG_TAM 32768
static char _reg[_REG_TAM];
static int _reg_fin = 0, _reg_lleno = 0;
static void _registro(const char *t) {
    for (; t && *t; t++) {
        unsigned char c = (unsigned char)*t;
        _reg[_reg_fin++] = (c < 32 && c != 10 && c != 9) ? ' ' : (char)c;
        if (_reg_fin == _REG_TAM) { _reg_fin = 0; _reg_lleno = 1; }
    }
}
static void _js_decir(const char *t) { BPTR o = Output(); if (o) Write(o, (APTR)t, strlen(t)); _registro(t); }
/* a la salida y al registro */
static void _js_poner(const char *t) { PutStr((CONST_STRPTR)t); _registro(t); }
__stdargs void __assert_func(const char *f, int l, const char *fn, const char *e) {
    char b[200];
    sprintf(b, "dashweb: assert de QuickJS en %.60s:%d (%.40s): %.60s\n", f ? f : "?", l, fn ? fn : "?", e ? e : "?");
    _js_decir(b);
    exit(127);
}
void abort(void) {
    _js_decir("dashweb: abort (QuickJS u otra librería de C)\n");
    exit(127);
}
/* un assert de QuickJS que falla (third_party/quickjs/amiga/assert.h): cuál, y abort */
void _js_aserto(const char *e, const char *fichero, int linea) {
    char b[300];
    sprintf(b, "dashweb: assert de QuickJS: %.180s (%.60s, línea %d)\n", e, fichero, linea);
    _js_decir(b);
    abort();
}

/* The most memory one page's JavaScript may take: two thirds of the free memory when its engine is made, but
   never less than JS_MEMORIA nor more than JS_MEMORIA_MAX (QuickJS needs ~60 MB just to parse YouTube's 10.8 MB
   script: with 48 it ran out of memory and said "unexpected end of comment"; tarea 38a) */
#define JS_MEMORIA (48L * 1024 * 1024)
#define JS_MEMORIA_MAX (256L * 1024 * 1024)
static size_t _js_memoria_tope(void) {
    ULONG libre = AvailMem(MEMF_ANY), tope = libre / 3 * 2;
    if (tope < (ULONG)JS_MEMORIA) tope = JS_MEMORIA;
    if (tope > (ULONG)JS_MEMORIA_MAX) tope = JS_MEMORIA_MAX;
    return (size_t)tope;
}
typedef struct _JsMotorS {
    JSRuntime *rt;
    JSContext *ctx;
    char *error;
    void *extra;                                  /* other modules' data (lib/jsdom.dash) */
    void (*liberar_extra)(struct _JsMotorS *m);   /* called before the context is freed */
    APTR pool;                                    /* where its memory comes from (_jm_malloc) */
} _JsMotor;

/* js_gc_siempre: the cycle collector after every script, call and job (to find reference-count bugs) */
static int _js_gc_siempre = 0;

/* A script, call or job that runs longer than this is cut (a loop without end in a page left the whole browser
   hanging; tarea 40c): QuickJS asks _js_interrumpir every few thousand operations and, past the limit, the script
   gets "interrupted". Wall clock from DateStamp (in 1/50 s): a real A1200 runs the JavaScript ~50 times slower
   than the emulated RTG machine, so the limit is generous: 120 s (it was 30 and the cookie notice of xataka.com, whose
   button runs a slow reduce, was cut before closing; the user asked for more on 2026-10-22). */
#define JS_SEGUNDOS 120
static LONG _js_tope = JS_SEGUNDOS;
static ULONG _js_desde = 0;
static int _js_cortado = 0;
static ULONG _js_ms(void) {
    struct DateStamp ds;
    DateStamp(&ds);
    return ((ULONG)ds.ds_Days * 1440UL * 60UL + (ULONG)ds.ds_Minute * 60UL) * 1000UL + (ULONG)ds.ds_Tick * 20UL;
}
/* (each way into the JavaScript calls it: from then on the limit counts) */
static int _js_avisado = 0;
/* more time for a big script: 20 s per MB past the first (YouTube's 10.8 MB takes ~47 s just to parse in the emulated
   RTG machine, and then builds its whole app: it was cut at 120 s; tarea 38a) */
static LONG _js_extra = 0;
static void _js_empieza(void) { _js_desde = _js_ms(); _js_avisado = 0; _js_extra = 0; }
/* lo que tardó en compilarse el último script de js_evaluar */
static LONG _js_compilado_ms = 0;
/* el código de js_evaluar ya está en UTF-8 (js_evaluar_utf8): va a QuickJS tal cual */
static int _js_es_utf8 = 0;
/* Past the limit, first an "interrupted" that the script can catch (its catch and finally run: Preact's signals in
   xataka.com, cut inside a try/finally, kept a computed marked as running and every click after gave "Cycle
   detected"; tarea 42e); if it goes on 5 s more, one that it cannot. */
static int _js_interrumpir(JSRuntime *rt, void *o) {
    ULONG t;
    if (_js_tope <= 0)
        return 0;
    t = _js_ms() - _js_desde;
    if (t <= (ULONG)(_js_tope + _js_extra) * 1000UL)
        return 0;
    _js_cortado = 1;
    if (!_js_avisado) {
        _js_avisado = 1;
        JS_SetInterruptCatchable(rt, 1);
        return 1;
    }
    if (t > (ULONG)(_js_tope + _js_extra) * 1000UL + 5000UL) {
        JS_SetInterruptCatchable(rt, 0);
        return 1;
    }
    return 0;
}

#ifdef _JS_GUARDAS
/* To find who writes over QuickJS's memory (DASH_CFLAGS=-D_JS_GUARDAS): every block it asks for has 16 bytes in
   front (size, list, magic) and 16 of 0x5A behind; all of them are checked after every script, call and job, and
   on free. A broken one is written with the bytes that are there now. */
typedef struct _JgCab { struct _JgCab *ant, *sig; ULONG n, magia; } _JgCab;
static _JgCab *_jg_lista = NULL;
static int _jg_avisado = 0;
static _JgCab *_jg_cq_ini = NULL, *_jg_cq_fin = NULL;
static ULONG _jg_cq_bytes = 0;
#define _JG_MAGIA 0xA5C3E1F7UL
static void _jg_volcar(const char *que, _JgCab *c, unsigned char *p, int n) {
    char b[200], *q = b;
    int i;
    q += sprintf(q, "JSGUARDA %s: bloque %p de %lu bytes:", que, (void *)c, (unsigned long)(c->magia == _JG_MAGIA ? c->n : 0));
    for (i = 0; i < n && q - b < 180; i++) q += sprintf(q, " %02x", p[i]);
    printf("%s\n", b);
    fflush(stdout);
}
static int _jg_mal(_JgCab *c) {
    unsigned char *d;
    int i;
    if (c->magia != _JG_MAGIA) { if (!_jg_avisado++) _jg_volcar("cabecera pisada", c, (unsigned char *)c, 32); return 1; }
    d = (unsigned char *)(c + 1) + c->n;
    for (i = 0; i < 16; i++) if (d[i] != 0x5A) { if (!_jg_avisado++) _jg_volcar("detrás pisado", c, d, 32); return 1; }
    return 0;
}
/* a block in quarantine that someone wrote into after it was freed: where, what, and the block size */
static int _jg_cq_avisado = 0;
static void _jg_cq_revisar(_JgCab *c) {
    unsigned char *p = (unsigned char *)(c + 1);
    ULONG i;
    for (i = 0; i < c->n; i++) {
        if (p[i] != 0xDB) {
            if (_jg_cq_avisado++ < 4) {
                char b[200], *q = b;
                ULONG k;
                q += sprintf(q, "JSGUARDA escrito tras liberar: bloque de %lu bytes, en +%lu:", (unsigned long)c->n, (unsigned long)i);
                for (k = i & ~3UL; k < c->n && k < (i & ~3UL) + 24; k++) q += sprintf(q, " %02x", p[k]);
                printf("%s\n", b);
                fflush(stdout);
            }
            memset(p, 0xDB, c->n);
            return;
        }
    }
}
static void _jg_todo(void) {
    _JgCab *c;
    long k = 0;
    for (c = _jg_lista; c && k < 2000000; c = c->sig, k++) if (_jg_mal(c)) return;
    for (c = _jg_cq_ini; c; c = c->sig) _jg_cq_revisar(c);
}
static void *_jg_malloc(JSMallocState *s, size_t n) {
    _JgCab *c;
    if (s->malloc_size + n + 32 > s->malloc_limit) return NULL;
    c = (_JgCab *)malloc(sizeof(_JgCab) + n + 16);
    if (!c) return NULL;
    c->n = n;
    c->magia = _JG_MAGIA;
    memset((unsigned char *)(c + 1) + n, 0x5A, 16);
    c->ant = NULL;
    c->sig = _jg_lista;
    if (_jg_lista) _jg_lista->ant = c;
    _jg_lista = c;
    s->malloc_count++;
    s->malloc_size += n + 32;
    return c + 1;
}
/* the freed blocks wait here (filled with 0xDB) before going back to malloc: what still points at one sees 0xDB
   (up to _JG_CUARENTENA bytes; the oldest go back first) */
#define _JG_CUARENTENA (12L * 1024 * 1024)
static void _jg_free(JSMallocState *s, void *p) {
    _JgCab *c;
    if (!p) return;
    c = (_JgCab *)p - 1;
    if (_jg_mal(c)) return;      /* (lo dejamos: ya está avisado) */
    if (c->ant) c->ant->sig = c->sig; else _jg_lista = c->sig;
    if (c->sig) c->sig->ant = c->ant;
    s->malloc_count--;
    s->malloc_size -= c->n + 32;
    c->magia = 0xDEADDEADUL;
    memset(c + 1, 0xDB, c->n);
    c->sig = NULL;
    c->ant = _jg_cq_fin;
    if (_jg_cq_fin) _jg_cq_fin->sig = c; else _jg_cq_ini = c;
    _jg_cq_fin = c;
    _jg_cq_bytes += c->n + 32;
    while (_jg_cq_bytes > _JG_CUARENTENA && _jg_cq_ini) {
        _JgCab *v = _jg_cq_ini;
        _jg_cq_ini = v->sig;
        if (_jg_cq_ini) _jg_cq_ini->ant = NULL; else _jg_cq_fin = NULL;
        _jg_cq_bytes -= v->n + 32;
        _jg_cq_revisar(v);
        free(v);
    }
}
static void *_jg_realloc(JSMallocState *s, void *p, size_t n) {
    void *q;
    _JgCab *c;
    if (!p) return n ? _jg_malloc(s, n) : NULL;
    if (!n) { _jg_free(s, p); return NULL; }
    c = (_JgCab *)p - 1;
    if (_jg_mal(c)) return NULL;
    q = _jg_malloc(s, n);
    if (!q) return NULL;
    memcpy(q, p, c->n < n ? c->n : n);
    _jg_free(s, p);
    return q;
}
static size_t _jg_tamano(const void *p) { return p ? ((const _JgCab *)p - 1)->n : 0; }
static const JSMallocFunctions _jg_funciones = { _jg_malloc, _jg_free, _jg_realloc, _jg_tamano };
#endif

/* The memory of QuickJS, like quickjs.c's for the Amiga (its size in 8 bytes in front), but leaving the system a
   reserve: a sixteenth of all the memory, between 512 KB and 6 MB. Without it, YouTube's JavaScript took the last
   19 MB of the RTG machine and the whole Amiga stopped (not even a screen picture could be taken; tarea 38c2): now
   the script gets "out of memory" and the rest goes on. AvailMem is asked every 64 KB asked for (and for every
   block of 16 KB or more): asking it every time would cost too much.
   Each engine takes its memory from its own exec pool (puddles of 512 KB; 128 KB or more, a block of its own) and
   gives it all back with DeletePool. With libnix's malloc its blocks were mixed with the page's in the same 16 KB
   chunks: after YouTube, 61 MB free but no hole bigger than 5 MB, and the 10.5 MB of its next script did not fit
   anywhere (tarea 38c8, "Accept all" on 128 MB). */
#define _JM_CABECERA 8
#define _JM_CHARCO (512UL * 1024)
#define _JM_SOLO (128UL * 1024)
static ULONG _jm_reserva = 0, _jm_desde = 0;
static int _jm_hay(size_t n) {
    if (_jm_reserva == 0) {
        ULONG r = AvailMem(MEMF_ANY | MEMF_TOTAL) / 16;
        _jm_reserva = r < 512UL * 1024 ? 512UL * 1024 : r > 6UL * 1024 * 1024 ? 6UL * 1024 * 1024 : r;
    }
    _jm_desde += n;
    if (_jm_desde < 64UL * 1024 && n < 16UL * 1024) return 1;
    _jm_desde = 0;
    return AvailMem(MEMF_ANY) > _jm_reserva + n;
}
static size_t _jm_tamano(const void *p) { return p ? ((const size_t *)((const char *)p - _JM_CABECERA))[0] : 0; }
static void *_jm_malloc(JSMallocState *s, size_t n) {
    size_t *p;
    if (s->malloc_size + n > s->malloc_limit || !_jm_hay(n)) return NULL;
    p = (size_t *)AllocPooled((APTR)s->opaque, n + _JM_CABECERA);
    if (!p) return NULL;
    p[0] = n;
    s->malloc_count++;
    s->malloc_size += n + _JM_CABECERA;
    return (char *)p + _JM_CABECERA;
}
static void _jm_free(JSMallocState *s, void *q) {
    if (!q) return;
    s->malloc_count--;
    s->malloc_size -= _jm_tamano(q) + _JM_CABECERA;
    FreePooled((APTR)s->opaque, (char *)q - _JM_CABECERA, _jm_tamano(q) + _JM_CABECERA);
}
static void *_jm_realloc(JSMallocState *s, void *q, size_t n) {
    size_t antes, *p;
    if (!q) return n ? _jm_malloc(s, n) : NULL;
    if (!n) { _jm_free(s, q); return NULL; }
    antes = _jm_tamano(q);
    if (n > antes && (s->malloc_size + n - antes > s->malloc_limit || !_jm_hay(n - antes))) return NULL;
    p = (size_t *)AllocPooled((APTR)s->opaque, n + _JM_CABECERA);
    if (!p) return NULL;
    p[0] = n;
    memcpy((char *)p + _JM_CABECERA, q, antes < n ? antes : n);
    FreePooled((APTR)s->opaque, (char *)q - _JM_CABECERA, antes + _JM_CABECERA);
    s->malloc_size += n - antes;
    return (char *)p + _JM_CABECERA;
}
static const JSMallocFunctions _jm_funciones = { _jm_malloc, _jm_free, _jm_realloc, _jm_tamano };

static void _js_rechazos_decir(void);
/* The jobs waiting (Promise.then, async functions): run them all, up to a limit */
static void _js_trabajos(JSRuntime *rt) {
    JSContext *c;
    int i;
    _js_empieza();
    for (i = 0; i < 10000 && JS_ExecutePendingJob(rt, &c) > 0; i++) ;
    _js_rechazos_decir();
#ifdef _JS_GUARDAS
    _jg_todo();
#endif
    if (_js_gc_siempre) JS_RunGC(rt);
}

/* Latin-1 -> UTF-8 (malloc; free it) */
static char *_js_utf8(const char *s) {
    const unsigned char *p;
    char *r, *q;
    size_t n = 0;
    for (p = (const unsigned char *)s; *p; p++) n += *p < 0x80 ? 1 : 2;
    r = q = (char *)malloc(n + 1);
    if (!r) return NULL;
    for (p = (const unsigned char *)s; *p; p++) {
        if (*p < 0x80) *q++ = (char)*p;
        else { *q++ = (char)(0xC0 | (*p >> 6)); *q++ = (char)(0x80 | (*p & 0x3F)); }
    }
    *q = 0;
    return r;
}

/* What lib/texto.dash latin1_de puts for a code point outside Latin-1 (never longer than its UTF-8: it is written
   in place): "EUR" for the euro, straight quotes, "-", "..."; "?" for the rest */
static const char *_js_parecido(unsigned long c) {
    switch (c) {
    case 8216: case 8217: case 8218: case 8242: return "'";
    case 8249: return "\xAB";
    case 8250: return "\xBB";
    case 8220: case 8221: case 8222: case 8243: return "\"";
    case 8211: case 8212: case 8722: case 8208: case 8209: return "-";
    case 8230: return "...";
    case 8364: return "EUR";
    case 8482: return "TM";
    case 8226: return "\xB7";
    case 8194: case 8195: case 8201: case 8239: case 8287: return " ";
    case 8203: case 8204: case 8205: case 8206: case 8207: case 65279: return "";
    case 338: return "OE";
    case 339: return "oe";
    case 352: return "S";
    case 353: return "s";
    case 376: return "Y";
    case 381: return "Z";
    case 382: return "z";
    case 402: return "f";
    case 710: return "^";
    case 732: return "~";
    case 8224: case 8225: return "+";
    }
    return "?";
}

/* UTF-8 -> Latin-1 in place (it only gets shorter); what does not fit, like latin1_de (tarea 42e: el precio en euros
   del aviso de xataka.com salía "2?") */
static void _js_latin1(char *s) {
    unsigned char *p = (unsigned char *)s, *q = (unsigned char *)s;
    while (*p) {
        unsigned long c = *p++;
        int more = c >= 0xF0 ? 3 : c >= 0xE0 ? 2 : c >= 0xC0 ? 1 : 0;
        if (c >= 0x80 && c < 0xC0) { *q++ = '?'; continue; }
        if (more) c &= 0x3F >> more;
        while (more-- > 0 && (*p & 0xC0) == 0x80) c = (c << 6) | (*p++ & 0x3F);
        if (c < 0x100) {
            *q++ = (unsigned char)c;
        } else {
            const char *r = _js_parecido(c);
            /* (the replacement is never longer than what was read, so q never overtakes p) */
            while (*r && q < p) *q++ = (unsigned char)*r++;
        }
    }
    *q = 0;
}

/* A JS value as a Latin-1 C string (malloc; free it) */
static char *_js_texto(JSContext *ctx, JSValueConst v) {
    const char *s = JS_ToCString(ctx, v);
    char *r;
    if (!s) return NULL;
    r = (char *)malloc(strlen(s) + 1);
    if (r) { strcpy(r, s); _js_latin1(r); }
    JS_FreeCString(ctx, s);
    return r;
}

static JSValue _js_console_log(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    int i;
    for (i = 0; i < argc; i++) {
        char *s = _js_texto(ctx, argv[i]);
        if (i) _js_poner(" ");
        _js_poner(s ? s : "?");
        free(s);
        /* an error, with where it happened (React and Next.js report theirs with console.error) */
        if (JS_IsError(ctx, argv[i])) {
            JSValue pila = JS_GetPropertyStr(ctx, argv[i], "stack");
            char *l = JS_IsUndefined(pila) ? NULL : _js_texto(ctx, pila), *p;
            for (p = l; p && *p; p++) if (*p == '\n') *p = ' ';
            if (l && *l) { _js_poner(" |"); _js_poner(l); }
            free(l);
            JS_FreeValue(ctx, pila);
        }
    }
    _js_poner("\n");
    return JS_UNDEFINED;
}

/* The pending exception as text: "Error: message" and its stack, if it has one */
static char *_js_excepcion(JSContext *ctx) {
    JSValue ex = JS_GetException(ctx), pila;
    char *texto = _js_texto(ctx, ex), *lugar = NULL, *r;
    if (JS_IsError(ctx, ex)) {
        pila = JS_GetPropertyStr(ctx, ex, "stack");
        if (!JS_IsUndefined(pila)) lugar = _js_texto(ctx, pila);
        JS_FreeValue(ctx, pila);
    }
    JS_FreeValue(ctx, ex);
    if (!lugar || !*lugar) { free(lugar); return texto; }
    r = (char *)malloc((texto ? strlen(texto) : 0) + strlen(lugar) + 2);
    if (r) sprintf(r, "%s\n%s", texto ? texto : "", lugar);
    free(texto);
    free(lugar);
    while (r && *r && r[strlen(r) - 1] == '\n') r[strlen(r) - 1] = 0;
    return r;
}
/* A promise rejected with nobody to catch it (as browsers do, to the output): without this the errors of
   async code (React, Turbopack's chunk loading) were lost. Like browsers, it is said after the jobs (a promise
   rejected and caught right away, fetch(...).catch(...), is not a rejection without a catch): _js_rechazos_decir */
#define _JS_RECHAZOS 16
static void *_js_rech_p[_JS_RECHAZOS];
static char *_js_rech_t[_JS_RECHAZOS];
static int _js_rech_n = 0;
static void _js_rechazos_decir(void) {
    int i;
    for (i = 0; i < _js_rech_n; i++) {
        PutStr((CONST_STRPTR)"JS (promesa sin capturar): ");
        PutStr((CONST_STRPTR)_js_rech_t[i]);
        PutStr((CONST_STRPTR)"\n");
        free(_js_rech_t[i]);
    }
    _js_rech_n = 0;
}
static void _js_rechazo(JSContext *ctx, JSValueConst promesa, JSValueConst motivo, JS_BOOL atendida, void *op) {
    char *t, *lugar = NULL, *p, *r;
    JSValue pila;
    void *clave = JS_VALUE_GET_PTR(promesa);
    int i;
    if (atendida) {
        for (i = 0; i < _js_rech_n; i++)
            if (_js_rech_p[i] == clave) {
                free(_js_rech_t[i]);
                _js_rech_n--;
                _js_rech_p[i] = _js_rech_p[_js_rech_n];
                _js_rech_t[i] = _js_rech_t[_js_rech_n];
                break;
            }
        return;
    }
    t = _js_texto(ctx, motivo);
    if (JS_IsError(ctx, motivo)) {
        pila = JS_GetPropertyStr(ctx, motivo, "stack");
        if (!JS_IsUndefined(pila)) lugar = _js_texto(ctx, pila);
        JS_FreeValue(ctx, pila);
    }
    for (p = lugar; p && *p; p++) if (*p == '\n') *p = ' ';
    r = (char *)malloc((t ? strlen(t) : 1) + (lugar ? strlen(lugar) : 0) + 4);
    if (r) sprintf(r, "%s%s%s", t ? t : "?", lugar && *lugar ? " | " : "", lugar && *lugar ? lugar : "");
    free(t);
    free(lugar);
    if (!r) return;
    if (_js_rech_n == _JS_RECHAZOS) _js_rechazos_decir();
    _js_rech_p[_js_rech_n] = clave;
    _js_rech_t[_js_rech_n] = r;
    _js_rech_n++;
}
#ifdef JS_PERFIL
/* the profile's samples: a VBlank interrupt server (50 a second) while a runtime lives */
#include <hardware/intbits.h>
static struct Interrupt _jp_int;
static JSRuntime *volatile _jp_rt = NULL;
static ULONG _jp_vblank(APTR datos __asm("a1")) {
    if (_jp_rt) JS_PerfilMuestra(_jp_rt);
    return 0;
}
static void _jp_empezar(JSRuntime *rt) {
    if (_jp_rt) return;
    _jp_int.is_Node.ln_Type = NT_INTERRUPT;
    _jp_int.is_Node.ln_Pri = -60;
    _jp_int.is_Node.ln_Name = (char *)"dashweb perfil JS";
    _jp_int.is_Data = NULL;
    _jp_int.is_Code = (void (*)())_jp_vblank;
    _jp_rt = rt;
    AddIntServer(INTB_VERTB, &_jp_int);
}
static void _jp_parar(JSRuntime *rt) {
    if (_jp_rt != rt) return;
    RemIntServer(INTB_VERTB, &_jp_int);
    _jp_rt = NULL;
}
#endif
void js_perfil_volcar(LONG js, LONG cuantas)
{
#ifdef JS_PERFIL
    _JsMotor *m = (_JsMotor *)js;
    if (m) JS_PerfilVolcar(m->ctx, (int)cuantas);
#endif
}
LONG js_nuevo(void)
{
    _JsMotor *m = (_JsMotor *)calloc(1, sizeof(_JsMotor));
    JSValue global, console;
    if (!m) return 0;
#ifdef _JS_GUARDAS
    m->rt = JS_NewRuntime2(&_jg_funciones, NULL);
#else
    m->pool = CreatePool(MEMF_ANY, _JM_CHARCO, _JM_SOLO);
    if (!m->pool) { free(m); return 0; }
    m->rt = JS_NewRuntime2(&_jm_funciones, m->pool);
#endif
    if (m->rt) {
        /* the stack the program really has, less 64 KB for the C below QuickJS: 192 KB with the 256 KB of @stack here
           (the tests, on an A1200 with 8 MB, cannot ask for more: libnix's swapstack waits on a requester when it
           cannot get it), ~960 KB in the browser, whose @stack is 1 MB (Polymer stamping its templates in YouTube
           overflowed 192 KB; tarea 38) */
        {
            struct Task *yo = FindTask(NULL);
            ULONG pila = (ULONG)yo->tc_SPUpper - (ULONG)yo->tc_SPLower;
            JS_SetMaxStackSize(m->rt, pila > 128 * 1024 ? pila - 64 * 1024 : 64 * 1024);
        }
        /* a page whose JavaScript wants more gets "out of memory" in its script, instead of leaving the whole
           Amiga without memory (Next.js on commodoremalacca.club took the 128 MB of the RTG machine) */
        JS_SetMemoryLimit(m->rt, _js_memoria_tope());
        JS_SetHostPromiseRejectionTracker(m->rt, _js_rechazo, NULL);
        JS_SetInterruptHandler(m->rt, _js_interrumpir, NULL);
#ifdef JS_PERFIL
        _jp_empezar(m->rt);
#endif
        m->ctx = JS_NewContext(m->rt);
    }
    if (!m->ctx) {
        if (m->rt) JS_FreeRuntime(m->rt);
        if (m->pool) DeletePool(m->pool);
        free(m);
        return 0;
    }
    global = JS_GetGlobalObject(m->ctx);
    console = JS_NewObject(m->ctx);
    JS_SetPropertyStr(m->ctx, console, "log", JS_NewCFunction(m->ctx, _js_console_log, "log", 1));
    JS_SetPropertyStr(m->ctx, console, "info", JS_NewCFunction(m->ctx, _js_console_log, "info", 1));
    JS_SetPropertyStr(m->ctx, console, "warn", JS_NewCFunction(m->ctx, _js_console_log, "warn", 1));
    JS_SetPropertyStr(m->ctx, console, "error", JS_NewCFunction(m->ctx, _js_console_log, "error", 1));
    JS_SetPropertyStr(m->ctx, global, "console", console);
    JS_FreeValue(m->ctx, global);
    return (LONG)m;
}
STRPTR js_evaluar(LONG js, STRPTR codigo, STRPTR nombre)
{
    _JsMotor *m = (_JsMotor *)js;
    char *fuente, *texto;
    int copia, grande, quitar = 0;
    ULONG t0;
    JSValue v;
    STRPTR r;
    if (!m) return (STRPTR)"";
    free(m->error);
    m->error = NULL;
    /* todo ASCII (un script minificado casi siempre): ya es UTF-8, sin copia (el de YouTube son 10,8 MB menos mientras
       QuickJS lo analiza, que es cuando más memoria pide; tarea 38a) */
    {
        const unsigned char *p = (const unsigned char *)(codigo ? (const char *)codigo : "");
        while (*p && *p < 0x80) p++;
        copia = *p != 0 && !_js_es_utf8;
        fuente = copia ? _js_utf8(codigo ? (const char *)codigo : "") : (char *)(codigo ? (const char *)codigo : "");
    }
    if (!fuente) { m->error = strdup("sin memoria"); return (STRPTR)""; }
    _js_empieza();
    /* un script de más de 1 MB: 20 s más por MB y sin guardar su código fuente para toString() (QuickJS copia el
       texto de cada función, también el de las de dentro: con el de YouTube, de 10,8 MB, eran ~15 MB más al
       analizarlo; sin memoria, QuickJS da errores de sintaxis que no son, como "unexpected end of comment") */
    grande = strlen(fuente) > 1048576;
    if (grande) {
        _js_extra = (LONG)(strlen(fuente) / 1048576) * 20;
        quitar = JS_GetStripInfo(m->rt);
        JS_SetStripInfo(m->rt, quitar | JS_STRIP_SOURCE);
    }
    /* compilar y ejecutar por separado, para js_ms_compilar (como JS_Eval sin COMPILE_ONLY) */
    t0 = _js_ms();
    v = JS_Eval(m->ctx, fuente, strlen(fuente), nombre ? (const char *)nombre : "<js>", JS_EVAL_TYPE_GLOBAL | JS_EVAL_FLAG_COMPILE_ONLY);
    _js_compilado_ms = (LONG)(_js_ms() - t0);
    if (grande)
        JS_SetStripInfo(m->rt, quitar);
    if (copia) free(fuente);
    if (!JS_IsException(v))
        v = JS_EvalFunction(m->ctx, v);
    _js_trabajos(m->rt);
    if (JS_IsException(v)) {
        m->error = _js_excepcion(m->ctx);
        if (!m->error) m->error = strdup("error");
        return (STRPTR)"";
    }
    texto = _js_texto(m->ctx, v);
    JS_FreeValue(m->ctx, v);
    r = _dash_str_dup((STRPTR)(texto ? texto : ""), TRUE);
    free(texto);
    return r;
}
/* js_evaluar con un código que ya está en UTF-8 (un script de fuera, tal como llegó): sin pasarlo de Latin-1 a UTF-8,
   así que sin copiarlo (el de YouTube son 10,8 MB; con 128 MB no había otro hueco así; tarea 38c8) */
STRPTR js_evaluar_utf8(LONG js, STRPTR codigo, STRPTR nombre)
{
    STRPTR r;
    _js_es_utf8 = 1;
    r = js_evaluar(js, codigo, nombre);
    _js_es_utf8 = 0;
    return r;
}
LONG js_ms_compilar(void)
{
    return _js_compilado_ms;
}
STRPTR js_evaluar_guardado(LONG js, STRPTR codigo, STRPTR nombre)
{
    static uint8_t *bc = NULL;
    static size_t bc_largo = 0, bc_fuente = 0;
    static ULONG bc_suma = 0;
    _JsMotor *m = (_JsMotor *)js;
    const char *t = codigo ? (const char *)codigo : "";
    size_t n = strlen(t), i;
    ULONG suma = 5381;
    JSValue f, v;
    char *texto;
    STRPTR r;
    if (!m) return (STRPTR)"";
    free(m->error);
    m->error = NULL;
    for (i = 0; i < n; i++) suma = suma * 33 + (unsigned char)t[i];
    /* el de otra vez, de T: (cabecera: "TPBC", largo del texto, su suma y largo del bytecode) */
    if (!bc || bc_fuente != n || bc_suma != suma) {
        BPTR f2 = Open((STRPTR)"T:tachyon_preludio.bc", MODE_OLDFILE);
        if (f2) {
            ULONG cab[4];
            if (Read(f2, cab, sizeof(cab)) == sizeof(cab) && cab[0] == 0x54504243UL && cab[1] == n && cab[2] == suma && cab[3] > 0 && cab[3] < 4000000UL) {
                uint8_t *nb = (uint8_t *)malloc(cab[3]);
                if (nb && Read(f2, nb, cab[3]) == (LONG)cab[3]) { free(bc); bc = nb; bc_largo = cab[3]; bc_fuente = n; bc_suma = suma; }
                else free(nb);
            }
            Close(f2);
        }
    }
    if (!bc || bc_fuente != n || bc_suma != suma) {
        char *fuente = _js_utf8(t);
        uint8_t *b;
        size_t largo;
        if (!fuente) { m->error = strdup("sin memoria"); return (STRPTR)""; }
        _js_empieza();
        f = JS_Eval(m->ctx, fuente, strlen(fuente), nombre ? (const char *)nombre : "<js>", JS_EVAL_TYPE_GLOBAL | JS_EVAL_FLAG_COMPILE_ONLY);
        free(fuente);
        if (JS_IsException(f)) {
            m->error = _js_excepcion(m->ctx);
            if (!m->error) m->error = strdup("error");
            return (STRPTR)"";
        }
        b = JS_WriteObject(m->ctx, &largo, f, JS_WRITE_OBJ_BYTECODE);
        JS_FreeValue(m->ctx, f);
        if (b) {
            free(bc);
            bc = (uint8_t *)malloc(largo);
            if (bc) {
                BPTR f2;
                memcpy(bc, b, largo); bc_largo = largo; bc_fuente = n; bc_suma = suma;
                /* para los programas que vengan (a un nombre aparte y luego al de verdad: dos Tachyon a la vez); solo
                   con memoria de sobra: el fichero de RAM: se queda en medio de la memoria libre y la parte, y en una
                   máquina de 8 MB el siguiente programa grande ya no cabía ("not enough memory") */
                f2 = AvailMem(MEMF_ANY | MEMF_LARGEST) > 32UL * 1024 * 1024
                     ? Open((STRPTR)"T:tachyon_preludio.bc.nuevo", MODE_NEWFILE) : 0;
                if (f2) {
                    ULONG cab[4];
                    LONG bien;
                    cab[0] = 0x54504243UL; cab[1] = n; cab[2] = suma; cab[3] = largo;
                    bien = Write(f2, cab, sizeof(cab)) == sizeof(cab) && Write(f2, bc, largo) == (LONG)largo;
                    Close(f2);
                    DeleteFile((STRPTR)"T:tachyon_preludio.bc");
                    if (!bien || !Rename((STRPTR)"T:tachyon_preludio.bc.nuevo", (STRPTR)"T:tachyon_preludio.bc"))
                        DeleteFile((STRPTR)"T:tachyon_preludio.bc.nuevo");
                }
            }
            js_free(m->ctx, b);
        }
        if (!bc) { m->error = strdup("sin memoria"); return (STRPTR)""; }
    }
    _js_empieza();
    f = JS_ReadObject(m->ctx, bc, bc_largo, JS_READ_OBJ_BYTECODE);
    if (JS_IsException(f)) {
        m->error = _js_excepcion(m->ctx);
        if (!m->error) m->error = strdup("error");
        return (STRPTR)"";
    }
    v = JS_EvalFunction(m->ctx, f);
    _js_trabajos(m->rt);
    if (JS_IsException(v)) {
        m->error = _js_excepcion(m->ctx);
        if (!m->error) m->error = strdup("error");
        return (STRPTR)"";
    }
    texto = _js_texto(m->ctx, v);
    JS_FreeValue(m->ctx, v);
    r = _dash_str_dup((STRPTR)(texto ? texto : ""), TRUE);
    free(texto);
    return r;
}
void js_gc_siempre(LONG si)
{
    _js_gc_siempre = si ? 1 : 0;
}
void registro_anotar(STRPTR texto)
{
    _registro((const char *)texto);
    _registro("\n");
}
STRPTR registro_texto(void)
{
    static char *salida = NULL;
    int n = _reg_lleno ? _REG_TAM : _reg_fin, i = 0;
    free(salida);
    salida = (char *)malloc(n + 1);
    if (!salida) return (STRPTR)"";
    if (_reg_lleno) {
        memcpy(salida, _reg + _reg_fin, _REG_TAM - _reg_fin);
        memcpy(salida + (_REG_TAM - _reg_fin), _reg, _reg_fin);
        while (i < n && salida[i] != '\n') i++;
        if (i < n) i++;
    } else
        memcpy(salida, _reg, n);
    salida[n] = 0;
    return (STRPTR)(salida + i);
}
LONG js_cortado(void)
{
    int r = _js_cortado;
    _js_cortado = 0;
    return r;
}
void js_tope(LONG segundos)
{
    _js_tope = segundos;
}
LONG js_memoria(LONG js)
{
    _JsMotor *m = (_JsMotor *)js;
    JSMemoryUsage u;
    if (!m) return 0;
    JS_ComputeMemoryUsage(m->rt, &u);
    return (LONG)u.malloc_size;
}
void js_limite(LONG js, LONG bytes)
{
    _JsMotor *m = (_JsMotor *)js;
    if (m) JS_SetMemoryLimit(m->rt, (size_t)bytes);
}
STRPTR js_error(LONG js)
{
    _JsMotor *m = (_JsMotor *)js;
    return (STRPTR)(m && m->error ? m->error : "");
}
void js_liberar(LONG js)
{
    _JsMotor *m = (_JsMotor *)js;
    if (!m) return;
    if (m->liberar_extra) m->liberar_extra(m);
#ifdef JS_PERFIL
    _jp_parar(m->rt);
#endif
    JS_FreeContext(m->ctx);
    JS_FreeRuntime(m->rt);
    if (m->pool) DeletePool(m->pool);
    free(m->error);
    free(m);
}

/* ==== lib/lienzo.dash ==== */
#include <math.h>
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif
#define LZ_CACHE 8
#define LZ_PILA 8
typedef struct {
    double mu[6];
    ULONG relleno, trazo;
    double grosor;
    LONG alfa;
} _LzEstado;
typedef struct _Lienzo {
    struct _Lienzo *sig;
    APTR nodo;
    LONG w, h, div, bw, bh;
    UBYTE *rgb;
    ULONG fondo;
    double m[6];                 /* la del usuario con el 1/div */
    _LzEstado e;
    _LzEstado pila[LZ_PILA];
    LONG npila;
    double *px, *py;             /* el camino, en coordenadas del búfer */
    UBYTE *nuevo;                /* 1: empieza un subcamino */
    LONG n, cap;
    LONG sucio, sx0, sy0, sx1, sy1;
    char clave[LZ_CACHE][48];
    ULONG valor[LZ_CACHE];
    LONG prox;
} _Lienzo;
static _Lienzo *_lienzos = NULL;

static void _lz_matriz(_Lienzo *l) {
    double k = 1.0 / l->div;
    LONG i;
    for (i = 0; i < 6; i++) l->m[i] = l->e.mu[i] * k;
}

static void _lz_inicial(_Lienzo *l) {
    l->e.mu[0] = 1; l->e.mu[1] = 0; l->e.mu[2] = 0; l->e.mu[3] = 1; l->e.mu[4] = 0; l->e.mu[5] = 0;
    l->e.relleno = 0xFF000000UL;
    l->e.trazo = 0xFF000000UL;
    l->e.grosor = 1.0;
    l->e.alfa = 255;
    l->npila = 0;
    l->n = 0;
    _lz_matriz(l);
}

static void _lz_marcar(_Lienzo *l, LONG x0, LONG y0, LONG x1, LONG y1) {
    if (x0 < 0) x0 = 0;
    if (y0 < 0) y0 = 0;
    if (x1 >= l->bw) x1 = l->bw - 1;
    if (y1 >= l->bh) y1 = l->bh - 1;
    if (x0 > x1 || y0 > y1) return;
    if (!l->sucio) { l->sx0 = x0; l->sy0 = y0; l->sx1 = x1; l->sy1 = y1; l->sucio = 1; return; }
    if (x0 < l->sx0) l->sx0 = x0;
    if (y0 < l->sy0) l->sy0 = y0;
    if (x1 > l->sx1) l->sx1 = x1;
    if (y1 > l->sy1) l->sy1 = y1;
}

/* El tamaño (width, height): el búfer otra vez, del color de detrás, y el estado de siempre (como en los navegadores) */
static void _lz_tam(_Lienzo *l, LONG w, LONG h) {
    LONG i, n;
    UBYTE r, g, b, *p;
    if (w < 1) w = 1;
    if (h < 1) h = 1;
    if (w > 4096) w = 4096;
    if (h > 4096) h = 4096;
    l->w = w;
    l->h = h;
    l->div = w * h > LZ_GRANDE ? 2 : 1;
    l->bw = (w + l->div - 1) / l->div;
    l->bh = (h + l->div - 1) / l->div;
    if (l->rgb) free(l->rgb);
    n = l->bw * l->bh;
    l->rgb = (UBYTE *)malloc(n * 3);
    if (l->rgb) {
        r = (UBYTE)(l->fondo >> 16); g = (UBYTE)(l->fondo >> 8); b = (UBYTE)l->fondo;
        for (i = 0, p = l->rgb; i < n; i++) { *p++ = r; *p++ = g; *p++ = b; }
    }
    _lz_inicial(l);
    _lz_marcar(l, 0, 0, l->bw - 1, l->bh - 1);
}

static _Lienzo *_lz_nuevo(APTR nodo, LONG w, LONG h, ULONG fondo) {
    _Lienzo *l = (_Lienzo *)calloc(1, sizeof(_Lienzo));
    if (!l) return NULL;
    l->nodo = nodo;
    l->fondo = fondo & 0xFFFFFF;
    _lz_tam(l, w, h);
    l->sig = _lienzos;
    _lienzos = l;
    return l;
}

static void _lz_liberar(_Lienzo *l) {
    _Lienzo **p;
    if (!l) return;
    for (p = &_lienzos; *p; p = &(*p)->sig) if (*p == l) { *p = l->sig; break; }
    if (l->rgb) free(l->rgb);
    if (l->px) free(l->px);
    if (l->py) free(l->py);
    if (l->nuevo) free(l->nuevo);
    free(l);
}

/* === Colores: "#rgb", "#rrggbb", "#rrggbbaa", rgb()/rgba() (con % o decimales), transparent y unos nombres === */

static LONG _lz_hex(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static ULONG _lz_leer_color(const char *s, ULONG antes) {
    static const struct { const char *n; ULONG v; } nombres[] = {
        {"black", 0x000000}, {"white", 0xFFFFFF}, {"red", 0xFF0000}, {"green", 0x008000}, {"lime", 0x00FF00},
        {"blue", 0x0000FF}, {"yellow", 0xFFFF00}, {"gray", 0x808080}, {"grey", 0x808080}, {"orange", 0xFFA500},
        {"purple", 0x800080}, {"cyan", 0x00FFFF}, {"magenta", 0xFF00FF}, {"silver", 0xC0C0C0}, {"navy", 0x000080}
    };
    LONG i, n, v[4], k;
    while (*s == ' ') s++;
    if (*s == '#') {
        s++;
        for (n = 0; _lz_hex(s[n]) >= 0; n++) ;
        if (n == 3 || n == 4) {
            for (i = 0; i < n; i++) v[i] = _lz_hex(s[i]) * 17;
            return ((ULONG)(n == 4 ? v[3] : 255) << 24) | (v[0] << 16) | (v[1] << 8) | v[2];
        }
        if (n == 6 || n == 8) {
            for (i = 0; i < n / 2; i++) v[i] = _lz_hex(s[2 * i]) * 16 + _lz_hex(s[2 * i + 1]);
            return ((ULONG)(n == 8 ? v[3] : 255) << 24) | (v[0] << 16) | (v[1] << 8) | v[2];
        }
        return antes;
    }
    if (!strncmp(s, "rgb", 3)) {
        /* deprisa, con enteros: "rgba(232, 236, 248, 0.83123...)" (las estrellas cambian de alfa en cada una) */
        const char *q = s + 3;
        if (*q == 'a') q++;
        if (*q == '(') {
            LONG ok = 1, f, d;
            q++;
            for (k = 0; k < 4 && ok; k++) {
                while (*q == ' ' || *q == ',') q++;
                if (*q == ')' || !*q) break;
                if (*q < '0' || *q > '9') { if (*q != '.') { ok = 0; break; } }
                for (v[k] = 0; *q >= '0' && *q <= '9'; q++) v[k] = v[k] * 10 + (*q - '0');
                f = 0; d = 1;
                if (*q == '.') for (q++; *q >= '0' && *q <= '9'; q++) if (d < 10000) { f = f * 10 + (*q - '0'); d *= 10; }
                if (*q == '%' || *q == 'e' || *q == 'E') { ok = 0; break; }
                v[k] = k == 3 ? (v[k] * 255 + f * 255 / d) : (v[k] + (f * 2 >= d ? 1 : 0));
                if (v[k] > 255) v[k] = 255;
            }
            if (ok && k >= 3) {
                if (k == 3) v[3] = 255;
                return ((ULONG)v[3] << 24) | (v[0] << 16) | (v[1] << 8) | v[2];
            }
        }
    }
    if (!strncmp(s, "rgb", 3)) {
        const char *p = strchr(s, '(');
        double d;
        if (!p) return antes;
        p++;
        v[3] = 255;
        for (k = 0; k < 4; k++) {
            char *fin;
            while (*p == ' ' || *p == ',' || *p == '/') p++;
            if (*p == ')' || !*p) break;
            d = strtod(p, &fin);
            if (fin == p) break;
            p = fin;
            if (*p == '%') { d = d * (k == 3 ? 0.01 : 2.55); p++; }
            else if (k == 3) d = d * 255.0;
            v[k] = d < 0 ? 0 : d > 255 ? 255 : (LONG)(d + 0.5);
        }
        if (k < 3) return antes;
        return ((ULONG)v[3] << 24) | (v[0] << 16) | (v[1] << 8) | v[2];
    }
    if (!strcmp(s, "transparent")) return 0;
    for (i = 0; i < (LONG)(sizeof(nombres) / sizeof(nombres[0])); i++)
        if (!strcmp(s, nombres[i].n)) return 0xFF000000UL | nombres[i].v;
    return antes;
}

static ULONG _lz_color(_Lienzo *l, const char *s, ULONG antes) {
    LONG i;
    ULONG c;
    if (strlen(s) >= sizeof(l->clave[0])) return _lz_leer_color(s, antes);
    for (i = 0; i < LZ_CACHE; i++) if (!strcmp(l->clave[i], s)) return l->valor[i];
    c = _lz_leer_color(s, antes);
    strcpy(l->clave[l->prox], s);
    l->valor[l->prox] = c;
    l->prox = (l->prox + 1) % LZ_CACHE;
    return c;
}

/* === Pixeles === */

/* La transparencia efectiva de un color (con globalAlpha), 0-256 (256: opaco) */
static LONG _lz_alfa(_Lienzo *l, ULONG c) {
    LONG a = (LONG)(c >> 24) * l->e.alfa / 255;
    return a >= 255 ? 256 : a;
}

static void _lz_tramo(_Lienzo *l, LONG y, LONG x0, LONG x1, ULONG c, LONG a) {
    UBYTE *p, r, g, b;
    LONG n;
    if (y < 0 || y >= l->bh) return;
    if (x0 < 0) x0 = 0;
    if (x1 >= l->bw) x1 = l->bw - 1;
    if (x0 > x1 || a <= 0) return;
    p = l->rgb + (y * l->bw + x0) * 3;
    n = x1 - x0 + 1;
    r = (UBYTE)(c >> 16); g = (UBYTE)(c >> 8); b = (UBYTE)c;
    if (a >= 256) {
        while (n--) { *p++ = r; *p++ = g; *p++ = b; }
    } else {
        /* una tabla de lo que queda de cada valor con esta transparencia (se rehace solo si cambia): sin multiplicar
           por cada píxel (el velo translúcido de las estrellas cubre el lienzo entero en cada fotograma) */
        static UBYTE tabla[256];
        static LONG tabla_a = -1;
        UBYTE kr = (UBYTE)((r * a) >> 8), kg = (UBYTE)((g * a) >> 8), kb = (UBYTE)((b * a) >> 8);
        if (a != tabla_a) {
            LONG i, ia = 256 - a;
            for (i = 0; i < 256; i++) tabla[i] = (UBYTE)((i * ia) >> 8);
            tabla_a = a;
        }
        while (n--) {
            p[0] = tabla[p[0]] + kr;
            p[1] = tabla[p[1]] + kg;
            p[2] = tabla[p[2]] + kb;
            p += 3;
        }
    }
}

static void _lz_punto(_Lienzo *l, LONG x, LONG y, LONG r, LONG g, LONG b, LONG a) {
    UBYTE *p;
    if ((ULONG)x >= (ULONG)l->bw || (ULONG)y >= (ULONG)l->bh) return;
    p = l->rgb + (y * l->bw + x) * 3;
    if (a >= 256) { p[0] = (UBYTE)r; p[1] = (UBYTE)g; p[2] = (UBYTE)b; return; }
    p[0] = (UBYTE)((p[0] * (256 - a) + r * a) >> 8);
    p[1] = (UBYTE)((p[1] * (256 - a) + g * a) >> 8);
    p[2] = (UBYTE)((p[2] * (256 - a) + b * a) >> 8);
}

/* Una línea de un píxel (DDA en coma fija 16.16), con su mezcla */
static void _lz_linea(_Lienzo *l, double x0, double y0, double x1, double y1, ULONG c, LONG a) {
    double dx = x1 - x0, dy = y1 - y0;
    LONG pasos, i, fx, fy, sx, sy, r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    pasos = (LONG)(fabs(dx) > fabs(dy) ? fabs(dx) : fabs(dy));
    if (pasos > 8192) return;
    if (pasos < 1) pasos = 1;
    fx = (LONG)(x0 * 65536.0); fy = (LONG)(y0 * 65536.0);
    sx = (LONG)(dx * 65536.0 / pasos); sy = (LONG)(dy * 65536.0 / pasos);
    for (i = 0; i <= pasos; i++) {
        _lz_punto(l, fx >> 16, fy >> 16, r, g, b, a);
        fx += sx; fy += sy;
    }
    _lz_marcar(l, (LONG)(x0 < x1 ? x0 : x1) - 1, (LONG)(y0 < y1 ? y0 : y1) - 1,
               (LONG)(x0 > x1 ? x0 : x1) + 1, (LONG)(y0 > y1 ? y0 : y1) + 1);
}

/* Un polígono relleno (par-impar): sus vértices en px/py[0..n-1]; nuevo[i] (o NULL: uno solo) marca dónde empieza
   cada subcamino, que se cierra solo. Cada fila mira solo los subcaminos que la cruzan: la bola Boing de
   dash.freemem.space rellena sus 64 cuadros de un color en un solo camino (256 lados) */
static void _lz_poligono(_Lienzo *l, double *px, double *py, UBYTE *nuevo, LONG n, ULONG c, LONG a) {
    static double xs[256];
    double miny = 1e9, maxy = -1e9, minx = 1e9, maxx = -1e9, y, x;
    LONG i, j, k, s, ns = 0, nx, y0, y1, ini, fin;
    LONG uno[3];
    LONG *sub = uno;           /* de cada subcamino: su principio, su fin y su fila más baja (alta, en sy) */
    double suno[2], *sy = suno;
    if (n < 3 || a <= 0) return;
    if (nuevo) for (i = 1; i < n; i++) if (nuevo[i]) ns++;
    ns++;
    if (ns > 1) {
        sub = (LONG *)malloc(ns * 2 * sizeof(LONG));
        sy = (double *)malloc(ns * 2 * sizeof(double));
        if (!sub || !sy) { free(sub); free(sy); return; }
    }
    for (ini = 0, s = 0; ini < n; ini = fin, s++) {
        for (fin = ini + 1; fin < n && !(nuevo && nuevo[fin]); fin++) ;
        sub[2 * s] = ini; sub[2 * s + 1] = fin;
        sy[2 * s] = 1e9; sy[2 * s + 1] = -1e9;
        for (i = ini; i < fin; i++) {
            if (py[i] < sy[2 * s]) sy[2 * s] = py[i];
            if (py[i] > sy[2 * s + 1]) sy[2 * s + 1] = py[i];
            if (px[i] < minx) minx = px[i];
            if (px[i] > maxx) maxx = px[i];
        }
        if (sy[2 * s] < miny) miny = sy[2 * s];
        if (sy[2 * s + 1] > maxy) maxy = sy[2 * s + 1];
    }
    y0 = (LONG)floor(miny); y1 = (LONG)ceil(maxy);
    if (y0 < 0) y0 = 0;
    if (y1 >= l->bh) y1 = l->bh - 1;
    for (k = y0; k <= y1; k++) {
        y = k + 0.5;
        nx = 0;
        for (s = 0; s < ns; s++) {
            if (y < sy[2 * s] || y >= sy[2 * s + 1]) continue;
            /* el subcamino ini..fin-1 y su lado de vuelta */
            ini = sub[2 * s]; fin = sub[2 * s + 1];
            for (i = ini; i < fin && nx < 256; i++) {
                j = i + 1 < fin ? i + 1 : ini;
                if ((py[i] <= y && py[j] > y) || (py[j] <= y && py[i] > y))
                    xs[nx++] = px[i] + (y - py[i]) * (px[j] - px[i]) / (py[j] - py[i]);
            }
        }
        /* ordenados (pocos: inserción) y rellenos de dos en dos */
        for (i = 1; i < nx; i++) { x = xs[i]; for (j = i - 1; j >= 0 && xs[j] > x; j--) xs[j + 1] = xs[j]; xs[j + 1] = x; }
        for (i = 0; i + 1 < nx; i += 2) _lz_tramo(l, k, (LONG)(xs[i] + 0.5), (LONG)(xs[i + 1] - 0.5), c, a);
    }
    if (ns > 1) { free(sub); free(sy); }
    _lz_marcar(l, (LONG)minx - 1, y0, (LONG)maxx + 1, y1);
}

/* === Lo que pide el contexto 2D (coordenadas del usuario: pasan por la matriz) === */

static void _lz_punto_m(_Lienzo *l, double x, double y, double *ox, double *oy) {
    *ox = l->m[0] * x + l->m[2] * y + l->m[4];
    *oy = l->m[1] * x + l->m[3] * y + l->m[5];
}

static void _lz_rect(_Lienzo *l, double x, double y, double w, double h, ULONG c, LONG a) {
    double xs[4], ys[4];
    if (!l->rgb) return;
    _lz_punto_m(l, x, y, &xs[0], &ys[0]);
    _lz_punto_m(l, x + w, y, &xs[1], &ys[1]);
    _lz_punto_m(l, x + w, y + h, &xs[2], &ys[2]);
    _lz_punto_m(l, x, y + h, &xs[3], &ys[3]);
    if (l->m[1] == 0 && l->m[2] == 0) {
        /* sin giro: por filas */
        LONG x0 = (LONG)floor((xs[0] < xs[2] ? xs[0] : xs[2]) + 0.5), x1 = (LONG)floor((xs[0] > xs[2] ? xs[0] : xs[2]) + 0.5) - 1;
        LONG y0 = (LONG)floor((ys[0] < ys[2] ? ys[0] : ys[2]) + 0.5), y1 = (LONG)floor((ys[0] > ys[2] ? ys[0] : ys[2]) + 0.5) - 1, k;
        if (y0 < 0) y0 = 0;
        if (y1 >= l->bh) y1 = l->bh - 1;
        for (k = y0; k <= y1; k++) _lz_tramo(l, k, x0, x1, c, a);
        _lz_marcar(l, x0, y0, x1, y1);
    } else {
        _lz_poligono(l, xs, ys, NULL, 4, c, a);
    }
}

static void _lz_fill_rect(_Lienzo *l, double x, double y, double w, double h) {
    _lz_rect(l, x, y, w, h, l->e.relleno, _lz_alfa(l, l->e.relleno));
}

static void _lz_clear_rect(_Lienzo *l, double x, double y, double w, double h) {
    _lz_rect(l, x, y, w, h, l->fondo, 256);
}

/* Un punto más del camino, ya en coordenadas del búfer */
static void _lz_anadir_b(_Lienzo *l, double bx, double by, int nuevo) {
    if (l->n >= l->cap) {
        LONG cap = l->cap ? l->cap * 2 : 64;
        double *a = (double *)realloc(l->px, cap * sizeof(double)), *b;
        UBYTE *c;
        if (!a) return;
        l->px = a;
        b = (double *)realloc(l->py, cap * sizeof(double));
        if (!b) return;
        l->py = b;
        c = (UBYTE *)realloc(l->nuevo, cap);
        if (!c) return;
        l->nuevo = c;
        l->cap = cap;
    }
    l->px[l->n] = bx;
    l->py[l->n] = by;
    l->nuevo[l->n] = (UBYTE)(nuevo || l->n == 0);
    l->n++;
}

static void _lz_anadir(_Lienzo *l, double x, double y, int nuevo) {
    double bx, by;
    _lz_punto_m(l, x, y, &bx, &by);
    _lz_anadir_b(l, bx, by, nuevo);
}

static void _lz_begin(_Lienzo *l) { l->n = 0; }
static void _lz_move(_Lienzo *l, double x, double y) { _lz_anadir(l, x, y, 1); }
static void _lz_line(_Lienzo *l, double x, double y) { _lz_anadir(l, x, y, l->n == 0); }

/* closePath: vuelve al primer punto del subcamino */
static void _lz_close(_Lienzo *l) {
    LONG i = l->n - 1;
    if (l->n < 2) return;
    while (i > 0 && !l->nuevo[i]) i--;
    _lz_anadir_b(l, l->px[i], l->py[i], 0);
}

/* Un arco como tramos rectos (más cuanto más grande en el búfer) */
static void _lz_arc(_Lienzo *l, double cx, double cy, double rx, double ry, double a0, double a1, int contra) {
    double d = a1 - a0, escala = sqrt(fabs(l->m[0] * l->m[3] - l->m[1] * l->m[2])), t;
    LONG n, i;
    if (!contra) { while (d < 0) d += 2 * M_PI; if (d > 2 * M_PI) d = 2 * M_PI; }
    else { while (d > 0) d -= 2 * M_PI; if (d < -2 * M_PI) d = -2 * M_PI; }
    n = (LONG)(fabs(d) * (rx > ry ? rx : ry) * escala / 3.0);
    if (n < 6) n = 6;
    if (n > 96) n = 96;
    for (i = 0; i <= n; i++) {
        t = a0 + d * i / n;
        _lz_anadir(l, cx + rx * cos(t), cy + ry * sin(t), i == 0 && l->n == 0);
    }
}

/* Una curva de Bézier cúbica (o cuadrática, con c2 = c1) en 12 tramos */
static void _lz_bezier(_Lienzo *l, double c1x, double c1y, double c2x, double c2y, double x, double y, int cuadratica) {
    double x0, y0, t, u, bx, by;
    LONG i;
    double inv[6], det;
    if (l->n == 0) { _lz_anadir(l, c1x, c1y, 1); }
    /* el punto de partida, en coordenadas del usuario: deshaciendo la matriz */
    det = l->m[0] * l->m[3] - l->m[1] * l->m[2];
    if (det == 0) return;
    inv[0] = l->m[3] / det; inv[1] = -l->m[1] / det; inv[2] = -l->m[2] / det; inv[3] = l->m[0] / det;
    bx = l->px[l->n - 1] - l->m[4]; by = l->py[l->n - 1] - l->m[5];
    x0 = inv[0] * bx + inv[2] * by;
    y0 = inv[1] * bx + inv[3] * by;
    for (i = 1; i <= 12; i++) {
        t = i / 12.0; u = 1 - t;
        if (cuadratica)
            _lz_anadir(l, u * u * x0 + 2 * u * t * c1x + t * t * x, u * u * y0 + 2 * u * t * c1y + t * t * y, 0);
        else
            _lz_anadir(l, u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
                       u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y, 0);
    }
}

static void _lz_stroke(_Lienzo *l) {
    LONG i, a = _lz_alfa(l, l->e.trazo);
    double g = l->e.grosor * sqrt(fabs(l->m[0] * l->m[3] - l->m[1] * l->m[2]));
    if (!l->rgb || a <= 0) return;
    for (i = 1; i < l->n; i++) {
        if (l->nuevo[i]) continue;
        if (g <= 1.5) {
            _lz_linea(l, l->px[i - 1], l->py[i - 1], l->px[i], l->py[i], l->e.trazo, a);
        } else {
            /* gruesa: el rectángulo del tramo */
            double dx = l->px[i] - l->px[i - 1], dy = l->py[i] - l->py[i - 1], len = sqrt(dx * dx + dy * dy), nx, ny;
            double qx[4], qy[4];
            if (len < 0.01) continue;
            nx = -dy / len * g / 2; ny = dx / len * g / 2;
            qx[0] = l->px[i - 1] + nx; qy[0] = l->py[i - 1] + ny;
            qx[1] = l->px[i] + nx;     qy[1] = l->py[i] + ny;
            qx[2] = l->px[i] - nx;     qy[2] = l->py[i] - ny;
            qx[3] = l->px[i - 1] - nx; qy[3] = l->py[i - 1] - ny;
            _lz_poligono(l, qx, qy, NULL, 4, l->e.trazo, a);
        }
    }
}

static void _lz_fill(_Lienzo *l) {
    if (!l->rgb) return;
    _lz_poligono(l, l->px, l->py, l->nuevo, l->n, l->e.relleno, _lz_alfa(l, l->e.relleno));
}

static void _lz_set_transform(_Lienzo *l, double a, double b, double c, double d, double e, double f) {
    l->e.mu[0] = a; l->e.mu[1] = b; l->e.mu[2] = c; l->e.mu[3] = d; l->e.mu[4] = e; l->e.mu[5] = f;
    _lz_matriz(l);
}

/* transform(): la nueva por la de ahora */
static void _lz_transform(_Lienzo *l, double a, double b, double c, double d, double e, double f) {
    double *m = l->e.mu, r[6];
    r[0] = m[0] * a + m[2] * b; r[1] = m[1] * a + m[3] * b;
    r[2] = m[0] * c + m[2] * d; r[3] = m[1] * c + m[3] * d;
    r[4] = m[0] * e + m[2] * f + m[4]; r[5] = m[1] * e + m[3] * f + m[5];
    _lz_set_transform(l, r[0], r[1], r[2], r[3], r[4], r[5]);
}

static void _lz_save(_Lienzo *l) { if (l->npila < LZ_PILA) l->pila[l->npila++] = l->e; }
static void _lz_restore(_Lienzo *l) { if (l->npila > 0) { l->e = l->pila[--l->npila]; _lz_matriz(l); } }

/* El lienzo de un elemento (0: ninguno) */
static _Lienzo *_lz_de(APTR nodo) {
    _Lienzo *l;
    for (l = _lienzos; l; l = l->sig) if (l->nodo == nodo) return l;
    return NULL;
}
LONG lienzo_de(struct _Dash_Nodo * n)
{
    return (LONG)_lz_de((APTR)n);
}
LONG lienzo_rgb(LONG l)
{
    return l ? (LONG)((_Lienzo *)l)->rgb : 0;
}
LONG lienzo_bw(LONG l)
{
    return l ? ((_Lienzo *)l)->bw : 0;
}
LONG lienzo_bh(LONG l)
{
    return l ? ((_Lienzo *)l)->bh : 0;
}
LONG lienzo_sucio(LONG l)
{
    _Lienzo *z = (_Lienzo *)l;
    if (!z || !z->sucio) return FALSE;
    z->sucio = 0;
    return TRUE;
}
LONG lienzos_cambiados(void)
{
    _Lienzo *l;
    LONG n = 0;
    for (l = _lienzos; l; l = l->sig) if (l->sucio) n++;
    return n;
}
LONG lienzo_pixel(LONG l, LONG x, LONG y)
{
    _Lienzo *z = (_Lienzo *)l;
    UBYTE *p;
    if (!z || !z->rgb || x < 0 || y < 0 || x >= z->bw || y >= z->bh) return -1;
    p = z->rgb + (y * z->bw + x) * 3;
    return (p[0] << 16) | (p[1] << 8) | p[2];
}

/* ==== lib/jsdom.dash ==== */
/* lib/jsdom.dash: one JS object per Dash node, kept in a table until js_liberar */
static JSClassID _jsdom_clase;

/* A text made here (malloc) that went to a Dash function: Dash keeps the length of long texts in a cache by
   address, and a free() it does not see would leave it there for the next text at the same address (a selector
   of 104 characters was read cut short: tarea 37a3). Forget it before freeing. */
#define _jsdom_soltar(p) do { _dash_str_forget((STRPTR)(p)); free(p); } while (0)

typedef struct {
    _Dash_Nodo *doc;
    _Dash_Nodo **nodos;      /* open addressing: node -> its JS object */
    JSValue *objetos;
    LONG capacidad, usados;
    LONG cambios;
    LONG vista[4];           /* jsdom_vista: what is seen (width, height), the scroll (y) and the page's height */
    LONG motor;              /* its _JsMotor (the js handle of Dash): XMLHttpRequest/fetch requests go with it */
} _JsDom;

static void _jsdom_finalizar(JSRuntime *rt, JSValue val) {
    _Dash_Nodo *n = (_Dash_Nodo *)JS_GetOpaque(val, _jsdom_clase);
    if (n) {
        dom_olvidar_toques(n);   /* (sin el ciclo documento -> aviso -> documento) */
        _dash_release(n);
    }
}

static _JsDom *_jsdom_de(JSContext *ctx) { return (_JsDom *)JS_GetContextOpaque(ctx); }

/* A change to the DOM: counted (jsdom_cambios); what changed is noted by the Dash functions (dom_apuntar) */
static void _jsdom_tocado(JSContext *ctx, _Dash_Nodo *n) {
    _jsdom_de(ctx)->cambios++;
}

static void _jsdom_crecer(_JsDom *d);

/* The JS object of a node (the same every time); null for nil */
static JSValue _jsdom_objeto(JSContext *ctx, _Dash_Nodo *n) {
    _JsDom *d = _jsdom_de(ctx);
    ULONG i;
    JSValue o;
    if (!n || !d) return JS_NULL;
    if (d->usados * 2 >= d->capacidad) _jsdom_crecer(d);
    i = ((ULONG)n >> 3) & (d->capacidad - 1);
    while (d->nodos[i]) {
        if (d->nodos[i] == n) return JS_DupValue(ctx, d->objetos[i]);
        i = (i + 1) & (d->capacidad - 1);
    }
    o = JS_NewObjectClass(ctx, _jsdom_clase);
    if (JS_IsException(o)) return o;
    _dash_retain(n);
    JS_SetOpaque(o, n);
    /* un elemento, con el prototipo de su etiqueta si el preludio lo tiene (__dashweb_protos: text de <a>, href, src...
       solo en las suyas; tarea 38c5); un texto o un comentario, con el suyo (data) */
    {
        const char *clave = n->tipo == DOM_ELEMENTO ? (const char *)n->nombre : n->tipo == DOM_TEXTO ? "#text"
                          : n->tipo == DOM_COMENTARIO ? "#comment" : NULL;
        JSValue g, pt;
        if (clave && !*clave) clave = NULL;
        g = clave ? JS_GetGlobalObject(ctx) : JS_UNDEFINED;
        pt = clave ? JS_GetPropertyStr(ctx, g, "__dashweb_protos") : JS_UNDEFINED;
        if (JS_IsObject(pt)) {
            JSValue p = JS_GetPropertyStr(ctx, pt, clave);
            if (JS_IsObject(p)) JS_SetPrototype(ctx, o, p);
            JS_FreeValue(ctx, p);
        }
        JS_FreeValue(ctx, pt);
        JS_FreeValue(ctx, g);
    }
    d->nodos[i] = n;
    d->objetos[i] = JS_DupValue(ctx, o);
    d->usados++;
    return o;
}

static void _jsdom_crecer(_JsDom *d) {
    LONG vieja = d->capacidad, i;
    _Dash_Nodo **nodos = d->nodos;
    JSValue *objetos = d->objetos;
    d->capacidad = vieja ? vieja * 2 : 256;
    d->nodos = (_Dash_Nodo **)calloc(d->capacidad, sizeof(_Dash_Nodo *));
    d->objetos = (JSValue *)calloc(d->capacidad, sizeof(JSValue));
    for (i = 0; i < vieja; i++) {
        if (nodos[i]) {
            ULONG j = ((ULONG)nodos[i] >> 3) & (d->capacidad - 1);
            while (d->nodos[j]) j = (j + 1) & (d->capacidad - 1);
            d->nodos[j] = nodos[i];
            d->objetos[j] = objetos[i];
        }
    }
    free(nodos);
    free(objetos);
}

static void _jsdom_liberar(_JsMotor *m) {
    _JsDom *d = (_JsDom *)m->extra;
    LONG i;
    if (!d) return;
    for (i = 0; i < d->capacidad; i++) if (d->nodos[i]) JS_FreeValue(m->ctx, d->objetos[i]);
    free(d->nodos);
    free(d->objetos);
    if (d->doc) _dash_release(d->doc);
    free(d);
    m->extra = NULL;
    JS_SetContextOpaque(m->ctx, NULL);
}

static _Dash_Nodo *_jsdom_nodo(JSContext *ctx, JSValueConst v) {
    return (_Dash_Nodo *)JS_GetOpaque(v, _jsdom_clase);
}

/* A JS string from a Latin-1 text */
static JSValue _jsdom_cadena(JSContext *ctx, STRPTR s) {
    char *u = _js_utf8(s ? (const char *)s : "");
    JSValue v = u ? JS_NewString(ctx, u) : JS_EXCEPTION;
    _jsdom_soltar(u);
    return v;
}

/* argument i as a Latin-1 text (malloc; free it) */
static char *_jsdom_arg(JSContext *ctx, int argc, JSValueConst *argv, int i) {
    return i < argc ? _js_texto(ctx, argv[i]) : strdup("undefined");
}

static JSValue _jsdom_lista(JSContext *ctx, DashArrayLong *l) {
    JSValue a = JS_NewArray(ctx);
    LONG i, n = l ? DashArray_length(l) : 0;
    for (i = 0; i < n; i++)
        JS_SetPropertyUint32(ctx, a, i, _jsdom_objeto(ctx, (_Dash_Nodo *)DashArray_get(l, i)));
    return a;
}

#define _JSDOM_ESTE _Dash_Nodo *n = _jsdom_nodo(ctx, this_val); \
    if (!n) return JS_ThrowTypeError(ctx, "not a node")
/* en un setter: sobre algo que no es un nodo de verdad (el prototipo de una clase que hereda de HTMLElement, como
   hace Polymer en YouTube), una propiedad normal suya, como si el setter no estuviera (tarea 38) */
#define _JSDOM_ESTE_PONER(nombre) _Dash_Nodo *n = _jsdom_nodo(ctx, this_val); \
    if (!n) { JS_DefinePropertyValueStr(ctx, this_val, nombre, JS_DupValue(ctx, v), JS_PROP_C_W_E); return JS_UNDEFINED; }

static JSValue _jsdom_tagName(JSContext *ctx, JSValueConst this_val) {
    char *t;
    JSValue v;
    _JSDOM_ESTE;
    if (n->tipo != DOM_ELEMENTO)
        return JS_NewString(ctx, n->tipo == DOM_TEXTO ? "#text" : n->tipo == DOM_COMENTARIO ? "#comment"
                                 : n->tipo == DOM_FRAGMENTO ? "#document-fragment" : "#document");
    t = strdup((const char *)n->nombre);
    if (!t) return JS_EXCEPTION;
    { char *p; for (p = t; *p; p++) if (*p >= 'a' && *p <= 'z') *p -= 32; }
    v = JS_NewString(ctx, t);
    _jsdom_soltar(t);
    return v;
}

static JSValue _jsdom_nodeType(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    return JS_NewInt32(ctx, n->tipo);
}

static JSValue _jsdom_textContent(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    return _jsdom_cadena(ctx, jsdom_texto(n));
}

static JSValue _jsdom_set_textContent(JSContext *ctx, JSValueConst this_val, JSValueConst v) {
    char *t;
    _JSDOM_ESTE_PONER("textContent");
    t = _js_texto(ctx, v);
    jsdom_poner_texto(n, (STRPTR)(t ? t : ""));
    _jsdom_soltar(t);
    _jsdom_tocado(ctx, n);
    return JS_UNDEFINED;
}

static JSValue _jsdom_innerHTML(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    return _jsdom_cadena(ctx, jsdom_html(n));
}

static JSValue _jsdom_set_innerHTML(JSContext *ctx, JSValueConst this_val, JSValueConst v) {
    char *t;
    _JSDOM_ESTE_PONER("innerHTML");
    t = _js_texto(ctx, v);
    jsdom_poner_html(n, (STRPTR)(t ? t : ""));
    _jsdom_soltar(t);
    _jsdom_tocado(ctx, n);
    return JS_UNDEFINED;
}

/* id and className: getters and setters of an attribute (magic 0: id, 1: class) */
static const char *_jsdom_atr_nombres[] = { "id", "class" };

static JSValue _jsdom_atr(JSContext *ctx, JSValueConst this_val, int magic) {
    _JSDOM_ESTE;
    return _jsdom_cadena(ctx, jsdom_atributo(n, (STRPTR)_jsdom_atr_nombres[magic]));
}

static JSValue _jsdom_set_atr(JSContext *ctx, JSValueConst this_val, JSValueConst v, int magic) {
    char *t;
    _JSDOM_ESTE_PONER((magic == 0 ? "id" : "className"));
    t = _js_texto(ctx, v);
    jsdom_poner_atributo(n, (STRPTR)_jsdom_atr_nombres[magic], (STRPTR)(t ? t : ""));
    _jsdom_soltar(t);
    _jsdom_tocado(ctx, n);
    return JS_UNDEFINED;
}

/* value (input, textarea, select) and checked */
static JSValue _jsdom_value(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    return _jsdom_cadena(ctx, jsdom_valor(n));
}

static JSValue _jsdom_set_value(JSContext *ctx, JSValueConst this_val, JSValueConst v) {
    char *t;
    _JSDOM_ESTE_PONER("value");
    t = _js_texto(ctx, v);
    jsdom_poner_valor(n, (STRPTR)(t ? t : ""));
    _jsdom_soltar(t);
    _jsdom_tocado(ctx, n);
    return JS_UNDEFINED;
}

static JSValue _jsdom_checked(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    return JS_NewBool(ctx, jsdom_tiene_atributo(n, (STRPTR)"checked"));
}

static JSValue _jsdom_set_checked(JSContext *ctx, JSValueConst this_val, JSValueConst v) {
    _JSDOM_ESTE_PONER("checked");
    if (JS_ToBool(ctx, v)) jsdom_poner_atributo(n, (STRPTR)"checked", (STRPTR)"");
    else jsdom_quitar_atributo(n, (STRPTR)"checked");
    _jsdom_tocado(ctx, n);
    return JS_UNDEFINED;
}

static JSValue _jsdom_parentNode(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    return _jsdom_objeto(ctx, jsdom_padre(n));
}

/* magic 0: children (elements), 1: childNodes */
static JSValue _jsdom_hijos(JSContext *ctx, JSValueConst this_val, int magic) {
    _JSDOM_ESTE;
    return _jsdom_lista(ctx, jsdom_hijos(n, magic == 0));
}

/* magic 0: firstChild, 1: lastChild */
static JSValue _jsdom_extremo(JSContext *ctx, JSValueConst this_val, int magic) {
    DashArrayLong *l;
    LONG k;
    _JSDOM_ESTE;
    l = n->hijos;
    k = l ? DashArray_length(l) : 0;
    if (!k) return JS_NULL;
    return _jsdom_objeto(ctx, (_Dash_Nodo *)DashArray_get(l, magic ? k - 1 : 0));
}

static JSValue _jsdom_getAttribute(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *a;
    JSValue v;
    _JSDOM_ESTE;
    a = _jsdom_arg(ctx, argc, argv, 0);
    v = a && jsdom_tiene_atributo(n, (STRPTR)a) ? _jsdom_cadena(ctx, jsdom_atributo(n, (STRPTR)a)) : JS_NULL;
    _jsdom_soltar(a);
    return v;
}

static JSValue _jsdom_hasAttribute(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *a;
    BOOL r;
    _JSDOM_ESTE;
    a = _jsdom_arg(ctx, argc, argv, 0);
    r = a && jsdom_tiene_atributo(n, (STRPTR)a);
    _jsdom_soltar(a);
    return JS_NewBool(ctx, r);
}

static JSValue _jsdom_setAttribute(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *a, *v;
    _JSDOM_ESTE;
    a = _jsdom_arg(ctx, argc, argv, 0);
    v = _jsdom_arg(ctx, argc, argv, 1);
    if (a && v) jsdom_poner_atributo(n, (STRPTR)a, (STRPTR)v);
    _jsdom_soltar(a);
    _jsdom_soltar(v);
    _jsdom_tocado(ctx, n);
    return JS_UNDEFINED;
}

static JSValue _jsdom_removeAttribute(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *a;
    _JSDOM_ESTE;
    a = _jsdom_arg(ctx, argc, argv, 0);
    if (a) jsdom_quitar_atributo(n, (STRPTR)a);
    _jsdom_soltar(a);
    _jsdom_tocado(ctx, n);
    return JS_UNDEFINED;
}

static JSValue _jsdom_appendChild(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *h;
    _JSDOM_ESTE;
    h = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    if (!h) return JS_ThrowTypeError(ctx, "appendChild: not a node");
    if (!jsdom_agregar(n, h)) return JS_ThrowRangeError(ctx, "appendChild: the node contains this one");
    _jsdom_tocado(ctx, n);
    return JS_DupValue(ctx, argv[0]);
}

static JSValue _jsdom_removeChild(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *h;
    _JSDOM_ESTE;
    h = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    if (!h || !jsdom_quitar(n, h)) return JS_ThrowRangeError(ctx, "removeChild: not a child of this node");
    _jsdom_tocado(ctx, n);
    return JS_DupValue(ctx, argv[0]);
}

/* magic 0: querySelector, 1: querySelectorAll, 2: getElementsByTagName */
static JSValue _jsdom_selector(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv, int magic) {
    char *s;
    DashArrayLong *l;
    _JSDOM_ESTE;
    s = _jsdom_arg(ctx, argc, argv, 0);
    if (!s) return JS_EXCEPTION;
    if (magic != 2 && !jsdom_selector_valido((STRPTR)s)) {
        JSValue e = JS_ThrowSyntaxError(ctx, "'%s' is not a valid selector", s);
        _jsdom_soltar(s);
        return e;
    }
    l = jsdom_selector(n, (STRPTR)s, magic != 0);
    _jsdom_soltar(s);
    if (magic) return _jsdom_lista(ctx, l);
    return l && DashArray_length(l) ? _jsdom_objeto(ctx, (_Dash_Nodo *)DashArray_get(l, 0)) : JS_NULL;
}

/* Tarea 25: lo que necesita jQuery */

/* magic 0: nextSibling, 1: previousSibling, 2: nextElementSibling, 3: previousElementSibling */
static JSValue _jsdom_hermano(JSContext *ctx, JSValueConst this_val, int magic) {
    _JSDOM_ESTE;
    return _jsdom_objeto(ctx, jsdom_hermano(n, !(magic & 1), magic >= 2));
}

static JSValue _jsdom_insertBefore(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *h, *ref;
    _JSDOM_ESTE;
    h = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    ref = argc > 1 ? _jsdom_nodo(ctx, argv[1]) : NULL;
    if (!h) return JS_ThrowTypeError(ctx, "insertBefore: not a node");
    if (argc > 1 && !ref && !JS_IsNull(argv[1]) && !JS_IsUndefined(argv[1]))
        return JS_ThrowTypeError(ctx, "insertBefore: the reference is not a node");
    if (!jsdom_insertar_antes(n, h, ref)) return JS_ThrowRangeError(ctx, "insertBefore: cannot insert there");
    _jsdom_tocado(ctx, n);
    return JS_DupValue(ctx, argv[0]);
}

static JSValue _jsdom_replaceChild(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *h, *viejo;
    _JSDOM_ESTE;
    h = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    viejo = argc > 1 ? _jsdom_nodo(ctx, argv[1]) : NULL;
    if (!h || !viejo || jsdom_padre(viejo) != n) return JS_ThrowRangeError(ctx, "replaceChild: not a child of this node");
    if (h != viejo) {
        if (!jsdom_insertar_antes(n, h, viejo)) return JS_ThrowRangeError(ctx, "replaceChild: cannot insert there");
        jsdom_quitar(n, viejo);
    }
    _jsdom_tocado(ctx, n);
    return JS_DupValue(ctx, argv[1]);
}

static JSValue _jsdom_cloneNode(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _JSDOM_ESTE;
    return _jsdom_objeto(ctx, jsdom_clonar(n, argc > 0 && JS_ToBool(ctx, argv[0])));
}

static JSValue _jsdom_contains(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *b;
    _JSDOM_ESTE;
    b = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    return JS_NewBool(ctx, b && jsdom_contiene(n, b));
}

static JSValue _jsdom_compareDocumentPosition(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *b;
    _JSDOM_ESTE;
    b = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    if (!b) return JS_ThrowTypeError(ctx, "compareDocumentPosition: not a node");
    return JS_NewInt32(ctx, jsdom_posicion(n, b));
}

static JSValue _jsdom_matches(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *s;
    BOOL r;
    _JSDOM_ESTE;
    s = _jsdom_arg(ctx, argc, argv, 0);
    if (!s) return JS_EXCEPTION;
    if (!jsdom_selector_valido((STRPTR)s)) {
        JSValue e = JS_ThrowSyntaxError(ctx, "'%s' is not a valid selector", s);
        _jsdom_soltar(s);
        return e;
    }
    r = n->tipo == DOM_ELEMENTO && jsdom_cumple(n, (STRPTR)s);
    _jsdom_soltar(s);
    return JS_NewBool(ctx, r);
}

static JSValue _jsdom_getElementsByClassName(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *s, *sel, *p, *q;
    DashArrayLong *l;
    _JSDOM_ESTE;
    s = _jsdom_arg(ctx, argc, argv, 0);
    if (!s) return JS_EXCEPTION;
    sel = (char *)malloc(strlen(s) * 2 + 2);
    if (!sel) { _jsdom_soltar(s); return JS_EXCEPTION; }
    /* "a b" -> ".a.b" */
    for (p = s, q = sel; *p; ) {
        while (*p && (unsigned char)*p <= 32) p++;
        if (!*p) break;
        *q++ = '.';
        while (*p && (unsigned char)*p > 32) *q++ = *p++;
    }
    *q = 0;
    l = sel[0] ? jsdom_selector(n, (STRPTR)sel, TRUE) : NULL;
    _jsdom_soltar(s);
    _jsdom_soltar(sel);
    return _jsdom_lista(ctx, l);
}

static JSValue _jsdom_ownerDocument(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    if (n->tipo == DOM_DOCUMENTO) return JS_NULL;
    return _jsdom_objeto(ctx, _jsdom_de(ctx)->doc);
}

static JSValue _jsdom_outerHTML(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    return _jsdom_cadena(ctx, jsdom_html_fuera(n));
}

/* nodeValue / data: the text of a text or comment node (null for the others) */
static JSValue _jsdom_nodeValue(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    if (n->tipo != DOM_TEXTO && n->tipo != DOM_COMENTARIO) return JS_NULL;
    return _jsdom_cadena(ctx, n->texto);
}

static JSValue _jsdom_set_nodeValue(JSContext *ctx, JSValueConst this_val, JSValueConst v) {
    _JSDOM_ESTE_PONER("nodeValue");
    if (n->tipo != DOM_TEXTO && n->tipo != DOM_COMENTARIO) return JS_UNDEFINED;
    return _jsdom_set_textContent(ctx, this_val, v);
}

/* defaultValue: the value attribute (the text of a textarea) */
static JSValue _jsdom_defaultValue(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    if (n->tipo == DOM_ELEMENTO && !strcmp((const char *)n->nombre, "textarea")) return _jsdom_cadena(ctx, jsdom_texto(n));
    return _jsdom_cadena(ctx, jsdom_atributo(n, (STRPTR)"value"));
}

/* Lo pone lib/documento.dash: si el JavaScript cambió el documento de ese árbol, maquetarlo ya (como hace un navegador
   al pedirle una medida). Se llama cuando se mide un elemento sin caja de la última maqueta: lo que estaba escondido
   y se acaba de enseñar (el diálogo de cookies de YouTube se centraba con su tamaño a 0; tarea 38c5) */
static int (*jsdom_al_pedir_caja)(_Dash_Nodo *doc, _Dash_Nodo *n) = 0;
static void _jsdom_caja_al_dia(JSContext *ctx, _Dash_Nodo *n) {
    _JsDom *d = _jsdom_de(ctx);
    if (jsdom_al_pedir_caja && d && d->doc && n) jsdom_al_pedir_caja(d->doc, n);
}

/* offsetWidth/offsetHeight...: its box in the last layout (tarea 37b); before the first one, 0 if not shown
   (display: none here or above, or out of the document) and otherwise a nominal size (magic 0: width, 1: height) */
static JSValue _jsdom_tamano(JSContext *ctx, JSValueConst this_val, int magic) {
    _JSDOM_ESTE;
    _jsdom_caja_al_dia(ctx, n);
    if (n->tipo != DOM_ELEMENTO) return JS_NewInt32(ctx, 0);
    if (jsdom_caja_valida(n, _jsdom_de(ctx)->doc)) return JS_NewInt32(ctx, magic ? n->caja_h : n->caja_w);
    if (_jsdom_de(ctx)->doc->caja_pase || !jsdom_visible(n)) return JS_NewInt32(ctx, 0);
    return JS_NewInt32(ctx, magic ? 16 : 100);
}

/* __dashweb_caja(node): [x, y, width, height, fixed] of its box in the page (fixed: position: fixed, it goes with the
   window), or null (not laid out, or no layout yet) */
static JSValue _jsdom_caja(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *n = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    JSValue a;
    _jsdom_caja_al_dia(ctx, n);
    if (!n || !jsdom_caja_valida(n, _jsdom_de(ctx)->doc)) return JS_NULL;
    a = JS_NewArray(ctx);
    JS_SetPropertyUint32(ctx, a, 0, JS_NewInt32(ctx, n->caja_x));
    JS_SetPropertyUint32(ctx, a, 1, JS_NewInt32(ctx, n->caja_y));
    JS_SetPropertyUint32(ctx, a, 2, JS_NewInt32(ctx, n->caja_w));
    JS_SetPropertyUint32(ctx, a, 3, JS_NewInt32(ctx, n->caja_h));
    JS_SetPropertyUint32(ctx, a, 4, JS_NewBool(ctx, n->caja_fija));
    {
        /* el sticky más cercano hacia fuera (él incluido): [5..7] = su sitio, su top y lo más abajo que va */
        _Dash_Nodo *p = n;
        LONG pase = _jsdom_de(ctx)->doc->caja_pase;
        while (p && p->pg_pase != pase) p = p->padre;
        if (p) {
            JS_SetPropertyUint32(ctx, a, 5, JS_NewInt32(ctx, p->pg_y0));
            JS_SetPropertyUint32(ctx, a, 6, JS_NewInt32(ctx, p->pg_top));
            JS_SetPropertyUint32(ctx, a, 7, JS_NewInt32(ctx, p->pg_fin));
        }
    }
    return a;
}

/* __dashweb_vista(): [width, height, scroll y, page height] (jsdom_vista) */
/* __dashweb_pedir(id, method, url, headers "k: v\n...", body): a request of XMLHttpRequest/fetch (jsdom_pedir) */
static JSValue _jsdom_pedir(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _JsDom *d = _jsdom_de(ctx);
    int32_t id = 0;
    char *metodo, *url, *cab, *cuerpo;
    if (!d || argc < 5 || JS_ToInt32(ctx, &id, argv[0])) return JS_UNDEFINED;
    metodo = _jsdom_arg(ctx, argc, argv, 1);
    url = _jsdom_arg(ctx, argc, argv, 2);
    cab = _jsdom_arg(ctx, argc, argv, 3);
    cuerpo = _jsdom_arg(ctx, argc, argv, 4);
    if (metodo && url && cab && cuerpo)
        jsdom_pedir(d->motor, id, (STRPTR)metodo, (STRPTR)url, (STRPTR)cab, (STRPTR)cuerpo);
    if (metodo) _jsdom_soltar(metodo);
    if (url) _jsdom_soltar(url);
    if (cab) _jsdom_soltar(cab);
    if (cuerpo) _jsdom_soltar(cuerpo);
    return JS_UNDEFINED;
}

static JSValue _jsdom_vista(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _JsDom *d = _jsdom_de(ctx);
    JSValue a = JS_NewArray(ctx);
    int i;
    for (i = 0; i < 4; i++) JS_SetPropertyUint32(ctx, a, i, JS_NewInt32(ctx, d ? d->vista[i] : 0));
    return a;
}

/* attributes: [{name, value}] (a copy: changing it does not change the element) */
static JSValue _jsdom_attributes(JSContext *ctx, JSValueConst this_val) {
    JSValue a;
    LONG i, k;
    _JSDOM_ESTE;
    a = JS_NewArray(ctx);
    k = n->atributos ? DashArray_length(n->atributos) : 0;
    for (i = 0; i < k; i++) {
        _Dash_Atributo *at = (_Dash_Atributo *)DashArray_get(n->atributos, i);
        JSValue o = JS_NewObject(ctx);
        JS_SetPropertyStr(ctx, o, "name", _jsdom_cadena(ctx, at->nombre));
        JS_SetPropertyStr(ctx, o, "nodeName", _jsdom_cadena(ctx, at->nombre));
        JS_SetPropertyStr(ctx, o, "value", _jsdom_cadena(ctx, at->valor));
        JS_SetPropertyStr(ctx, o, "nodeValue", _jsdom_cadena(ctx, at->valor));
        JS_SetPropertyStr(ctx, o, "specified", JS_TRUE);
        JS_SetPropertyUint32(ctx, a, i, o);
    }
    return a;
}

/* __dashweb_media("(max-width: 600px)"): matchMedia, como lib/css.dash los @media */
static JSValue _jsdom_media(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *q = _jsdom_arg(ctx, argc, argv, 0);
    BOOL r;
    if (!q) return JS_EXCEPTION;
    r = css_media_vale((STRPTR)q);
    _jsdom_soltar(q);
    return JS_NewBool(ctx, r);
}

static JSValue _jsdom_localName(JSContext *ctx, JSValueConst this_val) {
    _JSDOM_ESTE;
    if (n->tipo != DOM_ELEMENTO) return JS_NULL;
    return _jsdom_cadena(ctx, n->nombre);
}

static const JSCFunctionListEntry _jsdom_metodos[] = {
    JS_CGETSET_MAGIC_DEF("nextSibling", _jsdom_hermano, NULL, 0),
    JS_CGETSET_MAGIC_DEF("previousSibling", _jsdom_hermano, NULL, 1),
    JS_CGETSET_MAGIC_DEF("nextElementSibling", _jsdom_hermano, NULL, 2),
    JS_CGETSET_MAGIC_DEF("previousElementSibling", _jsdom_hermano, NULL, 3),
    JS_CFUNC_DEF("insertBefore", 2, _jsdom_insertBefore),
    JS_CFUNC_DEF("replaceChild", 2, _jsdom_replaceChild),
    JS_CFUNC_DEF("cloneNode", 1, _jsdom_cloneNode),
    JS_CFUNC_DEF("contains", 1, _jsdom_contains),
    JS_CFUNC_DEF("compareDocumentPosition", 1, _jsdom_compareDocumentPosition),
    JS_CFUNC_DEF("matches", 1, _jsdom_matches),
    JS_CFUNC_DEF("webkitMatchesSelector", 1, _jsdom_matches),
    JS_CFUNC_DEF("getElementsByClassName", 1, _jsdom_getElementsByClassName),
    JS_CGETSET_DEF("ownerDocument", _jsdom_ownerDocument, NULL),
    JS_CGETSET_DEF("outerHTML", _jsdom_outerHTML, NULL),
    JS_CGETSET_DEF("nodeValue", _jsdom_nodeValue, _jsdom_set_nodeValue),
    JS_CGETSET_DEF("data", _jsdom_nodeValue, _jsdom_set_nodeValue),
    JS_CGETSET_DEF("defaultValue", _jsdom_defaultValue, NULL),
    JS_CGETSET_MAGIC_DEF("offsetWidth", _jsdom_tamano, NULL, 0),
    JS_CGETSET_MAGIC_DEF("offsetHeight", _jsdom_tamano, NULL, 1),
    JS_CGETSET_MAGIC_DEF("clientWidth", _jsdom_tamano, NULL, 0),
    JS_CGETSET_MAGIC_DEF("clientHeight", _jsdom_tamano, NULL, 1),
    JS_CGETSET_DEF("localName", _jsdom_localName, NULL),
    JS_CGETSET_DEF("attributes", _jsdom_attributes, NULL),
    JS_CGETSET_DEF("tagName", _jsdom_tagName, NULL),
    JS_CGETSET_DEF("nodeName", _jsdom_tagName, NULL),
    JS_CGETSET_DEF("nodeType", _jsdom_nodeType, NULL),
    JS_CGETSET_DEF("textContent", _jsdom_textContent, _jsdom_set_textContent),
    JS_CGETSET_DEF("innerHTML", _jsdom_innerHTML, _jsdom_set_innerHTML),
    JS_CGETSET_MAGIC_DEF("id", _jsdom_atr, _jsdom_set_atr, 0),
    JS_CGETSET_MAGIC_DEF("className", _jsdom_atr, _jsdom_set_atr, 1),
    JS_CGETSET_DEF("parentNode", _jsdom_parentNode, NULL),
    JS_CGETSET_DEF("value", _jsdom_value, _jsdom_set_value),
    JS_CGETSET_DEF("checked", _jsdom_checked, _jsdom_set_checked),
    JS_CGETSET_DEF("parentElement", _jsdom_parentNode, NULL),
    JS_CGETSET_MAGIC_DEF("children", _jsdom_hijos, NULL, 0),
    JS_CGETSET_MAGIC_DEF("childNodes", _jsdom_hijos, NULL, 1),
    JS_CGETSET_MAGIC_DEF("firstChild", _jsdom_extremo, NULL, 0),
    JS_CGETSET_MAGIC_DEF("lastChild", _jsdom_extremo, NULL, 1),
    JS_CFUNC_DEF("getAttribute", 1, _jsdom_getAttribute),
    JS_CFUNC_DEF("hasAttribute", 1, _jsdom_hasAttribute),
    JS_CFUNC_DEF("setAttribute", 2, _jsdom_setAttribute),
    JS_CFUNC_DEF("removeAttribute", 1, _jsdom_removeAttribute),
    JS_CFUNC_DEF("appendChild", 1, _jsdom_appendChild),
    JS_CFUNC_DEF("removeChild", 1, _jsdom_removeChild),
    JS_CFUNC_MAGIC_DEF("querySelector", 1, _jsdom_selector, 0),
    JS_CFUNC_MAGIC_DEF("querySelectorAll", 1, _jsdom_selector, 1),
    JS_CFUNC_MAGIC_DEF("getElementsByTagName", 1, _jsdom_selector, 2),
};

/* document.* (besides what every node has) */
static JSValue _jsdom_getElementById(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *id = _jsdom_arg(ctx, argc, argv, 0);
    JSValue v;
    if (!id) return JS_EXCEPTION;
    v = _jsdom_objeto(ctx, jsdom_por_id(_jsdom_de(ctx)->doc, (STRPTR)id));
    _jsdom_soltar(id);
    return v;
}

/* magic 0: createElement, 1: createTextNode, 2: createComment */
static JSValue _jsdom_crear(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv, int magic) {
    char *t = _jsdom_arg(ctx, argc, argv, 0);
    JSValue v;
    if (!t) return JS_EXCEPTION;
    v = _jsdom_objeto(ctx, magic == 2 ? jsdom_crear_comentario((STRPTR)t)
                           : magic ? jsdom_crear_texto((STRPTR)t) : jsdom_crear((STRPTR)t));
    _jsdom_soltar(t);
    return v;
}

static JSValue _jsdom_createDocumentFragment(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    return _jsdom_objeto(ctx, jsdom_crear_fragmento());
}

/* document.implementation.createHTMLDocument(title) */
static JSValue _jsdom_documento_nuevo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *t = argc > 0 && !JS_IsUndefined(argv[0]) ? _js_texto(ctx, argv[0]) : strdup("");
    JSValue v;
    if (!t) return JS_EXCEPTION;
    v = _jsdom_objeto(ctx, jsdom_documento_nuevo((STRPTR)t));
    _jsdom_soltar(t);
    return v;
}

/* __dashweb_calculado(el, "color"): lo calculado por lib/estilo.dash (getComputedStyle) */
static JSValue _jsdom_calculado(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *n = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    char *p;
    JSValue v;
    if (!n) return JS_NewString(ctx, "");
    p = _jsdom_arg(ctx, argc, argv, 1);
    if (!p) return JS_EXCEPTION;
    v = _jsdom_cadena(ctx, jsdom_estilo_calculado(n, (STRPTR)p));
    _jsdom_soltar(p);
    return v;
}

/* magic 0: body, 1: documentElement, 2: head (of this document: also those of createHTMLDocument),
   3: currentScript (the <script> running now, or null) */
static JSValue _jsdom_parte(JSContext *ctx, JSValueConst this_val, int magic) {
    _Dash_Nodo *doc = _jsdom_nodo(ctx, this_val);
    if (!doc) doc = _jsdom_de(ctx)->doc;
    if (magic == 3) return _jsdom_objeto(ctx, jsdom_script_en_curso());
    return _jsdom_objeto(ctx, magic == 2 ? jsdom_cabeza(doc) : magic ? jsdom_raiz(doc) : jsdom_cuerpo(doc));
}

static JSValue _jsdom_title(JSContext *ctx, JSValueConst this_val) {
    return _jsdom_cadena(ctx, jsdom_titulo(_jsdom_de(ctx)->doc));
}

/* __dashweb_galletas(href) and __dashweb_galleta(href, "a=1; path=/"): document.cookie */
static JSValue _jsdom_galletas(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *u = _jsdom_arg(ctx, argc, argv, 0);
    JSValue v;
    if (!u) return JS_EXCEPTION;
    v = _jsdom_cadena(ctx, jsdom_galletas((STRPTR)u));
    _jsdom_soltar(u);
    return v;
}

static JSValue _jsdom_galleta(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *u = _jsdom_arg(ctx, argc, argv, 0), *t = _jsdom_arg(ctx, argc, argv, 1);
    if (u && t) jsdom_galleta((STRPTR)u, (STRPTR)t);
    _jsdom_soltar(u);
    _jsdom_soltar(t);
    return JS_UNDEFINED;
}

/* __dashweb_navegar(url, sustituir): location.assign/replace/href = (jsdom_navegar) */
/* __dashweb_es_nodo(o): ¿un nodo de verdad (o solo algo que hereda de su prototipo, como el de una clase)? */
static JSValue _jsdom_es_nodo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    return JS_NewBool(ctx, argc > 0 && JS_GetOpaque(argv[0], _jsdom_clase) != NULL);
}

static JSValue _jsdom_navegar(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    char *u = _jsdom_arg(ctx, argc, argv, 0);
    if (u) jsdom_navegar(_jsdom_de(ctx)->doc, (STRPTR)u, argc > 1 && JS_ToBool(ctx, argv[1]));
    _jsdom_soltar(u);
    return JS_UNDEFINED;
}

/* milliseconds since the program started (Dash's time_ms) */
static JSValue _jsdom_reloj(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    return JS_NewInt32(ctx, _dash_time_ms());
}

/* Calls the global function name with the arguments; the result, or undefined after
   writing the exception in one line */
static JSValue _jsdom_llamar(JSContext *ctx, const char *name, int argc, JSValueConst *argv) {
    JSValue global = JS_GetGlobalObject(ctx), f = JS_GetPropertyStr(ctx, global, name), r;
    _js_empieza();
    r = JS_Call(ctx, f, global, argc, argv);
    JS_FreeValue(ctx, f);
    JS_FreeValue(ctx, global);
    _js_trabajos(JS_GetRuntime(ctx));
    if (JS_IsException(r)) {
        char *e = _js_excepcion(ctx), *p;
        for (p = e; p && *p; p++) if (*p == '\n') *p = ' ';
        _js_poner("JS: ");
        _js_poner(e ? e : "error");
        _js_poner("\n");
        free(e);
        return JS_UNDEFINED;
    }
    return r;
}

static const JSCFunctionListEntry _jsdom_documento[] = {
    JS_CFUNC_DEF("getElementById", 1, _jsdom_getElementById),
    JS_CFUNC_MAGIC_DEF("createElement", 1, _jsdom_crear, 0),
    JS_CFUNC_MAGIC_DEF("createTextNode", 1, _jsdom_crear, 1),
    JS_CFUNC_MAGIC_DEF("createComment", 1, _jsdom_crear, 2),
    JS_CFUNC_DEF("createDocumentFragment", 0, _jsdom_createDocumentFragment),
    JS_CGETSET_MAGIC_DEF("body", _jsdom_parte, NULL, 0),
    JS_CGETSET_MAGIC_DEF("documentElement", _jsdom_parte, NULL, 1),
    JS_CGETSET_MAGIC_DEF("head", _jsdom_parte, NULL, 2),
    JS_CGETSET_MAGIC_DEF("currentScript", _jsdom_parte, NULL, 3),
    JS_CGETSET_DEF("title", _jsdom_title, NULL),
};
static JSClassID _lz_clase;

static void _lz_finalizar(JSRuntime *rt, JSValue v) {
    _lz_liberar((_Lienzo *)JS_GetOpaque(v, _lz_clase));
}

#define _LZ_ESTE _Lienzo *l = (_Lienzo *)JS_GetOpaque(this_val, _lz_clase); \
    if (!l) return JS_ThrowTypeError(ctx, "not a CanvasRenderingContext2D")

static double _lz_num(JSContext *ctx, int argc, JSValueConst *argv, int i) {
    double d = 0;
    if (i < argc) JS_ToFloat64(ctx, &d, argv[i]);
    return d != d ? 0 : d;     /* (NaN: 0) */
}
#define _LZ_A(i) _lz_num(ctx, argc, argv, i)

static JSValue _lz_fillRect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_fill_rect(l, _LZ_A(0), _LZ_A(1), _LZ_A(2), _LZ_A(3)); return JS_UNDEFINED;
}
static JSValue _lz_clearRect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_clear_rect(l, _LZ_A(0), _LZ_A(1), _LZ_A(2), _LZ_A(3)); return JS_UNDEFINED;
}
static JSValue _lz_strokeRect(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    double x = _LZ_A(0), y = _LZ_A(1), w = _LZ_A(2), h = _LZ_A(3);
    LONG n;
    _LZ_ESTE;
    n = l->n;
    l->n = 0;
    _lz_move(l, x, y); _lz_line(l, x + w, y); _lz_line(l, x + w, y + h); _lz_line(l, x, y + h); _lz_close(l);
    _lz_stroke(l);
    l->n = 0;
    (void)n;
    return JS_UNDEFINED;
}
static JSValue _lz_beginPath(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_begin(l); return JS_UNDEFINED;
}
static JSValue _lz_moveTo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_move(l, _LZ_A(0), _LZ_A(1)); return JS_UNDEFINED;
}
static JSValue _lz_lineTo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_line(l, _LZ_A(0), _LZ_A(1)); return JS_UNDEFINED;
}
static JSValue _lz_closePath(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_close(l); return JS_UNDEFINED;
}
static JSValue _lz_rect_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    double x = _LZ_A(0), y = _LZ_A(1), w = _LZ_A(2), h = _LZ_A(3);
    _LZ_ESTE;
    _lz_move(l, x, y); _lz_line(l, x + w, y); _lz_line(l, x + w, y + h); _lz_line(l, x, y + h); _lz_close(l);
    return JS_UNDEFINED;
}
static JSValue _lz_arc_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE;
    _lz_arc(l, _LZ_A(0), _LZ_A(1), _LZ_A(2), _LZ_A(2), _LZ_A(3), _LZ_A(4), argc > 5 && JS_ToBool(ctx, argv[5]));
    return JS_UNDEFINED;
}
static JSValue _lz_ellipse_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE;
    _lz_arc(l, _LZ_A(0), _LZ_A(1), _LZ_A(2), _LZ_A(3), _LZ_A(5), _LZ_A(6), argc > 7 && JS_ToBool(ctx, argv[7]));
    return JS_UNDEFINED;
}
static JSValue _lz_quadratic(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_bezier(l, _LZ_A(0), _LZ_A(1), _LZ_A(0), _LZ_A(1), _LZ_A(2), _LZ_A(3), 1); return JS_UNDEFINED;
}
static JSValue _lz_bezier_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_bezier(l, _LZ_A(0), _LZ_A(1), _LZ_A(2), _LZ_A(3), _LZ_A(4), _LZ_A(5), 0); return JS_UNDEFINED;
}
static JSValue _lz_arcTo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_line(l, _LZ_A(0), _LZ_A(1)); return JS_UNDEFINED;
}
static JSValue _lz_stroke_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_stroke(l); return JS_UNDEFINED;
}
static JSValue _lz_fill_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_fill(l); return JS_UNDEFINED;
}
static JSValue _lz_setTransform(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE;
    if (argc >= 6) _lz_set_transform(l, _LZ_A(0), _LZ_A(1), _LZ_A(2), _LZ_A(3), _LZ_A(4), _LZ_A(5));
    else _lz_set_transform(l, 1, 0, 0, 1, 0, 0);
    return JS_UNDEFINED;
}
static JSValue _lz_resetTransform(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_set_transform(l, 1, 0, 0, 1, 0, 0); return JS_UNDEFINED;
}
static JSValue _lz_transform_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_transform(l, _LZ_A(0), _LZ_A(1), _LZ_A(2), _LZ_A(3), _LZ_A(4), _LZ_A(5)); return JS_UNDEFINED;
}
static JSValue _lz_scale(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_transform(l, _LZ_A(0), 0, 0, _LZ_A(1), 0, 0); return JS_UNDEFINED;
}
static JSValue _lz_translate(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_transform(l, 1, 0, 0, 1, _LZ_A(0), _LZ_A(1)); return JS_UNDEFINED;
}
static JSValue _lz_rotate(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    double a = _LZ_A(0), c = cos(a), s = sin(a);
    _LZ_ESTE; _lz_transform(l, c, s, -s, c, 0, 0); return JS_UNDEFINED;
}
static JSValue _lz_save_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_save(l); return JS_UNDEFINED;
}
static JSValue _lz_restore_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_restore(l); return JS_UNDEFINED;
}
/* __tam(ancho, alto): canvas.width/height (el preludio) */
static JSValue _lz_tam_js(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _LZ_ESTE; _lz_tam(l, (LONG)_LZ_A(0), (LONG)_LZ_A(1)); return JS_UNDEFINED;
}

/* fillStyle y strokeStyle: un texto de color (lo demás, un degradado o un patrón, se queda con el de antes) */
static JSValue _lz_estilo_get(JSContext *ctx, JSValueConst this_val, int magic) {
    char b[32];
    ULONG c;
    _LZ_ESTE;
    c = magic ? l->e.trazo : l->e.relleno;
    if ((c >> 24) == 255) sprintf(b, "#%02lx%02lx%02lx", (c >> 16) & 255, (c >> 8) & 255, c & 255);
    else sprintf(b, "rgba(%ld, %ld, %ld, %ld.%02ld)", (c >> 16) & 255, (c >> 8) & 255, c & 255, (c >> 24) / 255, ((c >> 24) % 255) * 100 / 255);
    return JS_NewString(ctx, b);
}
static JSValue _lz_estilo_set(JSContext *ctx, JSValueConst this_val, JSValueConst v, int magic) {
    const char *t;
    _LZ_ESTE;
    if (!JS_IsString(v)) return JS_UNDEFINED;
    t = JS_ToCString(ctx, v);
    if (!t) return JS_EXCEPTION;
    if (magic) l->e.trazo = _lz_color(l, t, l->e.trazo);
    else l->e.relleno = _lz_color(l, t, l->e.relleno);
    JS_FreeCString(ctx, t);
    return JS_UNDEFINED;
}
/* lineWidth (0), globalAlpha (1), y el tamaño del lienzo, __w (2) y __h (3), solo de leer */
static JSValue _lz_num_get(JSContext *ctx, JSValueConst this_val, int magic) {
    _LZ_ESTE;
    if (magic == 0) return JS_NewFloat64(ctx, l->e.grosor);
    if (magic == 1) return JS_NewFloat64(ctx, l->e.alfa / 255.0);
    return JS_NewInt32(ctx, magic == 2 ? l->w : l->h);
}
static JSValue _lz_num_set(JSContext *ctx, JSValueConst this_val, JSValueConst v, int magic) {
    double d = 0;
    _LZ_ESTE;
    if (JS_ToFloat64(ctx, &d, v) || d != d) return JS_UNDEFINED;
    if (magic == 0 && d > 0) l->e.grosor = d;
    if (magic == 1 && d >= 0 && d <= 1) l->e.alfa = (LONG)(d * 255 + 0.5);
    return JS_UNDEFINED;
}

static const JSCFunctionListEntry _lz_metodos[] = {
    JS_CFUNC_DEF("fillRect", 4, _lz_fillRect),
    JS_CFUNC_DEF("clearRect", 4, _lz_clearRect),
    JS_CFUNC_DEF("strokeRect", 4, _lz_strokeRect),
    JS_CFUNC_DEF("beginPath", 0, _lz_beginPath),
    JS_CFUNC_DEF("moveTo", 2, _lz_moveTo),
    JS_CFUNC_DEF("lineTo", 2, _lz_lineTo),
    JS_CFUNC_DEF("closePath", 0, _lz_closePath),
    JS_CFUNC_DEF("rect", 4, _lz_rect_js),
    JS_CFUNC_DEF("arc", 6, _lz_arc_js),
    JS_CFUNC_DEF("ellipse", 8, _lz_ellipse_js),
    JS_CFUNC_DEF("quadraticCurveTo", 4, _lz_quadratic),
    JS_CFUNC_DEF("bezierCurveTo", 6, _lz_bezier_js),
    JS_CFUNC_DEF("arcTo", 5, _lz_arcTo),
    JS_CFUNC_DEF("stroke", 0, _lz_stroke_js),
    JS_CFUNC_DEF("fill", 0, _lz_fill_js),
    JS_CFUNC_DEF("setTransform", 6, _lz_setTransform),
    JS_CFUNC_DEF("resetTransform", 0, _lz_resetTransform),
    JS_CFUNC_DEF("transform", 6, _lz_transform_js),
    JS_CFUNC_DEF("scale", 2, _lz_scale),
    JS_CFUNC_DEF("translate", 2, _lz_translate),
    JS_CFUNC_DEF("rotate", 1, _lz_rotate),
    JS_CFUNC_DEF("save", 0, _lz_save_js),
    JS_CFUNC_DEF("restore", 0, _lz_restore_js),
    JS_CFUNC_DEF("__tam", 2, _lz_tam_js),
    JS_CGETSET_MAGIC_DEF("fillStyle", _lz_estilo_get, _lz_estilo_set, 0),
    JS_CGETSET_MAGIC_DEF("strokeStyle", _lz_estilo_get, _lz_estilo_set, 1),
    JS_CGETSET_MAGIC_DEF("lineWidth", _lz_num_get, _lz_num_set, 0),
    JS_CGETSET_MAGIC_DEF("globalAlpha", _lz_num_get, _lz_num_set, 1),
    JS_CGETSET_MAGIC_DEF("__w", _lz_num_get, NULL, 2),
    JS_CGETSET_MAGIC_DEF("__h", _lz_num_get, NULL, 3),
};

/* __dashweb_lienzo(canvas, ancho, alto, "color de detrás"): su contexto 2D (el preludio lo guarda en el elemento) */
static JSValue _jsdom_lienzo(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    _Dash_Nodo *n = argc > 0 ? _jsdom_nodo(ctx, argv[0]) : NULL;
    const char *fondo;
    ULONG c = 0xFFFFFFUL;
    _Lienzo *l;
    JSValue o;
    if (!n) return JS_NULL;
    if (argc > 3 && JS_IsString(argv[3]) && (fondo = JS_ToCString(ctx, argv[3]))) {
        c = _lz_leer_color(fondo, 0xFFFFFFFFUL);
        if ((c >> 24) == 0) c = 0xFFFFFFUL;
        JS_FreeCString(ctx, fondo);
    }
    l = _lz_nuevo((APTR)n, (LONG)_lz_num(ctx, argc, argv, 1), (LONG)_lz_num(ctx, argc, argv, 2), c);
    if (!l) return JS_NULL;
    o = JS_NewObjectClass(ctx, _lz_clase);
    if (JS_IsException(o)) { _lz_liberar(l); return o; }
    JS_SetOpaque(o, l);
    return o;
}

static void _jsdom_lienzo_clase(JSContext *ctx) {
    JSClassDef clase = { "CanvasRenderingContext2D", _lz_finalizar };
    JSValue proto;
    JSRuntime *rt = JS_GetRuntime(ctx);
    JS_NewClassID(&_lz_clase);
    if (!JS_IsRegisteredClass(rt, _lz_clase)) JS_NewClass(rt, _lz_clase, &clase);
    proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, proto, _lz_metodos, sizeof(_lz_metodos) / sizeof(_lz_metodos[0]));
    JS_SetClassProto(ctx, _lz_clase, proto);
}
void jsdom_motor_dom(LONG js, struct _Dash_Nodo * doc)
{
    _JsMotor *m = (_JsMotor *)js;
    _JsDom *d;
    JSValue proto, documento, global;
    JSClassDef clase = { "Node", _jsdom_finalizar };
    if (!m || m->extra) return;
    d = (_JsDom *)calloc(1, sizeof(_JsDom));
    if (!d) return;
    JS_NewClassID(&_jsdom_clase);
    if (!JS_IsRegisteredClass(m->rt, _jsdom_clase)) JS_NewClass(m->rt, _jsdom_clase, &clase);
    _dash_retain(doc);
    d->doc = doc;
    d->motor = (LONG)m;
    m->extra = d;
    m->liberar_extra = _jsdom_liberar;
    JS_SetContextOpaque(m->ctx, d);
    proto = JS_NewObject(m->ctx);
    JS_SetPropertyFunctionList(m->ctx, proto, _jsdom_metodos, sizeof(_jsdom_metodos) / sizeof(_jsdom_metodos[0]));
    JS_SetClassProto(m->ctx, _jsdom_clase, proto);
    documento = _jsdom_objeto(m->ctx, doc);
    JS_SetPropertyFunctionList(m->ctx, documento, _jsdom_documento, sizeof(_jsdom_documento) / sizeof(_jsdom_documento[0]));
    global = JS_GetGlobalObject(m->ctx);
    JS_SetPropertyStr(m->ctx, global, "document", documento);
    JS_SetPropertyStr(m->ctx, global, "window", JS_DupValue(m->ctx, global));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_reloj", JS_NewCFunction(m->ctx, _jsdom_reloj, "__dashweb_reloj", 0));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_galletas", JS_NewCFunction(m->ctx, _jsdom_galletas, "__dashweb_galletas", 1));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_caja", JS_NewCFunction(m->ctx, _jsdom_caja, "__dashweb_caja", 1));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_vista", JS_NewCFunction(m->ctx, _jsdom_vista, "__dashweb_vista", 0));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_pedir", JS_NewCFunction(m->ctx, _jsdom_pedir, "__dashweb_pedir", 5));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_galleta", JS_NewCFunction(m->ctx, _jsdom_galleta, "__dashweb_galleta", 2));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_navegar", JS_NewCFunction(m->ctx, _jsdom_navegar, "__dashweb_navegar", 2));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_es_nodo", JS_NewCFunction(m->ctx, _jsdom_es_nodo, "__dashweb_es_nodo", 1));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_calculado", JS_NewCFunction(m->ctx, _jsdom_calculado, "__dashweb_calculado", 2));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_media", JS_NewCFunction(m->ctx, _jsdom_media, "__dashweb_media", 1));
    JS_SetPropertyStr(m->ctx, global, "__dashweb_documento_nuevo", JS_NewCFunction(m->ctx, _jsdom_documento_nuevo, "__dashweb_documento_nuevo", 1));
    _jsdom_lienzo_clase(m->ctx);
    JS_SetPropertyStr(m->ctx, global, "__dashweb_lienzo", JS_NewCFunction(m->ctx, _jsdom_lienzo, "__dashweb_lienzo", 4));
    JS_FreeValue(m->ctx, global);
}
void jsdom_vista(LONG js, LONG ancho, LONG alto, LONG desde, LONG total)
{
    _JsMotor *m = (_JsMotor *)js;
    _JsDom *d;
    if (!m || !m->extra) return;
    d = (_JsDom *)m->extra;
    d->vista[0] = ancho;
    d->vista[1] = alto;
    d->vista[2] = desde;
    d->vista[3] = total;
}
LONG jsdom_desplazamiento(LONG js)
{
    _JsMotor *m = (_JsMotor *)js;
    JSValue g, v;
    int32_t y = -1;
    if (!m || !m->extra) return -1;
    g = JS_GetGlobalObject(m->ctx);
    v = JS_GetPropertyStr(m->ctx, g, "__dashweb_desplazar");
    if (JS_IsNumber(v)) {
        JS_ToInt32(m->ctx, &y, v);
        JS_SetPropertyStr(m->ctx, g, "__dashweb_desplazar", JS_UNDEFINED);
    }
    JS_FreeValue(m->ctx, v);
    JS_FreeValue(m->ctx, g);
    return y;
}
void jsdom_desplazado(LONG js)
{
    _JsMotor *m = (_JsMotor *)js;
    if (!m || !m->extra) return;
    JS_FreeValue(m->ctx, _jsdom_llamar(m->ctx, "__dashweb_desplazado", 0, NULL));
}
void jsdom_intersecciones(LONG js, LONG todo)
{
    _JsMotor *m = (_JsMotor *)js;
    JSValue a;
    if (!m || !m->extra) return;
    a = JS_NewBool(m->ctx, todo);
    JS_FreeValue(m->ctx, _jsdom_llamar(m->ctx, "__dashweb_intersecciones", 1, &a));
}
void _jsdom_responder(LONG js, LONG id, LONG estado, STRPTR razon, STRPTR cabeceras, STRPTR url, STRPTR cuerpo, STRPTR error)
{
    _JsMotor *m = (_JsMotor *)js;
    JSValue a[8];
    LONG n = cuerpo ? strlen((char *)cuerpo) : 0;
    int i;
    if (!m || !m->extra) return;
    a[0] = JS_NewInt32(m->ctx, id);
    a[1] = JS_NewInt32(m->ctx, estado);
    a[2] = _jsdom_cadena(m->ctx, razon);
    a[3] = _jsdom_cadena(m->ctx, cabeceras);
    a[4] = _jsdom_cadena(m->ctx, url);
    a[5] = JS_NewStringLen(m->ctx, cuerpo ? (const char *)cuerpo : "", n);
    a[6] = JS_NewArrayBufferCopy(m->ctx, (const uint8_t *)(cuerpo ? (const char *)cuerpo : ""), n);
    a[7] = _jsdom_cadena(m->ctx, error);
    JS_FreeValue(m->ctx, _jsdom_llamar(m->ctx, "__dashweb_respuesta", 8, a));
    for (i = 0; i < 8; i++) JS_FreeValue(m->ctx, a[i]);
}
LONG jsdom_cambios(LONG js)
{
    _JsMotor *m = (_JsMotor *)js;
    return m && m->extra ? ((_JsDom *)m->extra)->cambios : 0;
}
LONG jsdom_clic(LONG js, struct _Dash_Nodo * n)
{
    _JsMotor *m = (_JsMotor *)js;
    JSValue args[2], r;
    BOOL seguir = TRUE;
    if (!m || !m->extra || !n) return TRUE;
    args[0] = _jsdom_objeto(m->ctx, n);
    args[1] = JS_NewString(m->ctx, "click");
    r = _jsdom_llamar(m->ctx, "__dashweb_despachar", 2, args);
    if (JS_IsBool(r)) seguir = JS_ToBool(m->ctx, r);
    JS_FreeValue(m->ctx, r);
    JS_FreeValue(m->ctx, args[0]);
    JS_FreeValue(m->ctx, args[1]);
    return seguir;
}
void jsdom_raton(LONG js, struct _Dash_Nodo * nuevo, struct _Dash_Nodo * viejo, LONG x, LONG y)
{
    _JsMotor *m = (_JsMotor *)js;
    JSValue args[4], r;
    if (!m || !m->extra) return;
    args[0] = _jsdom_objeto(m->ctx, nuevo);
    args[1] = _jsdom_objeto(m->ctx, viejo);
    args[2] = JS_NewInt32(m->ctx, (int32_t)x);
    args[3] = JS_NewInt32(m->ctx, (int32_t)y);
    r = _jsdom_llamar(m->ctx, "__dashweb_raton", 4, args);
    JS_FreeValue(m->ctx, r);
    JS_FreeValue(m->ctx, args[0]);
    JS_FreeValue(m->ctx, args[1]);
}
LONG jsdom_temporizadores(LONG js)
{
    _JsMotor *m = (_JsMotor *)js;
    JSValue r;
    int32_t ms = -1;
    if (!m || !m->extra) return -1;
    r = _jsdom_llamar(m->ctx, "__dashweb_tick", 0, NULL);
    if (JS_IsNumber(r)) JS_ToInt32(m->ctx, &ms, r);
    JS_FreeValue(m->ctx, r);
    return ms;
}
LONG jsdom_evento(LONG js, struct _Dash_Nodo * n, STRPTR tipo)
{
    _JsMotor *m = (_JsMotor *)js;
    JSValue args[2], r;
    BOOL seguir = TRUE;
    if (!m || !m->extra || !n) return TRUE;
    args[0] = _jsdom_objeto(m->ctx, n);
    args[1] = JS_NewString(m->ctx, (const char *)tipo);
    r = _jsdom_llamar(m->ctx, "__dashweb_despachar", 2, args);
    if (JS_IsBool(r)) seguir = JS_ToBool(m->ctx, r);
    JS_FreeValue(m->ctx, r);
    JS_FreeValue(m->ctx, args[0]);
    JS_FreeValue(m->ctx, args[1]);
    return seguir;
}
struct _Dash_Nodo * jsdom_envio(LONG js)
{
    _JsMotor *m = (_JsMotor *)js;
    JSValue global, v;
    _Dash_Nodo *n = NULL;
    if (!m || !m->extra) return NULL;
    global = JS_GetGlobalObject(m->ctx);
    v = JS_GetPropertyStr(m->ctx, global, "__dashweb_envio");
    n = _jsdom_nodo(m->ctx, v);
    JS_FreeValue(m->ctx, v);
    if (n) JS_SetPropertyStr(m->ctx, global, "__dashweb_envio", JS_NULL);
    JS_FreeValue(m->ctx, global);
    return n;
}

/* ==== lib/html5.dash ==== */
#include <hubbub/hubbub.h>
#include <hubbub/parser.h>
#include <hubbub/tree.h>
/* lib/html5.dash: the tree Hubbub builds, as numbered nodes (1 = the document) */
typedef struct {
    short tipo;              /* DOM_ELEMENTO 1, DOM_TEXTO 3, DOM_COMENTARIO 8, DOM_DOCUMENTO 9, doctype 10 */
    char *nombre;            /* element: its name in lower case */
    char *texto;             /* text and comment (UTF-8) */
    LONG padre;
    LONG *hijos;
    LONG nh, ch;
    char **an, **av;         /* attributes: names (lower case) and values */
    LONG na, ca;
} _H5Nodo;

typedef struct {
    _H5Nodo *n;
    LONG cuantos, cap;
    char *doctype;
    BOOL mal;                /* out of memory */
    int modo;                /* hubbub_quirks_mode: 0 no-quirks, 1 limited, 2 quirks */
} _H5;

static char *_h5_copia(const uint8_t *p, size_t len, BOOL minusculas) {
    char *r = (char *)malloc(len + 1);
    size_t i;
    if (!r) return NULL;
    for (i = 0; i < len; i++) r[i] = (minusculas && p[i] >= 'A' && p[i] <= 'Z') ? p[i] + 32 : p[i];
    r[len] = 0;
    return r;
}

static LONG _h5_nuevo(_H5 *h, int tipo) {
    _H5Nodo *x;
    if (h->cuantos + 1 >= h->cap) {
        LONG cap = h->cap ? h->cap * 2 : 1024;
        _H5Nodo *n = (_H5Nodo *)realloc(h->n, cap * sizeof(_H5Nodo));
        if (!n) { h->mal = TRUE; return 0; }
        h->n = n;
        h->cap = cap;
    }
    h->cuantos++;
    x = &h->n[h->cuantos];
    memset(x, 0, sizeof(*x));
    x->tipo = tipo;
    return h->cuantos;
}

#define _H5N(h, id) (&(h)->n[(LONG)(id)])

static void _h5_meter(_H5 *h, LONG padre, LONG hijo, LONG pos) {
    _H5Nodo *p = _H5N(h, padre);
    LONG i;
    if (p->nh + 1 > p->ch) {
        LONG ch = p->ch ? p->ch * 2 : 4;
        LONG *n = (LONG *)realloc(p->hijos, ch * sizeof(LONG));
        if (!n) { h->mal = TRUE; return; }
        p->hijos = n;
        p->ch = ch;
    }
    if (pos < 0 || pos > p->nh) pos = p->nh;
    for (i = p->nh; i > pos; i--) p->hijos[i] = p->hijos[i - 1];
    p->hijos[pos] = hijo;
    p->nh++;
    _H5N(h, hijo)->padre = padre;
}

static void _h5_sacar(_H5 *h, LONG hijo) {
    LONG padre = _H5N(h, hijo)->padre, i, j;
    _H5Nodo *p;
    if (!padre) return;
    p = _H5N(h, padre);
    for (i = 0, j = 0; i < p->nh; i++) if (p->hijos[i] != hijo) p->hijos[j++] = p->hijos[i];
    p->nh = j;
    _H5N(h, hijo)->padre = 0;
}

static LONG _h5_posicion(_H5 *h, LONG padre, LONG hijo) {
    _H5Nodo *p = _H5N(h, padre);
    LONG i;
    for (i = 0; i < p->nh; i++) if (p->hijos[i] == hijo) return i;
    return -1;
}

static void _h5_atributo(_H5 *h, LONG id, const hubbub_attribute *a) {
    _H5Nodo *x = _H5N(h, id);
    char *nombre = _h5_copia(a->name.ptr, a->name.len, TRUE);
    LONG i;
    if (!nombre) { h->mal = TRUE; return; }
    for (i = 0; i < x->na; i++) if (!strcmp(x->an[i], nombre)) { free(nombre); return; }
    if (x->na + 1 > x->ca) {
        LONG ca = x->ca ? x->ca * 2 : 4;
        char **an = (char **)realloc(x->an, ca * sizeof(char *)), **av;
        if (!an) { free(nombre); h->mal = TRUE; return; }
        x->an = an;
        av = (char **)realloc(x->av, ca * sizeof(char *));
        if (!av) { free(nombre); h->mal = TRUE; return; }
        x->av = av;
        x->ca = ca;
    }
    x->an[x->na] = nombre;
    x->av[x->na] = _h5_copia(a->value.ptr, a->value.len, FALSE);
    x->na++;
}

static hubbub_error _h5_comentario(void *ctx, const hubbub_string *d, void **r) {
    _H5 *h = (_H5 *)ctx;
    LONG id = _h5_nuevo(h, 8);
    if (!id) return HUBBUB_NOMEM;
    _H5N(h, id)->texto = _h5_copia(d->ptr, d->len, FALSE);
    *r = (void *)id;
    return HUBBUB_OK;
}

static hubbub_error _h5_doctype(void *ctx, const hubbub_doctype *d, void **r) {
    _H5 *h = (_H5 *)ctx;
    LONG id = _h5_nuevo(h, 10);
    if (!id) return HUBBUB_NOMEM;
    if (!h->doctype && d->name.len) h->doctype = _h5_copia(d->name.ptr, d->name.len, FALSE);
    *r = (void *)id;
    return HUBBUB_OK;
}

static hubbub_error _h5_elemento(void *ctx, const hubbub_tag *t, void **r) {
    _H5 *h = (_H5 *)ctx;
    LONG id = _h5_nuevo(h, 1);
    uint32_t i;
    if (!id) return HUBBUB_NOMEM;
    _H5N(h, id)->nombre = _h5_copia(t->name.ptr, t->name.len, TRUE);
    for (i = 0; i < t->n_attributes; i++) _h5_atributo(h, id, &t->attributes[i]);
    *r = (void *)id;
    return h->mal ? HUBBUB_NOMEM : HUBBUB_OK;
}

static hubbub_error _h5_texto(void *ctx, const hubbub_string *d, void **r) {
    _H5 *h = (_H5 *)ctx;
    LONG id = _h5_nuevo(h, 3);
    if (!id) return HUBBUB_NOMEM;
    _H5N(h, id)->texto = _h5_copia(d->ptr, d->len, FALSE);
    *r = (void *)id;
    return HUBBUB_OK;
}

static hubbub_error _h5_ref(void *ctx, void *n) { return HUBBUB_OK; }

/* a text right after another text joins it (the parser expects that: result = the node that stays) */
static BOOL _h5_juntar(_H5 *h, LONG anterior, LONG hijo) {
    _H5Nodo *a, *b;
    char *t;
    if (anterior <= 0) return FALSE;
    a = _H5N(h, anterior);
    b = _H5N(h, hijo);
    if (a->tipo != 3 || b->tipo != 3 || b->padre) return FALSE;
    t = (char *)malloc(strlen(a->texto ? a->texto : "") + strlen(b->texto ? b->texto : "") + 1);
    if (!t) { h->mal = TRUE; return FALSE; }
    strcpy(t, a->texto ? a->texto : "");
    strcat(t, b->texto ? b->texto : "");
    free(a->texto);
    a->texto = t;
    return TRUE;
}

static hubbub_error _h5_agregar(void *ctx, void *padre, void *hijo, void **r) {
    _H5 *h = (_H5 *)ctx;
    _H5Nodo *p = _H5N(h, padre);
    LONG ultimo = p->nh ? p->hijos[p->nh - 1] : 0;
    if (_h5_juntar(h, ultimo, (LONG)hijo)) { *r = (void *)ultimo; return HUBBUB_OK; }
    _h5_sacar(h, (LONG)hijo);
    _h5_meter(h, (LONG)padre, (LONG)hijo, -1);
    *r = hijo;
    return h->mal ? HUBBUB_NOMEM : HUBBUB_OK;
}

static hubbub_error _h5_antes(void *ctx, void *padre, void *hijo, void *ref, void **r) {
    _H5 *h = (_H5 *)ctx;
    LONG pos = _h5_posicion(h, (LONG)padre, (LONG)ref);
    _H5Nodo *p = _H5N(h, padre);
    if (pos > 0 && _h5_juntar(h, p->hijos[pos - 1], (LONG)hijo)) { *r = (void *)p->hijos[pos - 1]; return HUBBUB_OK; }
    _h5_sacar(h, (LONG)hijo);
    pos = _h5_posicion(h, (LONG)padre, (LONG)ref);
    _h5_meter(h, (LONG)padre, (LONG)hijo, pos);
    *r = hijo;
    return h->mal ? HUBBUB_NOMEM : HUBBUB_OK;
}

static hubbub_error _h5_quitar(void *ctx, void *padre, void *hijo, void **r) {
    _h5_sacar((_H5 *)ctx, (LONG)hijo);
    *r = hijo;
    return HUBBUB_OK;
}

static LONG _h5_clonar(_H5 *h, LONG id, BOOL hondo) {
    LONG c = _h5_nuevo(h, _H5N(h, id)->tipo), i;
    _H5Nodo *o, *x;
    if (!c) return 0;
    o = _H5N(h, id);
    x = _H5N(h, c);
    if (o->nombre) x->nombre = strdup(o->nombre);
    if (o->texto) x->texto = strdup(o->texto);
    for (i = 0; i < o->na; i++) {
        hubbub_attribute a;
        o = _H5N(h, id);
        a.ns = HUBBUB_NS_NULL;
        a.name.ptr = (const uint8_t *)o->an[i]; a.name.len = strlen(o->an[i]);
        a.value.ptr = (const uint8_t *)o->av[i]; a.value.len = o->av[i] ? strlen(o->av[i]) : 0;
        _h5_atributo(h, c, &a);
    }
    if (hondo) {
        for (i = 0; i < _H5N(h, id)->nh; i++) {
            LONG k = _h5_clonar(h, _H5N(h, id)->hijos[i], TRUE);
            if (k) _h5_meter(h, c, k, -1);
        }
    }
    return c;
}

static hubbub_error _h5_clon(void *ctx, void *n, bool hondo, void **r) {
    LONG c = _h5_clonar((_H5 *)ctx, (LONG)n, hondo);
    if (!c) return HUBBUB_NOMEM;
    *r = (void *)c;
    return HUBBUB_OK;
}

static hubbub_error _h5_mudar(void *ctx, void *n, void *nuevo) {
    _H5 *h = (_H5 *)ctx;
    while (_H5N(h, n)->nh > 0) {
        LONG k = _H5N(h, n)->hijos[0];
        _h5_sacar(h, k);
        _h5_meter(h, (LONG)nuevo, k, -1);
        if (h->mal) return HUBBUB_NOMEM;
    }
    return HUBBUB_OK;
}

static hubbub_error _h5_padre(void *ctx, void *n, bool solo_elementos, void **r) {
    _H5 *h = (_H5 *)ctx;
    LONG p = _H5N(h, n)->padre;
    if (p && solo_elementos && _H5N(h, p)->tipo != 1) p = 0;
    *r = (void *)p;
    return HUBBUB_OK;
}

static hubbub_error _h5_tiene_hijos(void *ctx, void *n, bool *r) {
    *r = _H5N((_H5 *)ctx, n)->nh > 0;
    return HUBBUB_OK;
}

static hubbub_error _h5_formulario(void *ctx, void *f, void *n) { return HUBBUB_OK; }

static hubbub_error _h5_atributos(void *ctx, void *n, const hubbub_attribute *a, uint32_t k) {
    _H5 *h = (_H5 *)ctx;
    uint32_t i;
    for (i = 0; i < k; i++) _h5_atributo(h, (LONG)n, &a[i]);
    return h->mal ? HUBBUB_NOMEM : HUBBUB_OK;
}

static hubbub_error _h5_modo(void *ctx, hubbub_quirks_mode m) { ((_H5 *)ctx)->modo = (int)m; return HUBBUB_OK; }
static hubbub_error _h5_juego(void *ctx, const char *e) { return HUBBUB_OK; }
static hubbub_error _h5_script(void *ctx, void *s) { return HUBBUB_OK; }

static void _h5_liberar_todo(_H5 *h) {
    LONG i, k;
    if (!h) return;
    for (i = 1; i <= h->cuantos; i++) {
        _H5Nodo *x = &h->n[i];
        free(x->nombre);
        free(x->texto);
        free(x->hijos);
        for (k = 0; k < x->na; k++) { free(x->an[k]); free(x->av[k]); }
        free(x->an);
        free(x->av);
    }
    free(h->n);
    free(h->doctype);
    free(h);
}
LONG _h5_analizar(STRPTR texto, LONG utf8)
{
    _H5 *h = (_H5 *)calloc(1, sizeof(_H5));
    hubbub_parser *p = NULL;
    hubbub_tree_handler th;
    hubbub_parser_optparams o;
    hubbub_error e;
    if (!h) return 0;
    if (_h5_nuevo(h, 9) != 1 || hubbub_parser_create(utf8 ? "UTF-8" : "ISO-8859-1", true, &p) != HUBBUB_OK) {
        _h5_liberar_todo(h);
        return 0;
    }
    th.create_comment = _h5_comentario;
    th.create_doctype = _h5_doctype;
    th.create_element = _h5_elemento;
    th.create_text = _h5_texto;
    th.ref_node = _h5_ref;
    th.unref_node = _h5_ref;
    th.append_child = _h5_agregar;
    th.insert_before = _h5_antes;
    th.remove_child = _h5_quitar;
    th.clone_node = _h5_clon;
    th.reparent_children = _h5_mudar;
    th.get_parent = _h5_padre;
    th.has_children = _h5_tiene_hijos;
    th.form_associate = _h5_formulario;
    th.add_attributes = _h5_atributos;
    th.set_quirks_mode = _h5_modo;
    th.encoding_change = _h5_juego;
    th.complete_script = _h5_script;
    th.ctx = h;
    o.tree_handler = &th;
    hubbub_parser_setopt(p, HUBBUB_PARSER_TREE_HANDLER, &o);
    o.document_node = (void *)1;
    hubbub_parser_setopt(p, HUBBUB_PARSER_DOCUMENT_NODE, &o);
    o.enable_scripting = true;
    hubbub_parser_setopt(p, HUBBUB_PARSER_ENABLE_SCRIPTING, &o);
    e = hubbub_parser_parse_chunk(p, (const uint8_t *)texto, strlen((const char *)texto));
    if (e == HUBBUB_OK) e = hubbub_parser_completed(p);
    hubbub_parser_destroy(p);
    if (e != HUBBUB_OK || h->mal) {
        _h5_liberar_todo(h);
        return 0;
    }
    return (LONG)h;
}
void _h5_liberar(LONG h)
{
    _h5_liberar_todo((_H5 *)h);
}
LONG _h5_tipo(LONG h, LONG id)
{
    return _H5N((_H5 *)h, id)->tipo;
}
STRPTR _h5_nombre(LONG h, LONG id)
{
    char *t = _H5N((_H5 *)h, id)->nombre;
    return (STRPTR)(t ? t : "");
}
STRPTR _h5_texto_de(LONG h, LONG id)
{
    char *t = _H5N((_H5 *)h, id)->texto;
    return _dash_str_dup((STRPTR)(t ? t : ""), TRUE);
}
LONG _h5_nhijos(LONG h, LONG id)
{
    return _H5N((_H5 *)h, id)->nh;
}
LONG _h5_hijo(LONG h, LONG id, LONG i)
{
    return _H5N((_H5 *)h, id)->hijos[i];
}
LONG _h5_natributos(LONG h, LONG id)
{
    return _H5N((_H5 *)h, id)->na;
}
STRPTR _h5_atr_nombre(LONG h, LONG id, LONG i)
{
    return (STRPTR)_H5N((_H5 *)h, id)->an[i];
}
STRPTR _h5_atr_valor(LONG h, LONG id, LONG i)
{
    char *t = _H5N((_H5 *)h, id)->av[i];
    return _dash_str_dup((STRPTR)(t ? t : ""), TRUE);
}
STRPTR _h5_doctype_de(LONG h)
{
    char *t = ((_H5 *)h)->doctype;
    return (STRPTR)(t ? t : "");
}
LONG _h5_modo_de(LONG h)
{
    return (LONG)((_H5 *)h)->modo;
}

/* ==== lib/documento.dash ==== */
static int _documento_por_js_c(_Dash_Nodo *doc, _Dash_Nodo *n) { return documento_maquetar_por_js(doc, n) ? 1 : 0; }
void _documento_enganchar(void)
{
    jsdom_al_pedir_caja = _documento_por_js_c;
}
