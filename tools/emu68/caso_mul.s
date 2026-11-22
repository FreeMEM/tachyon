| El caso mínimo del fallo de Emu68 1.1.0-beta.1 (tarea 75): muls.l de 32 bits y lsr.l por registro en el mismo
| bloque del JIT. Escribe por la UART "caso_mul: 6" si va bien ("caso_mul: e4437d66" con el fallo).
	.text
	.globl	_entrada
_entrada:
	move.l	#0x2e6d13d9,d0
	muls.l	#0x9e370001,d0
	moveq	#28,d1
	lsr.l	d1,d0
	lea	texto,a0
1:	move.b	(a0)+,d2
	beq.s	2f
	bsr.s	poner
	bra.s	1b
2:	moveq	#7,d3
3:	move.l	d0,d2
	rol.l	#4,d0
	move.l	d0,d2
	and.l	#15,d2
	move.b	(cifras,pc,d2.l),d2
	bsr.s	poner
	dbra	d3,3b
	moveq	#13,d2
	bsr.s	poner
	moveq	#10,d2
	bsr.s	poner
4:	bra.s	4b
| d2: el carácter, a la UART PL011 (0xf2201000; sus registros son little-endian)
poner:	move.l	0xf2201018,d4
	and.l	#0x20000000,d4
	bne.s	poner
	and.l	#0xff,d2
	ror.l	#8,d2
	move.l	d2,0xf2201000
	rts
texto:	.asciz	"caso_mul: "
cifras:	.ascii	"0123456789abcdef"
