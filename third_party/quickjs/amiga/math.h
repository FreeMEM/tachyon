/* AmigaOS (Tachyon, tarea 38c3): el math.h de libnix, con isnan, isinf e isfinite que miran los bits del double.
   La FPU emulada de FS-UAE compara mal los infinitos (fcmp de Infinity con Infinity da "no ordenados": inf == inf es
   falso e isnan(inf), verdadero, con la función de libnix y con la de GCC): QuickJS tomaba Infinity por 0 al pasarlo
   a entero (JS_ToInt32Sat) y fallaban [].flat(Infinity) (el reproductor de YouTube se quedaba sin sus métodos),
   slice(0, Infinity), substring, at, fill, charAt, copyWithin e isNaN(Infinity). Con los bits vale en cualquier
   FPU; las comparaciones directas (Infinity === Infinity) siguen siendo cosa de la FPU. */
#include_next <math.h>
#include <stdint.h>

static inline uint64_t _amiga_bits(double d)
{
    union { double d; uint64_t u; } x;
    x.d = d;
    return x.u & 0x7fffffffffffffffULL;
}
#undef isnan
#define isnan(x) (_amiga_bits(x) > 0x7ff0000000000000ULL)
#undef isinf
#define isinf(x) (_amiga_bits(x) == 0x7ff0000000000000ULL)
#undef isfinite
#define isfinite(x) (_amiga_bits(x) < 0x7ff0000000000000ULL)
