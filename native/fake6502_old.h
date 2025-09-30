/*
 * fake6502 - A portable, open-source 6502 CPU emulator
 * This is a simplified version based on the public domain fake6502 implementation
 */

#ifndef FAKE6502_H
#define FAKE6502_H

#include <stdint.h>

// CPU state structure
typedef struct {
    uint16_t pc;    // Program counter
    uint8_t sp;     // Stack pointer
    uint8_t a;      // Accumulator
    uint8_t x;      // X register
    uint8_t y;      // Y register
    uint8_t status; // Status flags
    uint64_t cycles; // Total cycles executed
} cpu_state_t;

// Memory access function pointers
typedef uint8_t (*read_func_t)(uint16_t address);
typedef void (*write_func_t)(uint16_t address, uint8_t value);

// CPU control functions
void cpu_reset(void);
uint8_t cpu_step(void);
void cpu_get_state(cpu_state_t* state);
void cpu_set_state(const cpu_state_t* state);

// Memory callback setup
void cpu_set_memory_callbacks(read_func_t read_func, write_func_t write_func);

// Interrupt control
void cpu_trigger_irq(void);
void cpu_trigger_nmi(void);
void cpu_clear_irq(void);
int cpu_is_irq_pending(void);
int cpu_is_nmi_pending(void);

// Status flag bits
#define FLAG_CARRY     0x01
#define FLAG_ZERO      0x02
#define FLAG_INTERRUPT 0x04
#define FLAG_DECIMAL   0x08
#define FLAG_BREAK     0x10
#define FLAG_CONSTANT  0x20
#define FLAG_OVERFLOW  0x40
#define FLAG_SIGN      0x80

#endif // FAKE6502_H