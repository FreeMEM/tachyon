/* assert de QuickJS en el Amiga (tarea 38): dice cuál falló (la condición, el fichero y la línea) antes de abortar;
   el de libnix solo abortaba y no se sabía dónde. _js_aserto está en lib/js.dash; tools/build_qjs.sh pone esta
   carpeta delante de las del sistema. */
#undef assert
#ifdef NDEBUG
#define assert(e) ((void)0)
#else
void _js_aserto(const char *e, const char *fichero, int linea);
#define assert(e) ((e) ? (void)0 : _js_aserto(#e, __FILE__, __LINE__))
#endif
