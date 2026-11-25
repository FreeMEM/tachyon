# Incluido por tools/build_*.sh tras poner CF: para 68020 o más, gcc -B con el as de Dash (compiler/emu68/as), que pone
# un move.l dN,dN tras cada muls.l/mulu.l de 32 bits. El JIT de Emu68 1.1.0-beta.1 dejaba el producto de 64 bits en
# el registro y su lsr.l Dn,Dm lo desplazaba entero: (a * b) >> n salía mal y QuickJS se colgaba al crear el contexto
# (tarea 75: lo contaron David Martínez y BordanBordan, issue #16).
case " $CF " in
  *" -m68020"*)
    E68=${DASH:-$HOME/Projects/FreeMEMLang}/compiler/emu68
    [ -x "$E68/as" ] || { echo "Falta $E68/as (Dash con el rodeo de Emu68): DASH=<carpeta de Dash>" >&2; exit 2; }
    CF="$CF -B$E68/" ;;
esac
