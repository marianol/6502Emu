/**
 * Motorola 68B50 ACIA (Asynchronous Communications Interface Adapter) Implementation
 *
 * The 68B50 ACIA provides serial communication capabilities with configurable
 * baud rates, data formats, and interrupt generation.
 *
 * Register Map:
 * Offset 0: Control/Status Register
 * Offset 1: Transmit/Receive Data Register
 */
import { Peripheral } from './base';
import { SerialPort } from './serial-port';
/**
 * Control Register bit definitions
 */
export declare enum ACIAControlBits {
    DIVIDE_1 = 0,
    DIVIDE_16 = 1,
    DIVIDE_64 = 2,
    MASTER_RESET = 3,
    WORD_7E2 = 0,// 7 bits, even parity, 2 stop bits
    WORD_7O2 = 4,// 7 bits, odd parity, 2 stop bits
    WORD_7E1 = 8,// 7 bits, even parity, 1 stop bit
    WORD_7O1 = 12,// 7 bits, odd parity, 1 stop bit
    WORD_8N2 = 16,// 8 bits, no parity, 2 stop bits
    WORD_8N1 = 20,// 8 bits, no parity, 1 stop bit
    WORD_8E1 = 24,// 8 bits, even parity, 1 stop bit
    WORD_8O1 = 28,// 8 bits, odd parity, 1 stop bit
    TX_RTS_LOW_INT_DISABLE = 0,
    TX_RTS_LOW_INT_ENABLE = 32,
    TX_RTS_HIGH_INT_DISABLE = 64,
    TX_RTS_LOW_BREAK_INT_DISABLE = 96,
    RX_INT_DISABLE = 0,
    RX_INT_ENABLE = 128
}
/**
 * Status Register bit definitions
 */
export declare enum ACIAStatusBits {
    RDRF = 1,// Receive Data Register Full
    TDRE = 2,// Transmit Data Register Empty
    DCD = 4,// Data Carrier Detect
    CTS = 8,// Clear To Send
    FE = 16,// Framing Error
    OVRN = 32,// Receiver Overrun
    PE = 64,// Parity Error
    IRQ = 128
}
/**
 * Motorola 68B50 ACIA peripheral implementation
 */
export declare class ACIA68B50 implements Peripheral {
    private controlRegister;
    private statusRegister;
    private receiveDataRegister;
    private transmitDataRegister;
    private receiveBuffer;
    private transmitBuffer;
    private serialPort;
    private baudRate;
    private cyclesPerBit;
    private transmitCyclesRemaining;
    private receiveCyclesRemaining;
    private interruptPending;
    constructor();
    /**
     * Read from ACIA register
     * @param offset Register offset (0 = Status, 1 = Data)
     * @returns Register value
     */
    read(offset: number): number;
    /**
     * Write to ACIA register
     * @param offset Register offset (0 = Control, 1 = Data)
     * @param value Value to write
     */
    write(offset: number, value: number): void;
    /**
     * Reset the ACIA to initial state
     */
    reset(): void;
    /**
     * Update ACIA state each CPU cycle
     * @param cycles Number of CPU cycles elapsed
     */
    tick(cycles: number): void;
    /**
     * Check if interrupt is pending
     * @returns true if interrupt is pending
     */
    getInterruptStatus(): boolean;
    /**
     * Set control register and handle configuration changes
     * @param value Control register value
     */
    setControlRegister(value: number): void;
    /**
     * Get current status register value
     * @returns Status register value
     */
    getStatusRegister(): number;
    /**
     * Transmit data through the ACIA
     * @param data Byte to transmit
     */
    transmitData(data: number): void;
    /**
     * Receive data from the ACIA
     * @returns Received data byte
     */
    receiveData(): number;
    /**
     * Set the baud rate for serial communication
     * @param rate Baud rate in bits per second
     */
    setBaudRate(rate: number): void;
    /**
     * Connect a serial port for external communication
     * @param port Serial port interface
     */
    connectSerial(port: SerialPort): void;
    /**
     * Disconnect the serial port
     */
    disconnectSerial(): void;
    /**
     * Get current baud rate
     * @returns Current baud rate
     */
    getBaudRate(): number;
    /**
     * Update baud rate timing based on control register
     */
    private updateBaudRateTiming;
    /**
     * Complete transmission of current byte
     */
    private completeTransmission;
    /**
     * Start reception of a byte
     * @param data Byte being received
     */
    private startReception;
    /**
     * Complete reception of current byte
     */
    private completeReception;
    /**
     * Update interrupt status based on current state and control settings
     */
    private updateInterruptStatus;
}
//# sourceMappingURL=acia.d.ts.map