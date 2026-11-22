/* QuickJS (el libqjs.a de Tachyon, tal cual) sin sistema operativo, bajo Emu68 para Raspberry en QEMU:
   crea el runtime y el contexto como js_nuevo de src_c/tachyon.c (tarea 75, David Martínez) */
#include <stdint.h>
#include <stddef.h>
#include <stdarg.h>
#include <string.h>
#include "quickjs.h"

#define UART ((volatile uint32_t *)0xf2201000)
static void put(char c) {
    while (UART[0x18/4] & (0x20 << 24)) ;
    UART[0] = ((uint32_t)(uint8_t)c) << 24;
}
void e68_puts(const char *s) { while (*s) { if (*s == '\n') put('\r'); put(*s++); } }
static void hex(uint32_t v) { int i; for (i = 28; i >= 0; i -= 4) put("0123456789abcdef"[(v >> i) & 15]); }
static void dec(uint32_t v) { char b[12]; int i = 11; b[i] = 0; do { b[--i] = '0' + v % 10; v /= 10; } while (v); e68_puts(b + i); }

/* memoria: un montón propio (bss), con cabecera de 8 como _jm_malloc; free no devuelve nada */
#define MONTON (96UL * 1024 * 1024)
static char monton[MONTON] __attribute__((aligned(16)));
static size_t usado = 0;
static void *pedir(size_t n) {
    char *p;
    n = (n + 8 + 7) & ~(size_t)7;
    if (usado + n > MONTON) return NULL;
    p = monton + usado; usado += n;
    ((size_t *)p)[0] = n - 8;
    return p + 8;
}
static size_t tam(const void *p) { return p ? ((const size_t *)((const char *)p - 8))[0] : 0; }
static void *m_malloc(JSMallocState *s, size_t n) {
    void *p;
    if (s->malloc_size + n > s->malloc_limit) return NULL;
    p = pedir(n);
    if (p) { s->malloc_count++; s->malloc_size += tam(p) + 8; }
    return p;
}
static void m_free(JSMallocState *s, void *q) { if (q) { s->malloc_count--; s->malloc_size -= tam(q) + 8; } }
static void *m_realloc(JSMallocState *s, void *q, size_t n) {
    void *p;
    size_t a;
    if (!q) return n ? m_malloc(s, n) : NULL;
    if (!n) { m_free(s, q); return NULL; }
    a = tam(q);
    if (n <= a) return q;
    p = m_malloc(s, n);
    if (!p) return NULL;
    memcpy(p, q, a);
    m_free(s, q);
    return p;
}
static const JSMallocFunctions funciones = { m_malloc, m_free, m_realloc, tam };

/* lo que QuickJS pide a la libc y no está en libnix sin sistema */
void *malloc(size_t n) { return pedir(n); }
void free(void *p) { (void)p; }


int __start(void) {
    JSRuntime *rt;
    JSContext *ctx;
    JSValue v;
    e68_puts("[qjs-e68] empieza\n");
    { extern void vectores_poner(void); vectores_poner(); }
    rt = JS_NewRuntime2(&funciones, NULL);
    e68_puts("[qjs-e68] runtime "); hex((uint32_t)rt); e68_puts("\n");
    JS_SetMaxStackSize(rt, 983040);
    JS_SetMemoryLimit(rt, 183613824);
    e68_puts("[qjs-e68] contexto\n");
    ctx = JS_NewContext(rt);
    e68_puts("[qjs-e68] contexto hecho "); hex((uint32_t)ctx); e68_puts(", memoria usada "); dec(usado); e68_puts("\n");
    {
        static const char codigo[] = "[3,1,2].sort().join('-') + ' ' + (0.1+0.2)";
        v = JS_Eval(ctx, codigo, sizeof codigo - 1, "<e68>", 0);
    }
    {
        const char *t = JS_ToCString(ctx, v);
        e68_puts("[qjs-e68] eval: "); e68_puts(t ? t : "(nada)"); e68_puts("\n");
    }
    e68_puts("[qjs-e68] FIN\n");
    for (;;) ;
}
void *realloc(void *q, size_t n) { void *p; size_t a = tam(q); if (q && n <= a) return q; p = pedir(n); if (p && q) memcpy(p, q, a); return p; }
void *calloc(size_t a, size_t b) { void *p = pedir(a * b); if (p) memset(p, 0, a * b); return p; }
void abort(void) { e68_puts("[qjs-e68] ABORT\n"); for (;;) ; }
/* (vectores.s) el marco de la excepción: SR (16), PC (32), formato/vector (16), y lo que siga */
void trampa_c(uint16_t *marco) {
    uint32_t pc = ((uint32_t)marco[1] << 16) | marco[2];
    uint16_t fv = marco[3];
    e68_puts("[qjs-e68] EXCEPCION vector "); dec((fv & 0xfff) / 4); e68_puts(" formato "); dec(fv >> 12);
    e68_puts(" PC "); hex(pc); e68_puts(" SR "); hex(marco[0]); e68_puts("\n");
    e68_puts("  marco:"); { int i; for (i = 0; i < 16; i++) { e68_puts(" "); hex(marco[i]); } } e68_puts("\n");
    for (;;) ;
}
