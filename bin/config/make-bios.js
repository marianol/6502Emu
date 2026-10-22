#!/usr/bin/env node
/**
 * Builds a minimal 68B50 ACIA echo BIOS for the simple6502 config.
 *
 * Address map:
 *   ROM:       $8000-$FFFF  (32KB)
 *   ACIA ctrl: $7F70  (write=control, read=status)
 *   ACIA data: $7F71  (write=tx, read=rx)
 *
 * ACIA status bits:
 *   bit 0 = RDRF — receive data register full
 *   bit 1 = TDRE — transmit data register empty (ready to send)
 *
 * ACIA control $15 = 8N1, clock/16, no interrupts
 * ACIA control $03 = master reset
 *
 * Layout (all in ROM starting at $8000):
 *
 *   $8000  RESET entry
 *          - master reset ACIA
 *          - configure ACIA 8N1/16
 *          - print banner via print_str
 *          - fall into echo loop
 *
 *   $8030  print_str
 *          - ZP $00/$01 = pointer to null-terminated string
 *          - transmits each char, returns when null hit
 *
 *   $8050  echo loop
 *          - wait for RDRF, read byte, wait for TDRE, echo it, repeat
 *
 *   $8070  banner string "6502 BIOS ready\r\n> \0"
 *
 *   $FFFA  vectors: all point to $8000
 */

const ROM_BASE   = 0x8000;
const ROM_SIZE   = 0x8000; // 32KB
const ACIA_CTRL  = 0x7F70;
const ACIA_DATA  = 0x7F71;

const rom = new Uint8Array(ROM_SIZE).fill(0xFF);

function lo(a) { return a & 0xFF; }
function hi(a) { return (a >> 8) & 0xFF; }
function at(addr, ...bytes) {
  let off = addr - ROM_BASE;
  for (const b of bytes) rom[off++] = b & 0xFF;
}

// ── address assignments ────────────────────────────────────
const RESET      = 0x8000;
const PRINT_STR  = 0x8030;   // subroutine: print ZP-pointed null-term string
const ECHO_LOOP  = 0x8060;
const BANNER     = 0x8080;
const BANNER_STR = "6502 BIOS ready\r\n> ";

// ── RESET entry ($8000) ────────────────────────────────────
// Master-reset ACIA
at(0x8000,  0xA9, 0x03,              // LDA #$03  (master reset)
            0x8D, lo(ACIA_CTRL), hi(ACIA_CTRL)); // STA $7F70
// Configure 8N1, /16 clock, no interrupts
at(0x8005,  0xA9, 0x15,              // LDA #$15
            0x8D, lo(ACIA_CTRL), hi(ACIA_CTRL)); // STA $7F70
// Load ZP pointer with banner address
at(0x800A,  0xA9, lo(BANNER),        // LDA #<BANNER
            0x85, 0x00,              // STA $00
            0xA9, hi(BANNER),        // LDA #>BANNER
            0x85, 0x01);             // STA $01
// JSR PRINT_STR
at(0x8012,  0x20, lo(PRINT_STR), hi(PRINT_STR)); // JSR $8030
// Fall into echo loop (JMP ECHO_LOOP)
at(0x8015,  0x4C, lo(ECHO_LOOP), hi(ECHO_LOOP)); // JMP $8060

// ── PRINT_STR ($8030) ──────────────────────────────────────
// Uses ($00),Y indirect to walk a null-terminated string.
// Clobbers: A, Y. Preserves: X.
//
// Layout:
//   $8030: A0 00       LDY #0
//   $8032: B1 00       LDA ($00),Y        ← ps_loop
//   $8034: F0 0F       BEQ ps_done        → $8045 (next_pc=$8036, +$0F==$8045)
//   $8036: AD 70 7F    LDA $7F70          ← ps_txwait
//   $8039: 29 02       AND #$02
//   $803B: F0 F9       BEQ ps_txwait      → $8036 (next_pc=$803D, -7==$8036)
//   $803D: B1 00       LDA ($00),Y        (reload char)
//   $803F: 8D 71 7F    STA $7F71
//   $8042: C8          INY
//   $8043: D0 ED       BNE ps_loop        → $8032 (next_pc=$8045, -19==$8032)
//   $8045: 60          RTS                ← ps_done
at(0x8030,  0xA0, 0x00);             // LDY #0
at(0x8032,  0xB1, 0x00);             // LDA ($00),Y   ← ps_loop
at(0x8034,  0xF0, 0x0F);             // BEQ $8045     (ps_done) next_pc=$8036, +$0F
at(0x8036,  0xAD, lo(ACIA_CTRL), hi(ACIA_CTRL)); // LDA $7F70  ← ps_txwait
at(0x8039,  0x29, 0x02);             // AND #$02
at(0x803B,  0xF0, 0xF9);             // BEQ $8036     next_pc=$803D, -7
at(0x803D,  0xB1, 0x00);             // LDA ($00),Y   (reload char)
at(0x803F,  0x8D, lo(ACIA_DATA), hi(ACIA_DATA)); // STA $7F71
at(0x8042,  0xC8);                   // INY
at(0x8043,  0xD0, 0xED);             // BNE $8032     next_pc=$8045, -19 (0xED=-19)
at(0x8045,  0x60);                   // RTS            ← ps_done

// ── ECHO LOOP ($8060) ─────────────────────────────────────
// rx_wait: LDA ACIA_CTRL / AND #$01 / BEQ rx_wait
at(0x8060,  0xAD, lo(ACIA_CTRL), hi(ACIA_CTRL)); // LDA $7F70
at(0x8063,  0x29, 0x01);             // AND #$01  (RDRF)
at(0x8065,  0xF0, 0xF9);             // BEQ $8060  (-7)
// Read received byte
at(0x8067,  0xAD, lo(ACIA_DATA), hi(ACIA_DATA)); // LDA $7F71
// Save it, wait for TDRE
at(0x806A,  0x48);                   // PHA
at(0x806B,  0xAD, lo(ACIA_CTRL), hi(ACIA_CTRL)); // LDA $7F70
at(0x806E,  0x29, 0x02);             // AND #$02  (TDRE)
at(0x8070,  0xF0, 0xF9);             // BEQ $806B  (-7)
// Echo
at(0x8072,  0x68);                   // PLA
at(0x8073,  0x8D, lo(ACIA_DATA), hi(ACIA_DATA)); // STA $7F71
// Loop
at(0x8076,  0x4C, lo(ECHO_LOOP), hi(ECHO_LOOP)); // JMP $8060

// ── BANNER string ($8080) ─────────────────────────────────
let boff = BANNER - ROM_BASE;
for (const c of BANNER_STR) rom[boff++] = c.charCodeAt(0);
rom[boff] = 0x00; // null terminator

// ── VECTORS ($FFFA-$FFFF) ─────────────────────────────────
at(0xFFFA, lo(RESET), hi(RESET));   // NMI
at(0xFFFC, lo(RESET), hi(RESET));   // RESET
at(0xFFFE, lo(RESET), hi(RESET));   // IRQ

// ── Write output ──────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const out  = path.join(__dirname, 'BIOS.bin');
fs.writeFileSync(out, Buffer.from(rom));

// Verify key branch offsets
function rel(from, to) { return (to - (from + 2)) & 0xFF; }
console.log('BIOS.bin written (32768 bytes)');
console.log(`  RESET:     $${RESET.toString(16).toUpperCase()}`);
console.log(`  PRINT_STR: $${PRINT_STR.toString(16).toUpperCase()}`);
console.log(`  ECHO_LOOP: $${ECHO_LOOP.toString(16).toUpperCase()}`);
console.log(`  BANNER:    $${BANNER.toString(16).toUpperCase()} "${BANNER_STR.trim()}"`);
console.log(`  Vectors:   NMI/RST/IRQ → $${RESET.toString(16).toUpperCase()}`);

// Disassemble key sections for a sanity check
function hex(b) { return b.toString(16).toUpperCase().padStart(2,'0'); }
function disLine(addr) {
  const b = rom[addr - ROM_BASE];
  return `  $${addr.toString(16).toUpperCase()}: ${hex(b)}`;
}
console.log('\nVector bytes (should be 00,80 for RESET=$8000):');
console.log(`  $FFFC: ${hex(rom[0x7FFC])} ${hex(rom[0x7FFD])}`);
console.log(`  $FFFE: ${hex(rom[0x7FFE])} ${hex(rom[0x7FFF])}`);
