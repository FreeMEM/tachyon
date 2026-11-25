| Tabla de excepciones del banco: cada vector a _trampa, que escribe el marco (formato/vector, PC, SR) y para
	.text
	.globl _vectores_poner
_vectores_poner:
	lea	_tabla,a0
	move.l	#255,d0
1:	move.l	#_trampa,(a0)+
	dbra	d0,1b
	lea	_tabla,a0
	movec	a0,vbr
	rts
	.globl	_trampa
_trampa:
	move.l	sp,-(sp)
	jsr	_trampa_c
	| (no vuelve)
	.bss
	.even
_tabla:	.space	1024
