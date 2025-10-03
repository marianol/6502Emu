; ===================================================================
; 6502 EMULATOR TEST SUITE
;
; Description:
;   This program tests the core functionality of a 6502 emulator.
;   It verifies data movement, arithmetic, logical operations,
;   branching, and flag manipulation.
;
; How to Use:
;   1. Assemble this code into a binary file.
;   2. Load the binary into your emulator's memory at address $C000.
;   3. Set the Program Counter (PC) to $C000.
;   4. Run the emulation.
;
; Success Condition:
;   The emulator's PC will be stuck in the infinite loop at
;   the 'SUCCESS' label (address $C095).
;
; Failure Condition:
;   The emulator's PC will be stuck in the infinite loop at
;   the 'FAILURE' label (address $C098). The test that failed is
;   the one immediately preceding the branch to FAILURE.
; ===================================================================

; --- Program Start Address ---
                ORG $C000

; --- Constants for Memory Locations ---
ZP_VAL1         EQU $F0   ; Zero-Page location 1
ZP_VAL2         EQU $F1   ; Zero-Page location 2

; ===================================================================
; INITIALIZATION
; ===================================================================
START:
                CLD       ; Clear Decimal Mode (essential for binary arithmetic)
                LDX #$FF  ; Initialize Stack Pointer
                TXS       ; Transfer X to SP

; ===================================================================
; TEST 1: LOAD/STORE and REGISTER TRANSFERS (LDA, LDX, LDY, STA, STX)
; ===================================================================
TEST_LDA_STA:
                LDA #$55        ; Load Accumulator with immediate value
                STA ZP_VAL1     ; Store it in Zero Page
                LDA #$AA
                STA ZP_VAL2
                LDA ZP_VAL1     ; Load back from Zero Page
                CMP #$55        ; Compare to original value
                BNE FAILURE     ; Branch to FAILURE if not equal

                LDX #$C3        ; Load X register
                STX ZP_VAL1     ; Store it
                LDA ZP_VAL1
                CMP #$C3
                BNE FAILURE

; ===================================================================
; TEST 2: ADDITION (ADC) and FLAGS (N, Z, V, C)
; ===================================================================
TEST_ADC:
                SEC             ; Set Carry flag for test
                LDA #$01
                ADC #$01
                CMP #$03        ; 1 + 1 + C(1) = 3
                BNE FAILURE
                BCC FAILURE     ; Should have cleared Carry
                BVC FAILURE     ; Should have cleared Overflow

                LDA #$7F        ; Test Overflow flag
                CLC             ; Clear Carry
                ADC #$01        ; 127 + 1 = 128 ($80) -> sets Overflow and Negative
                BVS CHK_ADC_1   ; If overflow is set, this is correct
                JMP FAILURE
CHK_ADC_1:
                BMI CHK_ADC_2   ; If negative is set, this is correct
                JMP FAILURE
CHK_ADC_2:
                CMP #$80
                BNE FAILURE

; ===================================================================
; TEST 3: SUBTRACTION (SBC) and FLAGS
; ===================================================================
TEST_SBC:
                SEC             ; For SBC, SEC means "no borrow"
                LDA #$05
                SBC #$02
                CMP #$03        ; 5 - 2 = 3
                BNE FAILURE
                BCS CHK_SBC_1   ; Carry should be set (result is positive)
                JMP FAILURE
CHK_SBC_1:
                CLC             ; For SBC, CLC means "borrow 1"
                LDA #$05
                SBC #$02
                CMP #$02        ; 5 - 2 - 1 = 2
                BNE FAILURE

; ===================================================================
; TEST 4: BRANCHING (BEQ, BNE, BMI, BPL)
; ===================================================================
TEST_BRANCH:
                LDX #$05
                DEX             ; X is now 4
                DEX             ; X is now 3
                CPX #$03
                BEQ CHK_BNE_1   ; Should branch
                JMP FAILURE
CHK_BNE_1:
                BNE FAILURE     ; Should NOT branch

                LDA #$80        ; Negative number
                CMP #$00        ; Set flags based on $80
                BMI CHK_BPL_1   ; Should branch
                JMP FAILURE
CHK_BPL_1:
                BPL FAILURE     ; Should NOT branch

; ===================================================================
; TEST 5: SHIFTING (ASL) AND ROTATING (ROL)
; ===================================================================
TEST_SHIFT:
                LDA #%10000001  ; $81
                ASL A           ; A becomes %00000010 ($02), Carry becomes 1
                CMP #$02
                BNE FAILURE
                BCS CHK_ROL_1   ; Carry should be set, so branch
                JMP FAILURE
CHK_ROL_1:
                ROL A           ; A becomes %00000101 ($05). Rotates old Carry (1) in.
                CMP #$05
                BNE FAILURE
                BCC FAILURE     ; Carry should be clear

; ===================================================================
; TEST 6: STACK OPERATIONS (PHA, PLA, PHP, PLP)
; ===================================================================
TEST_STACK:
                LDA #$EE        ; Push a value
                PHA
                LDA #$00        ; Clobber the accumulator
                PLA             ; Pull the value back
                CMP #$EE
                BNE FAILURE

                PHP             ; Push processor status
                LDA #$00        ; Clobber flags by setting Z flag
                PLP             ; Pull processor status back
                BEQ FAILURE     ; Z flag should now be clear, so don't branch

; ===================================================================
; END OF TESTS
; ===================================================================
                JMP SUCCESS     ; All tests passed


; --- Infinite Loops for Success or Failure ---
SUCCESS:
                JMP SUCCESS     ; Emulator hangs here if all tests pass.

FAILURE:
                JMP FAILURE     ; Emulator hangs here if any test fails.
