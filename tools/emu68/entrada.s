	.text
	.globl _entrada
_entrada:
	lea _pila_fin,sp
	jmp ___start
	.bss
	.even
	.space 2097152
	.globl _pila_fin
_pila_fin:
	.space 16
