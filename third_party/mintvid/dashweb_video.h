/* dashweb: interfaz de vídeo sobre el núcleo de MintVID (third_party/mintvid/dashweb_video.c) */
#ifndef DASHWEB_VIDEO_H
#define DASHWEB_VIDEO_H
long dwv_abrir(const char *fichero);           /* un vídeo (MP4/MOV, AVI, MKV, MPEG-TS...); 0 si no se puede */
long dwv_abrir_bajando(const unsigned char *datos, long listos, long total);  /* aún se baja; 0: probar luego */
void dwv_bajado(long v, const unsigned char *datos, long listos);  /* lo que ha llegado ya, y dónde está */
void dwv_bajado_fichero(long v, const char *fichero);  /* ya está entero en el fichero */
/* en trozos de DWV_TROZO bytes que pone dashweb según llegan (sin un búfer seguido: con la memoria troceada no cabía
   un vídeo largo; tarea 64g): una tabla nueva, sus trozos, cuánto hay; abrir (0: probar luego); soltarla al final */
#define DWV_TROZO 1048576
long dwv_trozos_nuevos(long total);
void dwv_trozos_poner(long t, long i, const unsigned char *trozo);
void dwv_trozos_listos(long t, long listos);
long dwv_abrir_trozos(long t);
void dwv_trozos_soltar(long t);
long dwv_ancho(long v);
long dwv_alto(long v);
long dwv_fps_mil(long v);                      /* imágenes por segundo x 1000 (0 si no se sabe) */
const char *dwv_codecs(long v);                /* "video=..., audio=..." */
long dwv_pila_total(void);             /* la pila de la tarea que llama, en bytes (diagnóstico) */
void dwv_pila_pintar(void);            /* llena con un patrón la pila libre (diagnóstico, con la TRAZA) */
long dwv_pila_minima(void);            /* lo menos libre que ha quedado desde dwv_pila_pintar, en bytes */
const char *dwv_fallo_sonido(void);   /* la excepción de la tarea del sonido (diagnóstico) o "" */
long dwv_siguiente(long v);                    /* 1 una imagen nueva, 0 fin, -1 error, 2 esperar (aún se baja) */
const unsigned char *dwv_rgb(long v);          /* la imagen: RGB24, dwv_paso() bytes por fila */
long dwv_paso(long v);
long dwv_ms(long v);                           /* su instante en ms desde el principio (-1 si no se sabe) */
long dwv_rapido(long v, long modo);            /* H.264: 0 calidad ... 4 turbo; 1 si se aceptó */
long dwv_reloj(long v);                        /* ms ya sonados (reloj maestro), -1 sin sonido */
void dwv_servicio(long v);                     /* atender la salida de sonido (a menudo) */
void dwv_pausa(long v, long pausa);
long dwv_con_sonido(long v);
long dwv_ir(long v, long ms);
long dwv_duracion(long v);
void dwv_cerrar(long v);
const char *dwv_youtube_id(const char *url);
const char *dwv_youtube_mp4(const char *texto);
#endif
