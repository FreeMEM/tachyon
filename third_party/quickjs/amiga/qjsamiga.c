/* QuickJS on AmigaOS 3.x: runs the .js files given as arguments and measures
   them with the timer.device EClock. Output lines:
     MEM  <label> <bytes>        free memory consumed since start
     TIME <label> <ms>
   print(...) writes its arguments; ticks() returns milliseconds as a number. */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <exec/memory.h>
#include <devices/timer.h>
#include <proto/exec.h>
#include <proto/timer.h>
#include "quickjs.h"

/* un assert de QuickJS que falla (amiga/assert.h): cuál, y abort */
void _js_aserto(const char *e, const char *fichero, int linea)
{
    printf("assert de QuickJS: %s (%s, línea %d)\n", e, fichero, linea);
    abort();
}

#ifndef QJS_STACK
#define QJS_STACK (256 * 1024)
#endif
extern void __stkinit(void);
void *__stkinit_ref = (void *)__stkinit;
unsigned long __stack = QJS_STACK;

struct Device *TimerBase;
static struct timerequest tr;
static ULONG efreq;
static ULONG mem0;

static double now_ms(void)
{
    struct EClockVal ev;
    unsigned long long t;
    ReadEClock(&ev);
    t = ((unsigned long long)ev.ev_hi << 32) | ev.ev_lo;
    return (double)t * 1000.0 / (double)efreq;
}

static ULONG used(void)
{
    return mem0 - AvailMem(MEMF_ANY);
}

static JSValue js_print(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
    int i;
    for (i = 0; i < argc; i++) {
        const char *s = JS_ToCString(ctx, argv[i]);
        if (i)
            putchar(' ');
        fputs(s ? s : "?", stdout);
        JS_FreeCString(ctx, s);
    }
    putchar('\n');
    fflush(stdout);
    return JS_UNDEFINED;
}

static JSValue js_ticks(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv)
{
    return JS_NewFloat64(ctx, now_ms());
}

static void dump_exception(JSContext *ctx)
{
    JSValue e = JS_GetException(ctx);
    const char *s = JS_ToCString(ctx, e);
    printf("EXCEPTION %s\n", s ? s : "?");
    JS_FreeCString(ctx, s);
    if (JS_IsObject(e)) {
        JSValue st = JS_GetPropertyStr(ctx, e, "stack");
        if (!JS_IsUndefined(st)) {
            s = JS_ToCString(ctx, st);
            printf("%s\n", s ? s : "");
            JS_FreeCString(ctx, s);
        }
        JS_FreeValue(ctx, st);
    }
    JS_FreeValue(ctx, e);
}

static char *read_file(const char *name, size_t *len)
{
    FILE *f = fopen(name, "rb");
    char *buf;
    long n;
    if (!f)
        return NULL;
    fseek(f, 0, SEEK_END);
    n = ftell(f);
    fseek(f, 0, SEEK_SET);
    buf = malloc(n + 1);
    if (buf && fread(buf, 1, n, f) != (size_t)n) {
        free(buf);
        buf = NULL;
    }
    fclose(f);
    if (buf) {
        buf[n] = 0;
        *len = n;
    }
    return buf;
}

int main(int argc, char **argv)
{
    JSRuntime *rt;
    JSContext *ctx;
    JSValue global;
    double t0;
    int i, rc = 0;

    mem0 = AvailMem(MEMF_ANY);
    if (OpenDevice((CONST_STRPTR)TIMERNAME, UNIT_ECLOCK, (struct IORequest *)&tr, 0) != 0) {
        printf("no timer.device\n");
        return 20;
    }
    TimerBase = tr.tr_node.io_Device;
    {
        struct EClockVal ev;
        efreq = ReadEClock(&ev);
    }

    t0 = now_ms();
    rt = JS_NewRuntime();
    if (!rt) {
        printf("JS_NewRuntime failed\n");
        return 20;
    }
    JS_SetMaxStackSize(rt, QJS_STACK - 32 * 1024);
    ctx = JS_NewContext(rt);
    if (!ctx) {
        printf("JS_NewContext failed\n");
        return 20;
    }
    global = JS_GetGlobalObject(ctx);
    JS_SetPropertyStr(ctx, global, "print", JS_NewCFunction(ctx, js_print, "print", 1));
    JS_SetPropertyStr(ctx, global, "ticks", JS_NewCFunction(ctx, js_ticks, "ticks", 0));
    JS_FreeValue(ctx, global);
    printf("TIME context %.1f\n", now_ms() - t0);
    printf("MEM context %lu\n", (unsigned long)used());

    for (i = 1; i < argc; i++) {
        size_t len;
        char *src;
        JSValue r;
        int flags = JS_EVAL_TYPE_GLOBAL;
        if (strcmp(argv[i], "-c") == 0 && i + 1 < argc) {   /* -c file: compile only */
            flags |= JS_EVAL_FLAG_COMPILE_ONLY;
            i++;
        }
        src = read_file(argv[i], &len);
        if (!src) {
            printf("cannot read %s\n", argv[i]);
            rc = 10;
            continue;
        }
        t0 = now_ms();
        r = JS_Eval(ctx, src, len, argv[i], flags);
        if (JS_IsException(r)) {
            dump_exception(ctx);
            rc = 10;
        }
        JS_FreeValue(ctx, r);
        for (;;) {
            JSContext *c;
            int e = JS_ExecutePendingJob(rt, &c);
            if (e <= 0) {
                if (e < 0) {
                    dump_exception(c);
                    rc = 10;
                }
                break;
            }
        }
        printf("TIME %s%s %.1f\n", flags & JS_EVAL_FLAG_COMPILE_ONLY ? "compile:" : "", argv[i], now_ms() - t0);
        printf("MEM %s %lu\n", argv[i], (unsigned long)used());
        fflush(stdout);
        free(src);
    }

    JS_RunGC(rt);
    printf("MEM after_gc %lu\n", (unsigned long)used());
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    CloseDevice((struct IORequest *)&tr);
    return rc;
}
