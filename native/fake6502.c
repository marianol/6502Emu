/*
 * fake6502 - A portable, open-source 6502 CPU emulator
 * Wrapper implementation using the improved MyLittle6502 core
 */

#include "fake6502.h"
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

// Memory access callbacks
static read_func_t memory_read = NULL;
static write_func_t memory_write = NULL;

// Interrupt state
static int irq_pending = 0;
static int nmi_pending = 0;

// Default memory functions (return 0xFF for reads, ignore writes)
static uint8_t default_read(uint16_t address) {
    (void)address;
    return 0xFF;
}

static void default_write(uint16_t address, uint8_t value) {
    (void)address;
    (void)value;
}

// Bridge functions for the improved fake6502 core
uint8_t read6502(uint16_t address) {
    return memory_read ? memory_read(address) : default_read(address);
}

void write6502(uint16_t address, uint8_t value) {
    if (memory_write) {
        memory_write(address, value);
    } else {
        default_write(address, value);
    }
}

// Include the improved fake6502 implementation
// We need to define the types it expects
typedef unsigned char uint8;
typedef unsigned short ushort;
typedef unsigned int uint32;

// Define NES_CPU to disable BCD mode (we can enable it later if needed)
#define NES_CPU

// Include the complete implementation (this will define static variables)
#include "fake6502_improved.h"

// CPU control functions
void cpu_reset(void) {
    // Initialize CPU state without reading from memory
    // We'll set PC manually after this
    set_pc_6502(0x0000);
    set_sp_6502(0xFD);
    set_a_6502(0);
    set_x_6502(0);
    set_y_6502(0);
    set_status_6502(0x20 | 0x04); // FLAG_CONSTANT | FLAG_INTERRUPT
    set_cycles_6502(0);
    
    irq_pending = 0;
    nmi_pending = 0;
}

uint8_t cpu_step(void) {
    // Handle pending interrupts
    if (nmi_pending) {
        nmi6502();
        nmi_pending = 0;
        return 7; // Standard interrupt cycles
    } else if (irq_pending) {
        irq6502();
        irq_pending = 0;
        return 7; // Standard interrupt cycles
    }
    
    // Execute one instruction and return cycles
    // step6502() returns the cycles for this instruction directly
    uint32_t cycles = step6502();
    return (uint8_t)cycles;
}

// Accessor functions for the static variables in fake6502_improved.h
// We need to add these functions to the improved header
uint16_t get_pc_6502(void);
uint8_t get_sp_6502(void);
uint8_t get_a_6502(void);
uint8_t get_x_6502(void);
uint8_t get_y_6502(void);
uint8_t get_status_6502(void);
uint32_t get_cycles_6502(void);

void set_pc_6502(uint16_t value);
void set_sp_6502(uint8_t value);
void set_a_6502(uint8_t value);
void set_x_6502(uint8_t value);
void set_y_6502(uint8_t value);
void set_status_6502(uint8_t value);
void set_cycles_6502(uint32_t value);

void cpu_get_state(cpu_state_t* state) {
    if (state) {
        state->pc = get_pc_6502();
        state->sp = get_sp_6502();
        state->a = get_a_6502();
        state->x = get_x_6502();
        state->y = get_y_6502();
        state->status = get_status_6502();
        state->cycles = get_cycles_6502();
    }
}

void cpu_set_state(const cpu_state_t* state) {
    if (state) {
        set_pc_6502(state->pc);
        set_sp_6502(state->sp);
        set_a_6502(state->a);
        set_x_6502(state->x);
        set_y_6502(state->y);
        set_status_6502(state->status);
        set_cycles_6502(state->cycles);
    }
}

void cpu_set_memory_callbacks(read_func_t read_func, write_func_t write_func) {
    memory_read = read_func;
    memory_write = write_func;
}

void cpu_trigger_irq(void) {
    irq_pending = 1;
}

void cpu_trigger_nmi(void) {
    nmi_pending = 1;
}

void cpu_clear_irq(void) {
    irq_pending = 0;
}

int cpu_is_irq_pending(void) {
    return irq_pending;
}

int cpu_is_nmi_pending(void) {
    return nmi_pending;
}

#ifdef __cplusplus
}
#endif