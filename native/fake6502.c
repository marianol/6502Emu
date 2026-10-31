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
//
// irq_line    - the level-sensitive /IRQ input, driven by the devices (VIA, ACIA...).
//               It stays asserted until the device releases it (e.g. firmware clears
//               the VIA interrupt flag), exactly like the wire-OR'd /IRQ line on a
//               real 6502. It is NOT consumed when the CPU takes the interrupt.
// irq_pending - a one-shot manual request (debugger / cpu.triggerIRQ()). It is held
//               until the I flag allows it, then consumed.
// nmi_pending - NMI is edge-triggered: consumed when taken.
static int irq_line = 0;
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

/* ── 65C02 instruction handlers ──────────────────────────────────────────
 * CMOS-only opcodes patched into the live dispatch tables by cpu_set_type(1).
 */

static void inca_65c02(void) { a=(a+1)&0xFF; zerocalc(a); signcalc(a); }
static void deca_65c02(void) { a=(a-1)&0xFF; zerocalc(a); signcalc(a); }
static void phy_65c02(void)  { push_6502_8(y); }
static void ply_65c02(void)  { y=pull_6502_8(); zerocalc(y); signcalc(y); }
static void phx_65c02(void)  { push_6502_8(x); }
static void plx_65c02(void)  { x=pull_6502_8(); zerocalc(x); signcalc(x); }

static void bra_65c02(void) {
    oldpc = pc;
    pc += reladdr;
    if ((oldpc & 0xFF00) != (pc & 0xFF00)) clockticks6502 += 2;
    else clockticks6502++;
}

/* BIT immediate: only sets Z, not N/V */
static void bit_imm_65c02(void) {
    value = getvalue();
    result = (ushort)a & value;
    zerocalc(result);
}

/* Zero-page indirect addressing: ($zp) without Y index */
static void zp_ind(void) {
    uint16_t zpaddr = (uint16_t)read6502(pc++);
    ea = (uint16_t)read6502(zpaddr) | ((uint16_t)read6502((zpaddr + 1) & 0xFF) << 8);
}

static void tsb_op(void) { value=getvalue(); zerocalc((ushort)a&value); putvalue(value|(ushort)a); }
static void trb_op(void) { value=getvalue(); zerocalc((ushort)a&value); putvalue(value&~(ushort)a); }
static void stz_op(void) { putvalue(0); }

static void jmp_absxi(void) {
    uint16_t base = (uint16_t)read6502(pc) | ((uint16_t)read6502(pc+1) << 8);
    pc += 2;
    uint16_t addr = base + x;
    pc = (uint16_t)read6502(addr) | ((uint16_t)read6502(addr+1) << 8);
}

void cpu_set_type(int is_65c02) {
    if (is_65c02) {
        /* Accumulator inc/dec */
        optable[0x1A]=inca_65c02; addrtable[0x1A]=imp; ticktable[0x1A]=2;
        optable[0x3A]=deca_65c02; addrtable[0x3A]=imp; ticktable[0x3A]=2;
        /* Stack push/pull X and Y */
        optable[0x5A]=phy_65c02;  addrtable[0x5A]=imp; ticktable[0x5A]=3;
        optable[0x7A]=ply_65c02;  addrtable[0x7A]=imp; ticktable[0x7A]=4;
        optable[0xDA]=phx_65c02;  addrtable[0xDA]=imp; ticktable[0xDA]=3;
        optable[0xFA]=plx_65c02;  addrtable[0xFA]=imp; ticktable[0xFA]=4;
        /* BRA and BIT immediate */
        optable[0x80]=bra_65c02;  addrtable[0x80]=rel; ticktable[0x80]=2;
        optable[0x89]=bit_imm_65c02; addrtable[0x89]=imm; ticktable[0x89]=2;
        /* Zero-page indirect (no index) */
        optable[0x12]=ora; addrtable[0x12]=zp_ind; ticktable[0x12]=5;
        optable[0x32]=and; addrtable[0x32]=zp_ind; ticktable[0x32]=5;
        optable[0x52]=eor; addrtable[0x52]=zp_ind; ticktable[0x52]=5;
        optable[0x72]=adc; addrtable[0x72]=zp_ind; ticktable[0x72]=5;
        optable[0x92]=sta; addrtable[0x92]=zp_ind; ticktable[0x92]=5;
        optable[0xB2]=lda; addrtable[0xB2]=zp_ind; ticktable[0xB2]=5;
        optable[0xD2]=cmp; addrtable[0xD2]=zp_ind; ticktable[0xD2]=5;
        optable[0xF2]=sbc; addrtable[0xF2]=zp_ind; ticktable[0xF2]=5;
        /* TSB / TRB */
        optable[0x04]=tsb_op; addrtable[0x04]=zp;   ticktable[0x04]=5;
        optable[0x0C]=tsb_op; addrtable[0x0C]=abso; ticktable[0x0C]=6;
        optable[0x14]=trb_op; addrtable[0x14]=zp;   ticktable[0x14]=5;
        optable[0x1C]=trb_op; addrtable[0x1C]=abso; ticktable[0x1C]=6;
        /* STZ */
        optable[0x64]=stz_op; addrtable[0x64]=zp;   ticktable[0x64]=3;
        optable[0x74]=stz_op; addrtable[0x74]=zpx;  ticktable[0x74]=4;
        optable[0x9C]=stz_op; addrtable[0x9C]=abso; ticktable[0x9C]=4;
        optable[0x9E]=stz_op; addrtable[0x9E]=absx; ticktable[0x9E]=5;
        /* JMP (abs,X) */
        optable[0x7C]=jmp_absxi; addrtable[0x7C]=imp; ticktable[0x7C]=6;
    } else {
        /* Restore NMOS NOPs for the opcodes above */
        uint8_t c02[] = {
            0x1A,0x3A,0x5A,0x7A,0xDA,0xFA,0x80,0x89,
            0x12,0x32,0x52,0x72,0x92,0xB2,0xD2,0xF2,
            0x04,0x0C,0x14,0x1C,0x64,0x74,0x9C,0x9E,0x7C
        };
        for (unsigned i=0; i<sizeof(c02); i++) {
            optable[c02[i]]=nop; addrtable[c02[i]]=imp; ticktable[c02[i]]=2;
        }
    }
}
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
    
    irq_line = 0;
    irq_pending = 0;
    nmi_pending = 0;
}

uint8_t cpu_step(void) {
    // Handle pending interrupts
    if (nmi_pending) {
        nmi6502();
        nmi_pending = 0;
        return 7; // Standard interrupt cycles
    } else if ((irq_line || irq_pending) && !(status & FLAG_INTERRUPT)) {
        // IRQ is only taken when the I flag is clear. While masked the request
        // is simply left alone (NOT discarded), so an interrupt that became
        // active during boot with I set is delivered as soon as firmware does
        // CLI -- the behaviour of a real level-sensitive 6502 IRQ input.
        irq6502();
        irq_pending = 0;   // manual one-shot consumed; irq_line stays until released
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
    // Clears the manual one-shot request only; the device-driven line is
    // released by the device itself via cpu_set_irq_line(0).
    irq_pending = 0;
}

void cpu_set_irq_line(int asserted) {
    irq_line = asserted ? 1 : 0;
}

int cpu_is_irq_pending(void) {
    return irq_line || irq_pending;
}

int cpu_is_nmi_pending(void) {
    return nmi_pending;
}

#ifdef __cplusplus
}
#endif