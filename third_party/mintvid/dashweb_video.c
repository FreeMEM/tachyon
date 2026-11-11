/* dashweb: interfaz de vídeo sobre el núcleo de MintVID (MIT, como dashweb). Abre un fichero, saca
   imagen a imagen en RGB24 y su instante. Sin sonido todavía. Pone sustitutos vacíos de las piezas de
   MintVID que no van en dashweb (MPEG-2 y DV, por licencia; su red: dashweb trae los vídeos con la suya). */
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "mr_codec.h"
#include "mr_demux.h"
#include "mr_source.h"
#include "mr_http.h"
#include "mr_hls.h"
#include "mr_youtube.h"
#include "mr_h264.h"
#ifndef DWV_SIN_SONIDO
#include "mr_audio_decode.h"
#include "mr_audio.h"
#else
typedef struct mr_audio_decoder mr_audio_decoder;
typedef struct mr_audio mr_audio;
#endif
#include "dashweb_video.h"
#include <proto/dos.h>

/* --- lo que no va en dashweb --- */
const mr_codec mr_codec_mpeg2 = {0};
const mr_codec mr_codec_dv = {0};
int mr_http_options_init(mr_http_options *o, const char *ua, const char *ref)
{ if (o) memset(o, 0, sizeof *o); (void)ua; (void)ref; return 1; }
mr_source *mr_http_source_open(const char *url) { (void)url; return NULL; }
/* (mr_http_source_open_ex: más abajo, el fichero que aún se está bajando) */
int mr_source_is_hls(const char *url) { (void)url; return 0; }
mr_source *mr_hls_source_open(const char *url) { (void)url; return NULL; }
mr_source *mr_hls_source_open_ex(const char *url, const mr_http_options *o) { (void)url; (void)o; return NULL; }
/* La red de MintVID tampoco: core/mr_youtube.c (sus analizadores) la nombra, pero dashweb pide las páginas
   de YouTube con la suya (lib/youtube.dash) y solo le pasa los textos. */
int mr_http_fetch_text(const char *url, const mr_http_options *o, char **out, size_t *len, size_t max)
{ (void)url; (void)o; (void)max; if (out) *out = NULL; if (len) *len = 0; return 0; }
int mr_http_post_json(const char *url, const mr_http_options *o, const char *json, char **out, size_t *len,
                      size_t max)
{ (void)url; (void)o; (void)json; (void)max; if (out) *out = NULL; if (len) *len = 0; return 0; }

/* Para lib/youtube.dash: el identificador de una dirección de YouTube ("" si no lo es) y el MP4 de 360p (H.264
   + AAC, itag 18) de una página o una respuesta del reproductor ("" si no lo trae) */
const char *dwv_youtube_id(const char *url)
{
    static char id[12];
    if (!mr_youtube_extract_video_id(url, id)) id[0] = 0;
    return id;
}

const char *dwv_youtube_mp4(const char *texto)
{
    static char url[4096];
    mr_youtube_media_kind kind = MR_YOUTUBE_MEDIA_NONE;
    if (!texto || !mr_youtube_extract_progressive(texto, 0, url, sizeof url, &kind)) url[0] = 0;
    return url;
}

/* --- un vídeo que aún se está bajando ---
   dashweb lo baja con su red (lib/http.dash), que guarda la respuesta en memoria hasta el final: mientras
   llega, se lee de ahí (dwv_bajado dice dónde está y cuánto hay: el búfer se mueve al crecer); al acabar,
   del fichero donde quedó (dwv_bajado_fichero). Lo que aún no ha llegado no se lee: la lectura falla con
   "falta" y dwv_siguiente responde 2 (esperar), con el paquete sin consumir (parche en core/mr_mov.c). */
typedef struct {
    const unsigned char *datos;
    size_t listos;
    size_t total;
    char nombre[256];   /* "" mientras se baja */
    BPTR f;
    int falta;
    /* en trozos (dwv_trozos_nuevos): la tabla de trozos de DWV_TROZO bytes; la suelta dwv_trozos_soltar, no la
       fuente (dashweb la vuelve a abrir para empezar otra vez) */
    const unsigned char **trozos;
    size_t ntrozos;
    int externo;
} dwv_bajando;

static dwv_bajando *dwv_pendiente;   /* el que toma mr_http_source_open_ex, desde dwv_abrir_bajando */

static int bajando_leer(void *ctx, size_t off, void *dst, size_t len)
{
    dwv_bajando *b = (dwv_bajando *)ctx;
    if (off > b->listos || len > b->listos - off) { b->falta = 1; return 0; }
    if (b->trozos) {
        unsigned char *d = (unsigned char *)dst;
        while (len > 0) {
            size_t i = off / DWV_TROZO, dentro = off % DWV_TROZO, toma = DWV_TROZO - dentro;
            if (toma > len) toma = len;
            if (i >= b->ntrozos || !b->trozos[i]) { b->falta = 1; return 0; }
            memcpy(d, b->trozos[i] + dentro, toma);
            d += toma; off += toma; len -= toma;
        }
        return 1;
    }
    if (!b->nombre[0]) { memcpy(dst, b->datos + off, len); return 1; }
    if (!b->f && !(b->f = Open((STRPTR)b->nombre, MODE_OLDFILE))) return 0;
    if (Seek(b->f, (LONG)off, OFFSET_BEGINNING) < 0) return 0;
    return Read(b->f, dst, (LONG)len) == (LONG)len;
}

static void bajando_cerrar(void *ctx)
{
    dwv_bajando *b = (dwv_bajando *)ctx;
    if (b->f) { Close(b->f); b->f = 0; }
    if (b->externo) return;
    free(b);
}

mr_source *mr_http_source_open_ex(const char *url, const mr_http_options *o)
{
    dwv_bajando *b = dwv_pendiente;
    (void)url; (void)o;
    if (!b) return NULL;
    dwv_pendiente = NULL;
    return mr_source_create(b, b->total, bajando_leer, bajando_cerrar, b->nombre);
}

/* --- la interfaz --- */

typedef struct {
    mr_demux *dx;
    mr_decoder dec;
    int abierto;
    int vaciando;        /* el fichero se acabó: quedan imágenes dentro del decodificador (B-frames) */
    int tras_paquete;    /* el último paquete pudo dejar más imágenes listas (mr_decoder_drain) */
    long n;              /* imágenes dadas */
    long paquetes;       /* paquetes de vídeo leídos (también los que el modo turbo no decodifica) */
    long retraso;        /* paquetes leídos antes de la primera imagen (lo que el decodificador reordena) */
    mr_audio_decoder *ad;  /* el sonido (NULL si no tiene o no se sabe decodificar) */
    mr_audio *au;          /* su salida por Paula */
    int sonando;           /* la salida ya empezó (tras llenar un poco el búfer) */
    int pausa;
    long ms;
    dwv_bajando *bajando;  /* el fichero aún se baja (de la fuente de MintVID: vive hasta mr_demux_close) */
    char codecs[200];
    long base;           /* tras dwv_ir: el número de imagen del fotograma clave al que se saltó */
    int recien;          /* tras dwv_ir: el retraso de reordenar se mide otra vez con la primera imagen */
    long reloj_base;     /* tras dwv_ir: el ms del vídeo donde se saltó... */
    long reloj_desde;    /* ...y lo que había sonado entonces (audio_elapsed_ms no vuelve a 0) */
    long duracion_ms;    /* dwv_duracion, la primera vez (0: aún no) */
} dwv;

#ifndef DWV_SIN_SONIDO
/* Lo que sale del decodificador de sonido va a la cola de Paula */
static void dwv_pcm(void *user, const int16_t *pcm, unsigned frames, unsigned channels)
{
    audio_write_s16((mr_audio *)user, (const short *)pcm, frames, (int)channels);
}

/* El sonido de un paquete; la salida empieza cuando hay 150 ms en cola */
#ifdef DWV_SOLO_DECODIFICAR
/* (diagnóstico del vídeo 2: el sonido se decodifica y se tira, sin la salida por Paula ni su tarea) */
static void dwv_pcm_nada(void *user, const int16_t *pcm, unsigned frames, unsigned channels)
{
    (void)user; (void)pcm; (void)frames; (void)channels;
}
#endif

static void dwv_sonido(dwv *v, const mr_packet *pkt)
{
#ifdef DWV_SOLO_DECODIFICAR
#ifdef DWV_SOLO_ABRIR
    /* (diagnóstico: el decodificador se abre pero no recibe nada; los paquetes de sonido se tiran) */
    (void)pkt;
    return;
#endif
    if (v->ad) mr_audio_decoder_feed(v->ad, pkt->data, pkt->len, dwv_pcm_nada, NULL);
    return;
#endif
    if (!v->ad || !v->au) return;
    mr_audio_decoder_feed(v->ad, pkt->data, pkt->len, dwv_pcm, v->au);
    audio_service(v->au);
    if (!v->sonando && !v->pausa && audio_buffered_ms(v->au) >= 150) {
        audio_set_running(v->au, 1);
        v->sonando = 1;
    }
}
#else
static void dwv_sonido(dwv *v, const mr_packet *pkt) { (void)v; (void)pkt; }
#endif

/* Un vídeo de total bytes que aún se baja: los listos primeros están en datos. 0 si aún no se puede abrir
   (p. ej. el índice del MP4, moov, no ha llegado: probar de nuevo con más) */
long dwv_abrir_bajando(const unsigned char *datos, long listos, long total)
{
    dwv_bajando *b;
    long h;
    if (total <= 0 || !datos) return 0;
    b = (dwv_bajando *)calloc(1, sizeof *b);
    if (!b) return 0;
    b->datos = datos;
    b->listos = (size_t)listos;
    b->total = (size_t)total;
    dwv_pendiente = b;
    h = dwv_abrir("http://dashweb/bajando");
    if (dwv_pendiente) { free(dwv_pendiente); dwv_pendiente = NULL; h = 0; }   /* (no llegó a la fuente) */
    if (h) ((dwv *)h)->bajando = b;   /* si falló, la fuente ya se cerró y lo liberó */
    return h;
}

/* --- en trozos (tarea 64g) --- */
long dwv_trozos_nuevos(long total)
{
    dwv_bajando *b;
    size_t n;
    if (total <= 0) return 0;
    b = (dwv_bajando *)calloc(1, sizeof *b);
    if (!b) return 0;
    n = ((size_t)total + DWV_TROZO - 1) / DWV_TROZO;
    b->trozos = (const unsigned char **)calloc(n ? n : 1, sizeof *b->trozos);
    if (!b->trozos) { free(b); return 0; }
    b->ntrozos = n;
    b->total = (size_t)total;
    b->externo = 1;
    return (long)b;
}

void dwv_trozos_poner(long t, long i, const unsigned char *trozo)
{
    dwv_bajando *b = (dwv_bajando *)t;
    if (b && i >= 0 && (size_t)i < b->ntrozos) b->trozos[i] = trozo;
}

void dwv_trozos_listos(long t, long listos)
{
    dwv_bajando *b = (dwv_bajando *)t;
    if (b && listos >= 0) b->listos = (size_t)listos > b->total ? b->total : (size_t)listos;
}

/* Abre el vídeo de esa tabla (0 si aún no se puede: probar con más); la tabla sigue siendo de dashweb */
long dwv_abrir_trozos(long t)
{
    dwv_bajando *b = (dwv_bajando *)t;
    long h;
    if (!b) return 0;
    b->falta = 0;
    dwv_pendiente = b;
    h = dwv_abrir("http://dashweb/bajando");
    if (dwv_pendiente) { dwv_pendiente = NULL; h = 0; }
    if (h) ((dwv *)h)->bajando = b;
    return h;
}

/* (con el vídeo ya cerrado) */
void dwv_trozos_soltar(long t)
{
    dwv_bajando *b = (dwv_bajando *)t;
    if (!b) return;
    if (b->f) Close(b->f);
    free((void *)b->trozos);
    free(b);
}

/* Lo que ya ha llegado (datos: dónde está ahora) */
void dwv_bajado(long h, const unsigned char *datos, long listos)
{
    dwv *v = (dwv *)h;
    if (v->bajando && !v->bajando->nombre[0]) { v->bajando->datos = datos; v->bajando->listos = (size_t)listos; }
}

/* Ya está entero en el fichero (la memoria de la carga se ha liberado) */
void dwv_bajado_fichero(long h, const char *fichero)
{
    dwv *v = (dwv *)h;
    dwv_bajando *b = v->bajando;
    if (!b || !fichero || strlen(fichero) >= sizeof b->nombre) return;
    strcpy(b->nombre, fichero);
    b->datos = NULL;
    b->listos = b->total;
}

long dwv_abrir(const char *fichero)
{
    dwv *v = (dwv *)calloc(1, sizeof *v);
    const mr_video_info *vi;
    const mr_codec *c;
    char vc[96], ac[96];
    if (!v) return 0;
    v->dx = mr_demux_open_file_ex(fichero, NULL);
    if (!v->dx) { free(v); return 0; }
    vi = mr_demux_video(v->dx);
    c = vi ? mr_codec_find(vi->fourcc) : NULL;
    if (!c || mr_decoder_open_config(&v->dec, c, vi->width, vi->height, vi->config, vi->config_len) != MR_OK) {
        mr_demux_close(v->dx);
        free(v);
        return 0;
    }
    v->abierto = 1;
    v->ms = -1;
#ifndef DWV_SIN_SONIDO
    {
        const mr_audio_info *ai = mr_demux_audio(v->dx);
        if (ai && ai->valid) {
            v->ad = mr_audio_decoder_open(ai, 0, 0);
#ifndef DWV_SOLO_DECODIFICAR
            if (v->ad) v->au = audio_open(mr_audio_decoder_rate(v->ad), (int)mr_audio_decoder_channels(v->ad), 16);
            if (!v->au && v->ad) { mr_audio_decoder_close(v->ad); v->ad = NULL; }
#endif
        }
    }
#endif
    mr_demux_describe_video_codec(v->dx, vc, sizeof vc);
    mr_demux_describe_audio_codec(v->dx, ac, sizeof ac);
    snprintf(v->codecs, sizeof v->codecs, "video=%s, audio=%s", vc, ac);
    return (long)v;
}

long dwv_ancho(long h) { return ((dwv *)h)->dec.frame.width ? ((dwv *)h)->dec.frame.width : mr_demux_video(((dwv *)h)->dx)->width; }
long dwv_alto(long h) { return ((dwv *)h)->dec.frame.height ? ((dwv *)h)->dec.frame.height : mr_demux_video(((dwv *)h)->dx)->height; }
long dwv_fps_mil(long h)
{
    const mr_video_info *vi = mr_demux_video(((dwv *)h)->dx);
    return vi->scale ? (long)((unsigned long long)vi->rate * 1000u / vi->scale) : 0;
}
const char *dwv_codecs(long h) { return ((dwv *)h)->codecs; }

/* La excepción de la tarea del sonido (con -DDWV_TRAMPA_SONIDO; si no, o sin excepción, "") */
#ifdef DWV_TRAMPA_SONIDO
extern volatile unsigned long dwv_fallo_num, dwv_fallo_pc;
extern void audio_trampa(void);
#endif
const char *dwv_fallo_sonido(void)
{
#ifdef DWV_TRAMPA_SONIDO
    static char t[96];
    if (dwv_fallo_pc) { sprintf(t, "excepcion %lu en PC %08lx (audio_trampa en %08lx)", dwv_fallo_num, dwv_fallo_pc, (unsigned long)audio_trampa); return t; }
#endif
    return "";
}

/* Sin marca de tiempo en el contenedor, el instante sale de la cuenta de paquetes de vídeo leídos (no de
   imágenes: el modo turbo se salta algunas), menos los que el decodificador guarda para reordenar */
static long dwv_ms_de(dwv *v, long indice)
{
    const mr_video_info *vi = mr_demux_video(v->dx);
    return vi->rate ? (long)((unsigned long long)indice * 1000u * vi->scale / vi->rate) : -1;
}

static long dwv_imagen(dwv *v, int del_paquete)
{
    if (v->n == 0 || v->recien) { v->retraso = v->paquetes - 1 - v->base; v->recien = 0; }
    if (del_paquete) v->ms = dwv_ms_de(v, v->paquetes - 1 - v->retraso);
    else v->ms = v->ms >= 0 ? v->ms + dwv_ms_de(v, 1) : dwv_ms_de(v, v->n);   /* las que quedaban dentro */
    v->n++;
    return 1;
}

long dwv_siguiente(long h)
{
    dwv *v = (dwv *)h;
    mr_packet pkt;
    /* otra imagen que dejó lista el último paquete */
    if (v->tras_paquete) {
        if (mr_decoder_drain(&v->dec) == MR_OK) return dwv_imagen(v, 0);
        v->tras_paquete = 0;
    }
    while (!v->vaciando) {
        mr_status s;
        if (mr_demux_next_packet(v->dx, &pkt) != MR_OK) {
            /* el paquete siguiente aún no ha llegado: esperar sin dar el fichero por acabado */
            if (v->bajando && v->bajando->falta) { v->bajando->falta = 0; return 2; }
            break;
        }
        if (!pkt.is_video) { if (pkt.len) dwv_sonido(v, &pkt); continue; }
        if (pkt.len == 0) continue;
        v->paquetes++;
        mr_h264_set_input_annexb(&v->dec, pkt.is_annexb);
        s = mr_decoder_decode(&v->dec, pkt.data, pkt.len);
        if (s == MR_EAGAIN || s == MR_SKIPPED) continue;
        if (s != MR_OK) return -1;
        v->tras_paquete = 1;
        return dwv_imagen(v, 1);
    }
    /* fin del fichero: las que el decodificador aún guarda para reordenarlas */
    v->vaciando = 1;
    if (mr_decoder_flush(&v->dec) == MR_OK) return dwv_imagen(v, 0);
    return 0;
}

const unsigned char *dwv_rgb(long h) { return ((dwv *)h)->dec.frame.data; }
long dwv_paso(long h) { return ((dwv *)h)->dec.frame.stride; }
long dwv_ms(long h) { return ((dwv *)h)->ms; }
long dwv_rapido(long h, long modo)
{
    dwv *v = (dwv *)h;
    if (v->dec.codec != &mr_codec_h264) return 0;
    return mr_h264_set_speed_mode(&v->dec, (mr_h264_speed_mode)modo) ? 1 : 0;
}
#ifdef DWV_SIN_SONIDO
long dwv_reloj(long h) { (void)h; return -1; }
void dwv_servicio(long h) { (void)h; }
void dwv_pausa(long h, long pausa) { (void)h; (void)pausa; }
#else
/* El reloj del sonido en ms (lo que ya ha sonado), o -1 si no hay sonido o aún no empezó */
long dwv_reloj(long h)
{
    dwv *v = (dwv *)h;
    if (!v->au || !v->sonando) return -1;
    audio_service(v->au);
    return v->reloj_base + (long)audio_elapsed_ms(v->au) - v->reloj_desde;
}

/* Lo que pide Paula entre imagen e imagen (llenar sus búferes): llamarlo a menudo */
void dwv_servicio(long h)
{
    dwv *v = (dwv *)h;
    if (v->au) audio_service(v->au);
}

void dwv_pausa(long h, long pausa)
{
    dwv *v = (dwv *)h;
    v->pausa = pausa != 0;
    if (v->au && v->sonando) audio_set_running(v->au, !v->pausa);
}

#endif
long dwv_con_sonido(long h) { return ((dwv *)h)->au != NULL; }

/* Lo que dura el vídeo en ms (de su índice: MP4/MOV), o -1 si no se sabe (tarea 64f: la línea de tiempo) */
long dwv_duracion(long h)
{
    dwv *v = (dwv *)h;
    const mr_video_info *vi;
    uint32_t n;
    if (!v || !v->dx) return -1;
    /* (el instante de la última imagen: el índice del MP4 mezcla imágenes y trozos de sonido, y su número entre las
       imágenes por segundo daba de más; un vídeo de YouTube de 25:32 salía como 1:02:11; tarea 64g) */
    if (v->duracion_ms <= 0) v->duracion_ms = (long)mr_demux_duration_ms(v->dx);
    if (v->duracion_ms > 0) return v->duracion_ms;
    vi = mr_demux_video(v->dx);
    n = mr_demux_video_frames(v->dx);
    if (!vi || !vi->rate || !n) return -1;
    return (long)((unsigned long long)n * 1000u * vi->scale / vi->rate);
}

/* Saltar a ms del vídeo (tarea 64d: avanzar y retroceder en YouTube): al fotograma clave de antes más cercano
   (mr_demux_seek, MP4 con su índice), con el decodificador de vídeo y el de sonido vacíos y la cola de Paula
   tirada; el reloj sigue desde ahí. El ms al que se llegó, o -1 si no se puede (un formato sin índice). Si lo de
   ese punto aún no se ha bajado, dwv_siguiente espera a que llegue (2). */
long dwv_ir(long h, long ms)
{
    dwv *v = (dwv *)h;
    uint64_t llegado = 0;
    const mr_video_info *vi;
    if (!v || !v->dx || !mr_demux_can_seek(v->dx)) return -1;
    if (mr_demux_seek(v->dx, (uint64_t)(ms < 0 ? 0 : ms) * 1000u, &llegado) != MR_OK) return -1;
    if (v->abierto) mr_decoder_reset(&v->dec);
#ifndef DWV_SIN_SONIDO
    if (v->ad) mr_audio_decoder_reset(v->ad);
    if (v->au) {
        audio_set_running(v->au, 0);
        audio_flush(v->au);
        v->sonando = 0;
        v->reloj_desde = (long)audio_elapsed_ms(v->au);
    }
#endif
    v->reloj_base = (long)(llegado / 1000u);
    vi = mr_demux_video(v->dx);
    /* (dwv_imagen saca el ms del número de paquete menos el retraso de reordenar, que vuelve a medir) */
    v->base = vi && vi->scale ? (long)((llegado * vi->rate) / (1000000ull * vi->scale)) : 0;
    v->paquetes = v->base;
    v->recien = 1;
    v->tras_paquete = 0;
    v->vaciando = 0;
    if (v->bajando) v->bajando->falta = 0;
    v->ms = v->reloj_base;
    return v->reloj_base;
}

void dwv_cerrar(long h)
{
    dwv *v = (dwv *)h;
    if (!v) return;
#ifndef DWV_SIN_SONIDO
    if (v->au) { audio_set_running(v->au, 0); audio_close(v->au); }
    if (v->ad) mr_audio_decoder_close(v->ad);
#endif
    if (v->abierto) mr_decoder_close(&v->dec);
    if (v->dx) mr_demux_close(v->dx);
    free(v);
}
