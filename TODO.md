# TODO

Open work, grouped by area. Each item says how we know it:

- **verified**: reproduced by actually running something
- **code reading**: seen in the source, not tested

Items marked "not investigated" are known failures with an unknown cause.

## VIA 65C22

- [ ] **CA1, CA2, CB1, CB2 interrupts.** Only Timer 1 and Timer 2 ever set an IFR bit (verified). The four control lines exist only as enum constants: no edge detection, no PCR edge select, no handshake. Needs a design decision on how the lines are driven (config, dashboard buttons, or a CLI command).
- [ ] **Shift register.** Plain storage today: no shifting (ACR modes), no IFR bit 2 (verified).
- [ ] **Drive input pins from outside.** `writePortA/B` only change output bits, and no API for setting input levels was found (code reading). The `Button` inputs in the configs and the dashboard's pin view can never change. Pair with clickable inputs in the dashboard.
- [ ] **Timer fidelity** (code reading). Free-run reload uses N cycles and discards overshoot (hardware period is N+2). The counter goes negative after timeout instead of wrapping. ACR PB7 output and T2 pulse counting are not modelled.
- [ ] **`via.enableTimers` is ignored.** It is declared and defaulted in `config/system.ts` but never read (verified). Wire it up or remove it.
- [ ] **Fix a wrong test.** `via.test.ts` "should access Timer 1 via registers" expects writes to the T1 latch (`$06`/`$07`) to load the counter. On a real 6522 only a write to T1C-H (`$05`) loads and starts it. The implementation is right; the test is wrong.

## CPU

- [ ] **Decimal mode is ignored** (verified). `#define NES_CPU` in `native/fake6502.c` compiles BCD out, so `SED; CLC; LDA #$09; ADC #$01` gives `$0A` instead of `$10`. Remove it and test. Also check, for 65C02: D cleared on IRQ/NMI/BRK/reset, and the extra decimal-mode cycle.
- [ ] **Missing 65C02 extensions** (code reading): `WAI`, `STP`, `RMB`/`SMB`, `BBR`/`BBS`, `BIT zp,X` and `BIT abs,X`. Those slots currently execute as NOPs, possibly with the wrong instruction length. Only matters if the target part is a W65C02S or Rockwell.
- [ ] **Fallback CPU has no interrupt handling** (code reading). Only relevant when the native addon fails to load. Implement it or drop the fallback.

## Disassembler

- [ ] **58 of the 176 documented opcodes checked cannot be decoded** (verified). All are indexed or indirect modes, for example `$91 STA (zp),Y`, `$B1 LDA (zp),Y`, `$31`, `$35`, `$1D`, `$BD`, `$B9`. They print as `??? (xx)`.
- [ ] **One opcode table.** Instruction lengths are duplicated in `cli.ts` and `memory-inspector.ts`, and the mnemonics are a separate hand-written switch. Replace with a single table (mnemonic, mode, length). The failing `memory-inspector` "disassembly format" test may be related (not confirmed).

## ACIA 68B50

- [ ] **Word format not enforced** (code reading). Parity and stop-bit selection are parsed but ignored, FE and PE are never set, and CTS/RTS flow control is not modelled.
- [ ] **Decide on RX overrun.** Since the paste fix, the host PTY buffer absorbs pasted text, so firmware never sees OVRN; a real 68B50 would drop characters if the CPU is too slow. Probably the right trade-off for development; document it either way.
- [ ] **Real host serial port.** `serialPort: "/dev/..."` is reserved but not implemented. Only `"pty"` (socat) and console output work.
- [ ] **Four failing ACIA unit tests** (not investigated): receive buffer overflow, invalid register offsets, clear interrupt after reading receive data, generate receive interrupt when enabled.

## Tests

- [ ] **15 failures on `main`, plus the regression suite.** Unit and integration give 213 passed and 15 failed, identical before and after the IRQ and paste fixes. Known causes:
  - Several tests load their program into a ROM region at `$0200` and then expect it to write a result flag to `$0200`. The write is ignored, so the value read back is the program's first byte (`0x58`, `0xA9`). Seen in regression "Interrupt Handling" and "CPU Basic Instructions", and in the integration "ACIA and VIA working together". Fix the tests (use RAM), not the emulator.
  - Regression "Performance Baseline" needs 100k IPS and measures about 70k. The threshold is machine-dependent.
  - `peripheral-system` "should reset all peripherals" (expected 0, got 255), the `memory-inspector` disassembly test and the four ACIA tests above: not investigated.
- [ ] **Turn throwaway checks into real tests.** These were verified only with scratch scripts: level-sensitive IRQ (masked then `CLI`, multi-source, re-entry when the ISR doesn't clear, reset releases the line), fast-paste RX, 65C02 opcodes (`DEC A` etc.), ACIA register mirroring and TX FIFO, and `--help`/`--version` in the portable build.

## Docs accuracy

The goal is not to overstate anything.

- [ ] **README performance claims are unmeasured.** It says "1-5 million instructions per second", "10+ million" in max-speed mode, and clocks "from 1KHz to 10MHz". Observed so far: about 70k IPS in the regression test, and about 197k IPS average at roughly 0.49 MHz actual against a 1 MHz target in an early CLI session. Replace with measured numbers or remove.
- [ ] **`debugging.symbolFile` is documented but not implemented.** The docs say the debugger can show symbol names, but `emulator.ts` has the comment "Symbol file loading would need to be implemented" (verified). Implement it (cc65 `.sym`/`.lbl`, shown in disasm, regs and the dashboard) or mark it as planned.
- [ ] **`debugging.enableTracing` does nothing.** The config value is never read, and nothing connects it to the inspector's `enableTracing()` or to a CLI command (verified). `development-config.json` sets it to `true`. Wire it up or remove it.
- [ ] **Stale Windows claim.** `examples/full-reference-config.yaml` says `serialPort: "pty"` "Works on macOS, Linux, and Windows". That dates from the node-pty days; it uses socat now, which has no native Windows build.
- [ ] **Document the interrupt model** (level-sensitive IRQ line, `peek()` inspection path) in the development guide.

## Release and repo housekeeping

- [ ] **Portable build packs uncommitted files** (verified). `scripts/build-portable.js` copies every `*.json` and `*.bin` in `bin/config/`, including untracked work in progress (`BIOS-013.bin` was already inside the v1.6.1 zip). Whitelist the files, or copy only git-tracked ones, and build release zips from a clean checkout of the tag.
- [ ] **GitHub release for `v1.7.0`**, with `6502-emulator-v1.7.0-macos-arm64.zip` attached (web UI; there is no `gh` CLI). Build the zip from a clean checkout of the tag, not from a working tree with local files in `bin/config/`.
- [ ] **Platform support.** Only macOS arm64 has been tested. Linux is untested. On Windows there is no serial terminal (socat), and the portable build uses `zip` and `chmod`.
- [ ] **Delete merged branches**, local and remote (all verified merged into `main`): `feature/standalone-executable`, `feature/web-dashboard`, `fix/config-path-resolution`, `fix/serial-rx-paste-buffer`, `fix/via-timer-interrupts`.
- [ ] **Work-in-progress files in `bin/config/` are deliberately untracked:** `Simple6502-BASIC.bin`, `board_test.bin`, `BIOS-013.bin`, `BIOS-013-manual-merge.bin` and `simple6502-basic.json`. Commit them when they are ready (`simple6502.bin` and the default config are already in the repo).
- [ ] **Latent bug: default reset vector.** With no ROM configured, `Emulator.initialize()` builds a 6-byte vector table where bytes 4 and 5 land at `$FFFE`/`$FFFF` (the IRQ vector) although the comment says reset (code reading). Harmless while `ramStart` is 0.

## Ideas

- Dashboard: show the IRQ line and which devices are asserting it, decode IFR/IER bits by name, add an ACIA TX/RX activity log.
- CLI commands to trigger or clear IRQ/NMI, and to break on interrupt.
- Performance: the native core calls back into JavaScript for every memory access, which is the likely bottleneck (hypothesis, so profile before changing anything).
