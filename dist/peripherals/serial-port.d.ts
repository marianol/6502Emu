/**
 * Serial port implementations for ACIA connectivity
 */
/**
 * Serial port interface for host system communication
 */
export interface SerialPort {
    /**
     * Write data to the serial port
     * @param data Byte to transmit
     */
    write(data: number): void;
    /**
     * Read data from the serial port
     * @returns Received byte or null if no data available
     */
    read(): number | null;
    /**
     * Check if data is available to read
     * @returns true if data is available
     */
    hasData(): boolean;
    /**
     * Check if the port is ready to transmit
     * @returns true if ready to transmit
     */
    isReady(): boolean;
    /**
     * Set the baud rate
     * @param rate Baud rate in bits per second
     */
    setBaudRate(rate: number): void;
    /**
     * Close the serial port
     */
    close(): void;
}
/**
 * Console-based serial port implementation for debugging and testing
 */
export declare class ConsoleSerialPort implements SerialPort {
    private receiveBuffer;
    private baudRate;
    private isOpen;
    constructor();
    /**
     * Write data to console output
     * @param data Byte to transmit
     */
    write(data: number): void;
    /**
     * Read data from the receive buffer
     * @returns Received byte or null if no data available
     */
    read(): number | null;
    /**
     * Check if data is available to read
     * @returns true if data is available
     */
    hasData(): boolean;
    /**
     * Check if the port is ready to transmit
     * @returns true if ready to transmit
     */
    isReady(): boolean;
    /**
     * Set the baud rate
     * @param rate Baud rate in bits per second
     */
    setBaudRate(rate: number): void;
    /**
     * Get current baud rate
     * @returns Current baud rate
     */
    getBaudRate(): number;
    /**
     * Add data to the receive buffer (for testing)
     * @param data Byte to add to receive buffer
     */
    addReceiveData(data: number): void;
    /**
     * Add string to the receive buffer (for testing)
     * @param text String to add to receive buffer
     */
    addReceiveString(text: string): void;
    /**
     * Close the serial port
     */
    close(): void;
    /**
     * Check if the port is open
     * @returns true if the port is open
     */
    isPortOpen(): boolean;
}
/**
 * Memory-based serial port implementation for testing
 */
export declare class MemorySerialPort implements SerialPort {
    private transmitLog;
    private receiveBuffer;
    private baudRate;
    private ready;
    /**
     * Write data to the transmit log
     * @param data Byte to transmit
     */
    write(data: number): void;
    /**
     * Read data from the receive buffer
     * @returns Received byte or null if no data available
     */
    read(): number | null;
    /**
     * Check if data is available to read
     * @returns true if data is available
     */
    hasData(): boolean;
    /**
     * Check if the port is ready to transmit
     * @returns true if ready to transmit
     */
    isReady(): boolean;
    /**
     * Set the baud rate
     * @param rate Baud rate in bits per second
     */
    setBaudRate(rate: number): void;
    /**
     * Get current baud rate
     * @returns Current baud rate
     */
    getBaudRate(): number;
    /**
     * Get all transmitted data
     * @returns Array of transmitted bytes
     */
    getTransmittedData(): number[];
    /**
     * Get transmitted data as string
     * @returns Transmitted data as string
     */
    getTransmittedString(): string;
    /**
     * Clear the transmit log
     */
    clearTransmitLog(): void;
    /**
     * Add data to the receive buffer
     * @param data Byte to add to receive buffer
     */
    addReceiveData(data: number): void;
    /**
     * Add string to the receive buffer
     * @param text String to add to receive buffer
     */
    addReceiveString(text: string): void;
    /**
     * Set the ready state
     * @param ready Whether the port is ready
     */
    setReady(ready: boolean): void;
    /**
     * Close the serial port
     */
    close(): void;
}
/**
 * Null serial port implementation (no-op)
 */
export declare class NullSerialPort implements SerialPort {
    private baudRate;
    write(data: number): void;
    read(): number | null;
    hasData(): boolean;
    isReady(): boolean;
    setBaudRate(rate: number): void;
    getBaudRate(): number;
    close(): void;
}
//# sourceMappingURL=serial-port.d.ts.map