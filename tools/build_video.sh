#!/bin/sh
# El vídeo de dashweb: el subconjunto de MintVID de third_party/mintvid (H.264 con libavc y los demás
# códecs y contenedores propios de MintVID) y su interfaz dashweb_video.c, en build/video-lib/libvideo.a con
# dashweb_video.h, para el "@link" de lib/video.dash.
#
#   tools/build_video.sh
#
# Las opciones de MintVID (player/Makefile.amiga) para 68020-68060 con FPU, como dashweb. Las redirecciones
# de enlace de MintVID (--wrap: las rutas en ensamblador de 68k de libavc) se resuelven aquí, en un objeto
# enlazado con ld -r, para que el programa que lo usa no tenga que pasarlas.
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
GCC=${GCC:-/opt/amiga/bin/m68k-amigaos-gcc}
LD=${LD:-/opt/amiga/bin/m68k-amigaos-ld}
M=$R/third_party/mintvid
B=$R/build/video-lib
rm -rf "$B"
mkdir -p "$B/o"
CF="-noixemul -O2 -fno-branch-count-reg -std=c99 -m68020-60 -m68881 -fomit-frame-pointer -fno-strict-aliasing -fwrapv
    -DAMIGA_M68K -DMR_HAVE_H264 -DMR_M68K_ASM=1 -DMR_PL_MPEG_SKIP_AUDIO_TIME=1
    -I$M/libavc_port -I$M/libavc/common -I$M/libavc/decoder -include $M/libavc_port/compat.h -I$M/core -I$M/audio -I$M/amiga
    -w"
# los ficheros del núcleo que MintVID enlaza en su mr_decode (player/Makefile.amiga), sin MPEG-2, DV ni su red
NUCLEO="mr_codec.c mr_source.c mr_demux.c mr_latm.c mr_mkv.c mr_avi.c mr_mov.c mr_ts.c mr_ps.c mr_raw_mjpeg.c
    mr_raw_mpeg4.c mr_cinepak.c mr_dither.c mr_dither_m68k.S mr_ham.c mr_ham_m68k.S mr_scale.c mr_c2p.c
    mr_c2p_m68k.S mr_mjpeg.c picojpeg.c mr_mpeg1.c mr_mpeg1_blockset_m68k.S mr_mpeg1_idct_m68k.S mr_mpeg4.c
    mr_msmpeg4v2.c mr_wmv.c mr_wmv2.c mr_h263.c mr_msvideo1.c mr_rle.c mr_rawvideo.c mr_yuv.c mr_yuv_m68k.S
    mr_yuv_dither.c mr_yuv_dither_planar_m68k.S mr_yuv_dither_planar_direct_m68k.S mr_yuv_planar_queue.c
    mr_yuv_ham.c mr_h264.c mr_youtube.c plm_audio_synth_window_m68k.S plm_audio_idct36_m68k.S plm_audio_scale_clamp_m68k.S
    plm_audio_synth_window_m68k_060.S plm_audio_idct36_m68k_060.S"
for f in $NUCLEO; do
    $GCC $CF -c "$M/core/$f" -o "$B/o/n_$(echo "$f" | tr . _).o"
done
for f in "$M"/libavc/decoder/*.c "$M"/libavc_port/*.c "$M"/libavc_port/*.S; do
    $GCC $CF -c "$f" -o "$B/o/$(basename "$f" | tr . _).o"
done
# el sonido: el adaptador de MintVID (AAC, MP3, MP2, PCM; AC-3 no: sin_a52/ son sustitutos), MintAMP (Helix,
# RPSL: AAC-LC sin SBR y MP3, con su ensamblador de 68k) y la salida por Paula de MintVID
A=$M/mintamp
AF="-DAMIGA_M68K -DARDUINO -DESP8266 -DAAC_ENABLE_DECIM -I$A/pub -I$A/real -I$A/decoders/aac
    -I$A/decoders/aac-arduino-shim -I$A/decoders -include $M/audio/mr_aac_m68k_config.h
    -DAMIGA_M68K_ASM -DAMIGA_M68K_ASM_FDCT32 -DAMIGA_M68K_ASM_FDCT32_UNROLL -DAMIGA_FAST_POLYPHASE
    -DAMIGA_FAST_REDUCED_TAPS -DAMIGA_FAST_FDCT32_QUARTER -DAMIGA_M68K_IMDCT_THIN_OUTPUT -DAMIGA_FAST_SUBBAND_CAP
    -DAMIGA_M68K_ASM_POLYPHASE -DAMIGA_M68K_ASM_IMDCT -DAMIGA_M68K_ASM_ANTIALIAS -DAMIGA_M68K_ASM_MIDSIDE
    -DAMIGA_M68K_ASM_INTENSITY -DAMIGA_M68K_ASM_DEQUANT -DAMIGA_M68K_ASM_HUFFMAN -DAMIGA_M68K_ASM_PLANARS8
    -I$M/sin_a52"
if [ -z "$SIN_SONIDO" ]; then
for f in "$A"/decoders/aac/*.c "$A"/real/*.c "$A"/real/*.S "$A"/mp3dec.c "$A"/mp3tabs.c "$A"/amiga_m68k_planars8.S; do
    # aac/ y real/ tienen ficheros con el mismo nombre (bitstream.c, buffers.c...): el prefijo es su carpeta
    $GCC $CF $AF -c "$f" -o "$B/o/a_$(basename "$(dirname "$f")")_$(basename "$f" | tr . _).o"
done
for f in "$M"/audio/mr_audio_decode.c "$M"/audio/mr_pcm.c; do
    $GCC $CF $AF -c "$f" -o "$B/o/$(basename "$f" | tr . _).o"
done
$GCC $CF -I$M/amiga -c "$M/amiga/audio_paula.c" -o "$B/o/audio_paula_c.o"
else
    CF="$CF -DDWV_SIN_SONIDO"   # SIN_SONIDO=1: sin MintAMP ni Paula (para comparar)
fi
$GCC $CF -c "$M/dashweb_video.c" -o "$B/o/dashweb_video_c.o"
for f in "$M"/libavc/common/*.c; do
    case $(basename "$f") in ithread.c|ih264_resi_trans_quant.c|ih264_trans_data.c) continue ;; esac
    $GCC $CF -c "$f" -o "$B/o/c_$(basename "$f" .c).o"
done
$LD -r -o "$B/video.o" "$B"/o/*.o \
    --wrap=ih264d_decode_bin --wrap=ih264d_mvpred_nonmbaff --wrap=ih264d_mvpred_nonmbaffB \
    --wrap=ih264d_parse_residual4x4_cabac --wrap=ih264d_read_coeff4x4_cabac --wrap=ih264d_update_qp
rm -f "$B/libvideo.a"
${AR:-/opt/amiga/bin/m68k-amigaos-ar} rcs "$B/libvideo.a" "$B/video.o"
cp "$M/dashweb_video.h" "$B/"
ls -l "$B/libvideo.a"
