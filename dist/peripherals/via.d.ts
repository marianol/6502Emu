import { Peripheral } from './base';
export declare enum VIAInterruptSource {
    CA2 = 1,
    CA1 = 2,
    SHIFT_REGISTER = 4,
    CB2 = 8,
    CB1 = 16,
    TIMER2 = 32,
    TIMER1 = 64
}
export interface VIA65C22 extends Peripheral {
    readPortA(): number;
    writePortA(value: number): void;
    readPortB(): number;
    writePortB(value: number): void;
    setPortADirection(mask: number): void;
    setPortBDirection(mask: number): void;
    setTimer1(value: number): void;
    setTimer2(value: number): void;
    getTimer1(): number;
    getTimer2(): number;
    enableInterrupt(source: VIAInterruptSource): void;
    disableInterrupt(source: VIAInterruptSource): void;
    getInterruptFlags(): number;
    setShiftRegister(value: number): void;
    getShiftRegister(): number;
}
export declare class VIA65C22Implementation implements VIA65C22 {
    private static readonly REG_ORB_IRB;
    private static readonly REG_ORA_IRA;
    private static readonly REG_DDRB;
    private static readonly REG_DDRA;
    private static readonly REG_T1C_L;
    private static readonly REG_T1C_H;
    private static readonly REG_T1L_L;
    private static readonly REG_T1L_H;
    private static readonly REG_T2C_L;
    private static readonly REG_T2C_H;
    private static readonly REG_SR;
    private static readonly REG_ACR;
    private static readonly REG_PCR;
    private static readonly REG_IFR;
    private static readonly REG_IER;
    private static readonly REG_ORA_IRA_NH;
    private portAData;
    private portBData;
    private portADirection;
    private portBDirection;
    private timer1Counter;
    private timer1Latch;
    private timer2Counter;
    private shiftRegister;
    private auxiliaryControlRegister;
    private peripheralControlRegister;
    private interruptFlagRegister;
    private interruptEnableRegister;
    private timer1Running;
    private timer2Running;
    read(offset: number): number;
    write(offset: number, value: number): void;
    reset(): void;
    tick(cycles: number): void;
    getInterruptStatus(): boolean;
    readPortA(): number;
    writePortA(value: number): void;
    readPortB(): number;
    writePortB(value: number): void;
    setPortADirection(mask: number): void;
    setPortBDirection(mask: number): void;
    setTimer1(value: number): void;
    setTimer2(value: number): void;
    getTimer1(): number;
    getTimer2(): number;
    enableInterrupt(source: VIAInterruptSource): void;
    disableInterrupt(source: VIAInterruptSource): void;
    getInterruptFlags(): number;
    private setInterruptFlag;
    private clearInterruptFlag;
    setShiftRegister(value: number): void;
    getShiftRegister(): number;
}
//# sourceMappingURL=via.d.ts.map