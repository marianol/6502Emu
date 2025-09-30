/*
 * fake6502 - A portable, open-source 6502 CPU emulator
 * Simplified implementation for homebrew computer emulation
 * Based on public domain fake6502 code
 */

#include "fake6502.h"
#include <string.h>

// CPU state
static cpu_state_t cpu;
static int irq_pending = 0;
static int nmi_pending = 0;

// Memory access callbacks
static read_func_t memory_read = NULL;
static write_func_t memory_write = NULL;

// Default memory functions (return 0xFF for reads, ignore writes)
static uint8_t default_read(uint16_t address) {
    (void)address;
    return 0xFF;
}

static void default_write(uint16_t address, uint8_t value) {
    (void)address;
    (void)value;
}

// Helper functions
static uint8_t read6502(uint16_t address) {
    return memory_read ? memory_read(address) : default_read(address);
}

static void write6502(uint16_t address, uint8_t value) {
    if (memory_write) {
        memory_write(address, value);
    } else {
        default_write(address, value);
    }
}

static uint16_t read6502_word(uint16_t address) {
    return read6502(address) | (read6502(address + 1) << 8);
}

static void push6502(uint8_t value) {
    write6502(0x0100 + cpu.sp, value);
    cpu.sp--;
}

static uint8_t pull6502(void) {
    cpu.sp++;
    return read6502(0x0100 + cpu.sp);
}

// CPU control functions
void cpu_reset(void) {
    memset(&cpu, 0, sizeof(cpu));
    cpu.sp = 0xFF;
    cpu.status = FLAG_CONSTANT | FLAG_INTERRUPT;
    cpu.pc = read6502_word(0xFFFC);
    cpu.cycles = 0;
    irq_pending = 0;
    nmi_pending = 0;
}

uint8_t cpu_step(void) {
    uint8_t opcode;
    uint8_t cycles = 2; // Default cycle count
    
    // Handle NMI (highest priority)
    if (nmi_pending) {
        push6502((cpu.pc >> 8) & 0xFF);
        push6502(cpu.pc & 0xFF);
        push6502(cpu.status);
        cpu.status |= FLAG_INTERRUPT;
        cpu.pc = read6502_word(0xFFFA);
        nmi_pending = 0;
        cpu.cycles += 7;
        return 7;
    }
    
    // Handle IRQ (if enabled)
    if (irq_pending && !(cpu.status & FLAG_INTERRUPT)) {
        push6502((cpu.pc >> 8) & 0xFF);
        push6502(cpu.pc & 0xFF);
        push6502(cpu.status);
        cpu.status |= FLAG_INTERRUPT;
        cpu.pc = read6502_word(0xFFFE);
        irq_pending = 0;
        cpu.cycles += 7;
        return 7;
    }
    
    // Fetch instruction
    opcode = read6502(cpu.pc);
    cpu.pc++;
    
    // Execute instruction (simplified implementation)
    switch (opcode) {
        case 0x00: // BRK
            cpu.pc++;
            push6502((cpu.pc >> 8) & 0xFF);
            push6502(cpu.pc & 0xFF);
            push6502(cpu.status | FLAG_BREAK);
            cpu.status |= FLAG_INTERRUPT;
            cpu.pc = read6502_word(0xFFFE);
            cycles = 7;
            break;
            
        case 0x4C: // JMP absolute
            cpu.pc = read6502_word(cpu.pc);
            cycles = 3;
            break;
            
        case 0x6C: // JMP indirect
            {
                uint16_t addr = read6502_word(cpu.pc);
                // Handle page boundary bug in original 6502
                if ((addr & 0xFF) == 0xFF) {
                    cpu.pc = read6502(addr) | (read6502(addr & 0xFF00) << 8);
                } else {
                    cpu.pc = read6502_word(addr);
                }
                cycles = 5;
            }
            break;
            
        case 0xA9: // LDA immediate
            cpu.a = read6502(cpu.pc++);
            cpu.status &= ~(FLAG_ZERO | FLAG_SIGN);
            if (cpu.a == 0) cpu.status |= FLAG_ZERO;
            if (cpu.a & 0x80) cpu.status |= FLAG_SIGN;
            cycles = 2;
            break;
            
        case 0xEA: // NOP
            cycles = 2;
            break;
            
        case 0x40: // RTI
            cpu.status = pull6502();
            cpu.pc = pull6502();
            cpu.pc |= (pull6502() << 8);
            cycles = 6;
            break;
            
        default:
            // Unknown opcode - just advance PC
            cycles = 2;
            break;
    }
    
    cpu.cycles += cycles;
    return cycles;
}

void cpu_get_state(cpu_state_t* state) {
    if (state) {
        *state = cpu;
    }
}

void cpu_set_state(const cpu_state_t* state) {
    if (state) {
        cpu = *state;
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