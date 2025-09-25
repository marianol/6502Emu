"use strict";
/**
 * Serial port implementations for ACIA connectivity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullSerialPort = exports.MemorySerialPort = exports.ConsoleSerialPort = void 0;
/**
 * Console-based serial port implementation for debugging and testing
 */
class ConsoleSerialPort {
    constructor() {
        this.receiveBuffer = [];
        this.baudRate = 9600;
        this.isOpen = true;
        // In a real implementation, this might set up stdin/stdout handling
    }
    /**
     * Write data to console output
     * @param data Byte to transmit
     */
    write(data) {
        if (!this.isOpen)
            return;
        // Convert byte to character and output to console
        const char = String.fromCharCode(data & 0xFF);
        process.stdout.write(char);
    }
    /**
     * Read data from the receive buffer
     * @returns Received byte or null if no data available
     */
    read() {
        if (this.receiveBuffer.length > 0) {
            return this.receiveBuffer.shift();
        }
        return null;
    }
    /**
     * Check if data is available to read
     * @returns true if data is available
     */
    hasData() {
        return this.receiveBuffer.length > 0;
    }
    /**
     * Check if the port is ready to transmit
     * @returns true if ready to transmit
     */
    isReady() {
        return this.isOpen;
    }
    /**
     * Set the baud rate
     * @param rate Baud rate in bits per second
     */
    setBaudRate(rate) {
        this.baudRate = rate;
    }
    /**
     * Get current baud rate
     * @returns Current baud rate
     */
    getBaudRate() {
        return this.baudRate;
    }
    /**
     * Add data to the receive buffer (for testing)
     * @param data Byte to add to receive buffer
     */
    addReceiveData(data) {
        this.receiveBuffer.push(data & 0xFF);
    }
    /**
     * Add string to the receive buffer (for testing)
     * @param text String to add to receive buffer
     */
    addReceiveString(text) {
        for (let i = 0; i < text.length; i++) {
            this.receiveBuffer.push(text.charCodeAt(i));
        }
    }
    /**
     * Close the serial port
     */
    close() {
        this.isOpen = false;
        this.receiveBuffer = [];
    }
    /**
     * Check if the port is open
     * @returns true if the port is open
     */
    isPortOpen() {
        return this.isOpen;
    }
}
exports.ConsoleSerialPort = ConsoleSerialPort;
/**
 * Memory-based serial port implementation for testing
 */
class MemorySerialPort {
    constructor() {
        this.transmitLog = [];
        this.receiveBuffer = [];
        this.baudRate = 9600;
        this.ready = true;
    }
    /**
     * Write data to the transmit log
     * @param data Byte to transmit
     */
    write(data) {
        this.transmitLog.push(data & 0xFF);
    }
    /**
     * Read data from the receive buffer
     * @returns Received byte or null if no data available
     */
    read() {
        if (this.receiveBuffer.length > 0) {
            return this.receiveBuffer.shift();
        }
        return null;
    }
    /**
     * Check if data is available to read
     * @returns true if data is available
     */
    hasData() {
        return this.receiveBuffer.length > 0;
    }
    /**
     * Check if the port is ready to transmit
     * @returns true if ready to transmit
     */
    isReady() {
        return this.ready;
    }
    /**
     * Set the baud rate
     * @param rate Baud rate in bits per second
     */
    setBaudRate(rate) {
        this.baudRate = rate;
    }
    /**
     * Get current baud rate
     * @returns Current baud rate
     */
    getBaudRate() {
        return this.baudRate;
    }
    /**
     * Get all transmitted data
     * @returns Array of transmitted bytes
     */
    getTransmittedData() {
        return [...this.transmitLog];
    }
    /**
     * Get transmitted data as string
     * @returns Transmitted data as string
     */
    getTransmittedString() {
        return String.fromCharCode(...this.transmitLog);
    }
    /**
     * Clear the transmit log
     */
    clearTransmitLog() {
        this.transmitLog = [];
    }
    /**
     * Add data to the receive buffer
     * @param data Byte to add to receive buffer
     */
    addReceiveData(data) {
        this.receiveBuffer.push(data & 0xFF);
    }
    /**
     * Add string to the receive buffer
     * @param text String to add to receive buffer
     */
    addReceiveString(text) {
        for (let i = 0; i < text.length; i++) {
            this.receiveBuffer.push(text.charCodeAt(i));
        }
    }
    /**
     * Set the ready state
     * @param ready Whether the port is ready
     */
    setReady(ready) {
        this.ready = ready;
    }
    /**
     * Close the serial port
     */
    close() {
        this.transmitLog = [];
        this.receiveBuffer = [];
        this.ready = false;
    }
}
exports.MemorySerialPort = MemorySerialPort;
/**
 * Null serial port implementation (no-op)
 */
class NullSerialPort {
    constructor() {
        this.baudRate = 9600;
    }
    write(data) {
        // No-op
    }
    read() {
        return null;
    }
    hasData() {
        return false;
    }
    isReady() {
        return true;
    }
    setBaudRate(rate) {
        this.baudRate = rate;
    }
    getBaudRate() {
        return this.baudRate;
    }
    close() {
        // No-op
    }
}
exports.NullSerialPort = NullSerialPort;
//# sourceMappingURL=serial-port.js.map