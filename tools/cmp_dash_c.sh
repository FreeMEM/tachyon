#!/bin/sh
# tools/cmp_dash_c.sh REV_A REV_B|WORK : generated C of every test and example, compiler at REV_A vs REV_B (WORK = working tree)
D=$HOME/Projects/FreeMEMLang
W=$(mktemp -d "${TMPDIR:-/tmp}/cmpc.XXXX")
for side in A B; do
  rev=$1; [ $side = B ] && rev=$2
  mkdir -p $W/$side/src $W/$side/out
  if [ "$rev" = WORK ]; then cp -r $D/compiler $D/runtime $W/$side/src/; else git -C $D archive $rev compiler runtime | tar -x -C $W/$side/src; fi
done
cd $D
for f in tests/*.dash tests/errors/*.dash examples/*.dash; do
  o=$(echo $f | tr / _).c
  for side in A B; do (cd $W/$side/src && python3 -m compiler.main $D/$f -o $W/$side/out/$o >/dev/null 2>&1); done
done
echo "A: $(ls $W/A/out | wc -l) ficheros, B: $(ls $W/B/out | wc -l)"
LC_ALL=C diff -rq $W/A/out $W/B/out | awk '{print $2}' | xargs -r -n1 basename
echo "dir: $W"
