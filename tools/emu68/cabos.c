/* lo que QuickJS enlaza y no se usa al crear el contexto: si se llama, se dice */
#include <stdint.h>
#include <stddef.h>
void e68_puts(const char *s);
#define CABO(f) void f(void) { e68_puts("[qjs-e68] CABO " #f "\n"); for (;;) ; }
CABO(trunc) CABO(round) CABO(lrint) CABO(log2) CABO(fmin) CABO(fmax) CABO(atanh) CABO(asinh) CABO(acosh)
CABO(fwrite) CABO(fputc) CABO(fprintf)
void _js_aserto(const char *a, const char *f, int l) { e68_puts("[qjs-e68] ASERTO "); e68_puts(a); e68_puts(" "); e68_puts(f); e68_puts("\n"); for (;;) ; }

struct tm_e68 { int x[11]; } tm0;
int gettimeofday(void *tv, void *tz) { if (tv) { ((long *)tv)[0] = 0; ((long *)tv)[1] = 0; } return 0; }
long mktime(void *t) { return 0; }
void *localtime(const void *t) { return &tm0; }
void *gmtime(const void *t) { return &tm0; }
