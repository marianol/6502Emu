"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIA65C22Implementation = exports.VIAInterruptSource = void 0;
var VIAInterruptSource;
(function (VIAInterruptSource) {
    VIAInterruptSource[VIAInterruptSource["CA2"] = 1] = "CA2";
    VIAInterruptSource[VIAInterruptSource["CA1"] = 2] = "CA1";
    VIAInterruptSource[VIAInterruptSource["SHIFT_REGISTER"] = 4] = "SHIFT_REGISTER";
    VIAInterruptSource[VIAInterruptSource["CB2"] = 8] = "CB2";
    VIAInterruptSource[VIAInterruptSource["CB1"] = 16] = "CB1";
    VIAInterruptSource[VIAInterruptSource["TIMER2"] = 32] = "TIMER2";
    VIAInterruptSource[VIAInterruptSource["TIMER1"] = 64] = "TIMER1";
})(VIAInterruptSource || (exports.VIAInterruptSource = VIAInterruptSource = {}));
class VIA65C22Implementation {
    constructor() {
        // Internal state
        this.portAData = 0x00;
        this.portBData = 0x00;
        this.portADirection = 0x00; // 0 = input, 1 = output
        this.portBDirection = 0x00;
        this.timer1Counter = 0;
        this.timer1Latch = 0;
        this.timer2Counter = 0;
        this.shiftRegister = 0x00;
        this.auxiliaryControlRegister = 0x00;
        this.peripheralControlRegister = 0x00;
        this.interruptFlagRegister = 0x00;
        this.interruptEnableRegister = 0x00;
        this.timer1Running = false;
        this.timer2Running = false;
    }
    read(offset) {
        switch (offset) {
            case VIA65C22Implementation.REG_ORB_IRB:
                return this.readPortB();
            case VIA65C22Implementation.REG_ORA_IRA:
            case VIA65C22Implementation.REG_ORA_IRA_NH:
                return this.readPortA();
            case VIA65C22Implementation.REG_DDRB:
                return this.portBDirection;
            case VIA65C22Implementation.REG_DDRA:
                return this.portADirection;
            case VIA65C22Implementation.REG_T1C_L:
                this.clearInterruptFlag(VIAInterruptSource.TIMER1);
                return this.timer1Counter & 0xFF;
            case VIA65C22Implementation.REG_T1C_H:
                return (this.timer1Counter >> 8) & 0xFF;
            case VIA65C22Implementation.REG_T1L_L:
                return this.timer1Latch & 0xFF;
            case VIA65C22Implementation.REG_T1L_H:
                return (this.timer1Latch >> 8) & 0xFF;
            case VIA65C22Implementation.REG_T2C_L:
                this.clearInterruptFlag(VIAInterruptSource.TIMER2);
                return this.timer2Counter & 0xFF;
            case VIA65C22Implementation.REG_T2C_H:
                return (this.timer2Counter >> 8) & 0xFF;
            case VIA65C22Implementation.REG_SR:
                return this.shiftRegister;
            case VIA65C22Implementation.REG_ACR:
                return this.auxiliaryControlRegister;
            case VIA65C22Implementation.REG_PCR:
                return this.peripheralControlRegister;
            case VIA65C22Implementation.REG_IFR:
                return this.interruptFlagRegister | (this.getInterruptStatus() ? 0x80 : 0x00);
            case VIA65C22Implementation.REG_IER:
                return this.interruptEnableRegister | 0x80;
            default:
                return 0xFF;
        }
    }
    write(offset, value) {
        switch (offset) {
            case VIA65C22Implementation.REG_ORB_IRB:
                this.writePortB(value);
                break;
            case VIA65C22Implementation.REG_ORA_IRA:
            case VIA65C22Implementation.REG_ORA_IRA_NH:
                this.writePortA(value);
                break;
            case VIA65C22Implementation.REG_DDRB:
                this.portBDirection = value;
                break;
            case VIA65C22Implementation.REG_DDRA:
                this.portADirection = value;
                break;
            case VIA65C22Implementation.REG_T1C_L:
                this.timer1Latch = (this.timer1Latch & 0xFF00) | value;
                break;
            case VIA65C22Implementation.REG_T1C_H:
                this.timer1Latch = (this.timer1Latch & 0x00FF) | (value << 8);
                this.timer1Counter = this.timer1Latch;
                this.timer1Running = true;
                this.clearInterruptFlag(VIAInterruptSource.TIMER1);
                break;
            case VIA65C22Implementation.REG_T1L_L:
                this.timer1Latch = (this.timer1Latch & 0xFF00) | value;
                break;
            case VIA65C22Implementation.REG_T1L_H:
                this.timer1Latch = (this.timer1Latch & 0x00FF) | (value << 8);
                this.clearInterruptFlag(VIAInterruptSource.TIMER1);
                break;
            case VIA65C22Implementation.REG_T2C_L:
                this.timer2Counter = (this.timer2Counter & 0xFF00) | value;
                break;
            case VIA65C22Implementation.REG_T2C_H:
                this.timer2Counter = (this.timer2Counter & 0x00FF) | (value << 8);
                this.timer2Running = true;
                this.clearInterruptFlag(VIAInterruptSource.TIMER2);
                break;
            case VIA65C22Implementation.REG_SR:
                this.shiftRegister = value;
                break;
            case VIA65C22Implementation.REG_ACR:
                this.auxiliaryControlRegister = value;
                break;
            case VIA65C22Implementation.REG_PCR:
                this.peripheralControlRegister = value;
                break;
            case VIA65C22Implementation.REG_IFR:
                // Clear interrupt flags (write 1 to clear)
                this.interruptFlagRegister &= ~(value & 0x7F);
                break;
            case VIA65C22Implementation.REG_IER:
                if (value & 0x80) {
                    // Set interrupt enable bits
                    this.interruptEnableRegister |= (value & 0x7F);
                }
                else {
                    // Clear interrupt enable bits
                    this.interruptEnableRegister &= ~(value & 0x7F);
                }
                break;
        }
    }
    reset() {
        this.portAData = 0x00;
        this.portBData = 0x00;
        this.portADirection = 0x00;
        this.portBDirection = 0x00;
        this.timer1Counter = 0;
        this.timer1Latch = 0;
        this.timer2Counter = 0;
        this.shiftRegister = 0x00;
        this.auxiliaryControlRegister = 0x00;
        this.peripheralControlRegister = 0x00;
        this.interruptFlagRegister = 0x00;
        this.interruptEnableRegister = 0x00;
        this.timer1Running = false;
        this.timer2Running = false;
    }
    tick(cycles) {
        // Update Timer 1
        if (this.timer1Running) {
            this.timer1Counter -= cycles;
            if (this.timer1Counter <= 0) {
                this.setInterruptFlag(VIAInterruptSource.TIMER1);
                // Check if continuous mode is enabled
                if (this.auxiliaryControlRegister & 0x40) {
                    this.timer1Counter = this.timer1Latch;
                }
                else {
                    this.timer1Running = false;
                }
            }
        }
        // Update Timer 2
        if (this.timer2Running) {
            this.timer2Counter -= cycles;
            if (this.timer2Counter <= 0) {
                this.setInterruptFlag(VIAInterruptSource.TIMER2);
                this.timer2Running = false;
            }
        }
    }
    getInterruptStatus() {
        return (this.interruptFlagRegister & this.interruptEnableRegister & 0x7F) !== 0;
    }
    // Port A operations
    readPortA() {
        // Return input bits for pins configured as inputs, output bits for pins configured as outputs
        return this.portAData;
    }
    writePortA(value) {
        // Only update bits that are configured as outputs
        this.portAData = (this.portAData & ~this.portADirection) | (value & this.portADirection);
    }
    // Port B operations
    readPortB() {
        return this.portBData;
    }
    writePortB(value) {
        this.portBData = (this.portBData & ~this.portBDirection) | (value & this.portBDirection);
    }
    // Data Direction Register operations
    setPortADirection(mask) {
        this.portADirection = mask;
    }
    setPortBDirection(mask) {
        this.portBDirection = mask;
    }
    // Timer operations
    setTimer1(value) {
        this.timer1Latch = value;
        this.timer1Counter = value;
        this.timer1Running = true;
        this.clearInterruptFlag(VIAInterruptSource.TIMER1);
    }
    setTimer2(value) {
        this.timer2Counter = value;
        this.timer2Running = true;
        this.clearInterruptFlag(VIAInterruptSource.TIMER2);
    }
    getTimer1() {
        return this.timer1Counter;
    }
    getTimer2() {
        return this.timer2Counter;
    }
    // Interrupt control
    enableInterrupt(source) {
        this.interruptEnableRegister |= source;
    }
    disableInterrupt(source) {
        this.interruptEnableRegister &= ~source;
    }
    getInterruptFlags() {
        return this.interruptFlagRegister;
    }
    setInterruptFlag(source) {
        this.interruptFlagRegister |= source;
    }
    clearInterruptFlag(source) {
        this.interruptFlagRegister &= ~source;
    }
    // Shift register operations
    setShiftRegister(value) {
        this.shiftRegister = value;
    }
    getShiftRegister() {
        return this.shiftRegister;
    }
}
exports.VIA65C22Implementation = VIA65C22Implementation;
// Register addresses (offsets from base)
VIA65C22Implementation.REG_ORB_IRB = 0x00; // Output/Input Register B
VIA65C22Implementation.REG_ORA_IRA = 0x01; // Output/Input Register A
VIA65C22Implementation.REG_DDRB = 0x02; // Data Direction Register B
VIA65C22Implementation.REG_DDRA = 0x03; // Data Direction Register A
VIA65C22Implementation.REG_T1C_L = 0x04; // Timer 1 Counter Low
VIA65C22Implementation.REG_T1C_H = 0x05; // Timer 1 Counter High
VIA65C22Implementation.REG_T1L_L = 0x06; // Timer 1 Latch Low
VIA65C22Implementation.REG_T1L_H = 0x07; // Timer 1 Latch High
VIA65C22Implementation.REG_T2C_L = 0x08; // Timer 2 Counter Low
VIA65C22Implementation.REG_T2C_H = 0x09; // Timer 2 Counter High
VIA65C22Implementation.REG_SR = 0x0A; // Shift Register
VIA65C22Implementation.REG_ACR = 0x0B; // Auxiliary Control Register
VIA65C22Implementation.REG_PCR = 0x0C; // Peripheral Control Register
VIA65C22Implementation.REG_IFR = 0x0D; // Interrupt Flag Register
VIA65C22Implementation.REG_IER = 0x0E; // Interrupt Enable Register
VIA65C22Implementation.REG_ORA_IRA_NH = 0x0F; // Output/Input Register A (no handshake)
//# sourceMappingURL=via.js.map