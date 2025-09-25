"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACIA68B50 = exports.ACIAStatusBits = exports.ACIAControlBits = void 0;
/**
 * Control Register bit definitions
 */
var ACIAControlBits;
(function (ACIAControlBits) {
    // Counter Divide Select (bits 0-1)
    ACIAControlBits[ACIAControlBits["DIVIDE_1"] = 0] = "DIVIDE_1";
    ACIAControlBits[ACIAControlBits["DIVIDE_16"] = 1] = "DIVIDE_16";
    ACIAControlBits[ACIAControlBits["DIVIDE_64"] = 2] = "DIVIDE_64";
    ACIAControlBits[ACIAControlBits["MASTER_RESET"] = 3] = "MASTER_RESET";
    // Word Select (bits 2-4)
    ACIAControlBits[ACIAControlBits["WORD_7E2"] = 0] = "WORD_7E2";
    ACIAControlBits[ACIAControlBits["WORD_7O2"] = 4] = "WORD_7O2";
    ACIAControlBits[ACIAControlBits["WORD_7E1"] = 8] = "WORD_7E1";
    ACIAControlBits[ACIAControlBits["WORD_7O1"] = 12] = "WORD_7O1";
    ACIAControlBits[ACIAControlBits["WORD_8N2"] = 16] = "WORD_8N2";
    ACIAControlBits[ACIAControlBits["WORD_8N1"] = 20] = "WORD_8N1";
    ACIAControlBits[ACIAControlBits["WORD_8E1"] = 24] = "WORD_8E1";
    ACIAControlBits[ACIAControlBits["WORD_8O1"] = 28] = "WORD_8O1";
    // Transmitter Control (bits 5-6)
    ACIAControlBits[ACIAControlBits["TX_RTS_LOW_INT_DISABLE"] = 0] = "TX_RTS_LOW_INT_DISABLE";
    ACIAControlBits[ACIAControlBits["TX_RTS_LOW_INT_ENABLE"] = 32] = "TX_RTS_LOW_INT_ENABLE";
    ACIAControlBits[ACIAControlBits["TX_RTS_HIGH_INT_DISABLE"] = 64] = "TX_RTS_HIGH_INT_DISABLE";
    ACIAControlBits[ACIAControlBits["TX_RTS_LOW_BREAK_INT_DISABLE"] = 96] = "TX_RTS_LOW_BREAK_INT_DISABLE";
    // Receiver Interrupt Enable (bit 7)
    ACIAControlBits[ACIAControlBits["RX_INT_DISABLE"] = 0] = "RX_INT_DISABLE";
    ACIAControlBits[ACIAControlBits["RX_INT_ENABLE"] = 128] = "RX_INT_ENABLE";
})(ACIAControlBits || (exports.ACIAControlBits = ACIAControlBits = {}));
/**
 * Status Register bit definitions
 */
var ACIAStatusBits;
(function (ACIAStatusBits) {
    ACIAStatusBits[ACIAStatusBits["RDRF"] = 1] = "RDRF";
    ACIAStatusBits[ACIAStatusBits["TDRE"] = 2] = "TDRE";
    ACIAStatusBits[ACIAStatusBits["DCD"] = 4] = "DCD";
    ACIAStatusBits[ACIAStatusBits["CTS"] = 8] = "CTS";
    ACIAStatusBits[ACIAStatusBits["FE"] = 16] = "FE";
    ACIAStatusBits[ACIAStatusBits["OVRN"] = 32] = "OVRN";
    ACIAStatusBits[ACIAStatusBits["PE"] = 64] = "PE";
    ACIAStatusBits[ACIAStatusBits["IRQ"] = 128] = "IRQ"; // Interrupt Request
})(ACIAStatusBits || (exports.ACIAStatusBits = ACIAStatusBits = {}));
/**
 * Motorola 68B50 ACIA peripheral implementation
 */
class ACIA68B50 {
    constructor() {
        this.controlRegister = 0x00;
        this.statusRegister = ACIAStatusBits.TDRE; // Start with transmit ready
        this.receiveDataRegister = 0x00;
        this.transmitDataRegister = 0x00;
        this.receiveBuffer = [];
        this.transmitBuffer = [];
        this.serialPort = null;
        this.baudRate = 9600;
        // Timing simulation
        this.cyclesPerBit = 0;
        this.transmitCyclesRemaining = 0;
        this.receiveCyclesRemaining = 0;
        // Interrupt state
        this.interruptPending = false;
        this.updateBaudRateTiming();
    }
    /**
     * Read from ACIA register
     * @param offset Register offset (0 = Status, 1 = Data)
     * @returns Register value
     */
    read(offset) {
        switch (offset) {
            case 0: // Status Register
                return this.getStatusRegister();
            case 1: // Receive Data Register
                return this.receiveData();
            default:
                return 0xFF;
        }
    }
    /**
     * Write to ACIA register
     * @param offset Register offset (0 = Control, 1 = Data)
     * @param value Value to write
     */
    write(offset, value) {
        switch (offset) {
            case 0: // Control Register
                this.setControlRegister(value);
                break;
            case 1: // Transmit Data Register
                this.transmitData(value);
                break;
        }
    }
    /**
     * Reset the ACIA to initial state
     */
    reset() {
        this.controlRegister = 0x00;
        this.statusRegister = ACIAStatusBits.TDRE;
        this.receiveDataRegister = 0x00;
        this.transmitDataRegister = 0x00;
        this.receiveBuffer = [];
        this.transmitBuffer = [];
        this.transmitCyclesRemaining = 0;
        this.receiveCyclesRemaining = 0;
        this.interruptPending = false;
        this.updateBaudRateTiming();
    }
    /**
     * Update ACIA state each CPU cycle
     * @param cycles Number of CPU cycles elapsed
     */
    tick(cycles) {
        // Handle transmit timing
        if (this.transmitCyclesRemaining > 0) {
            this.transmitCyclesRemaining -= cycles;
            if (this.transmitCyclesRemaining <= 0) {
                this.completeTransmission();
            }
        }
        // Handle receive timing
        if (this.receiveCyclesRemaining > 0) {
            this.receiveCyclesRemaining -= cycles;
            if (this.receiveCyclesRemaining <= 0) {
                this.completeReception();
            }
        }
        // Check for incoming data from serial port
        if (this.serialPort && this.serialPort.hasData()) {
            const data = this.serialPort.read();
            if (data !== null && this.receiveCyclesRemaining <= 0) {
                this.startReception(data);
            }
        }
        // Update interrupt status
        this.updateInterruptStatus();
    }
    /**
     * Check if interrupt is pending
     * @returns true if interrupt is pending
     */
    getInterruptStatus() {
        return this.interruptPending;
    }
    /**
     * Set control register and handle configuration changes
     * @param value Control register value
     */
    setControlRegister(value) {
        const previousControl = this.controlRegister;
        this.controlRegister = value;
        // Handle master reset
        if ((value & 0x03) === ACIAControlBits.MASTER_RESET) {
            this.reset();
            return;
        }
        // Update baud rate timing if divide ratio changed
        if ((value & 0x03) !== (previousControl & 0x03)) {
            this.updateBaudRateTiming();
        }
        // Update interrupt enables
        this.updateInterruptStatus();
    }
    /**
     * Get current status register value
     * @returns Status register value
     */
    getStatusRegister() {
        let status = this.statusRegister;
        // Update RDRF (Receive Data Register Full)
        if (this.receiveBuffer.length > 0) {
            status |= ACIAStatusBits.RDRF;
        }
        else {
            status &= ~ACIAStatusBits.RDRF;
        }
        // Update TDRE (Transmit Data Register Empty)
        if (this.transmitCyclesRemaining <= 0) {
            status |= ACIAStatusBits.TDRE;
        }
        else {
            status &= ~ACIAStatusBits.TDRE;
        }
        // Update CTS and DCD based on serial port status
        if (this.serialPort && this.serialPort.isReady()) {
            status |= ACIAStatusBits.CTS;
            status |= ACIAStatusBits.DCD;
        }
        else {
            status &= ~ACIAStatusBits.CTS;
            status &= ~ACIAStatusBits.DCD;
        }
        this.statusRegister = status;
        return status;
    }
    /**
     * Transmit data through the ACIA
     * @param data Byte to transmit
     */
    transmitData(data) {
        if (this.transmitCyclesRemaining > 0) {
            // Transmitter busy, ignore write
            return;
        }
        this.transmitDataRegister = data & 0xFF;
        this.transmitCyclesRemaining = this.cyclesPerBit * 10; // Start bit + 8 data bits + stop bit
        this.statusRegister &= ~ACIAStatusBits.TDRE;
    }
    /**
     * Receive data from the ACIA
     * @returns Received data byte
     */
    receiveData() {
        if (this.receiveBuffer.length > 0) {
            const data = this.receiveBuffer.shift();
            this.receiveDataRegister = data;
            // Clear RDRF if buffer is now empty
            if (this.receiveBuffer.length === 0) {
                this.statusRegister &= ~ACIAStatusBits.RDRF;
            }
            this.updateInterruptStatus();
            return data;
        }
        return this.receiveDataRegister;
    }
    /**
     * Set the baud rate for serial communication
     * @param rate Baud rate in bits per second
     */
    setBaudRate(rate) {
        this.baudRate = rate;
        this.updateBaudRateTiming();
        if (this.serialPort) {
            this.serialPort.setBaudRate(rate);
        }
    }
    /**
     * Connect a serial port for external communication
     * @param port Serial port interface
     */
    connectSerial(port) {
        if (this.serialPort) {
            this.serialPort.close();
        }
        this.serialPort = port;
        port.setBaudRate(this.baudRate);
    }
    /**
     * Disconnect the serial port
     */
    disconnectSerial() {
        if (this.serialPort) {
            this.serialPort.close();
            this.serialPort = null;
        }
    }
    /**
     * Get current baud rate
     * @returns Current baud rate
     */
    getBaudRate() {
        return this.baudRate;
    }
    /**
     * Update baud rate timing based on control register
     */
    updateBaudRateTiming() {
        const divideRatio = this.controlRegister & 0x03;
        let effectiveBaudRate = this.baudRate;
        switch (divideRatio) {
            case ACIAControlBits.DIVIDE_1:
                effectiveBaudRate = this.baudRate;
                break;
            case ACIAControlBits.DIVIDE_16:
                effectiveBaudRate = this.baudRate / 16;
                break;
            case ACIAControlBits.DIVIDE_64:
                effectiveBaudRate = this.baudRate / 64;
                break;
        }
        // Assume 1MHz CPU clock for timing calculations
        const cpuFrequency = 1000000;
        this.cyclesPerBit = Math.floor(cpuFrequency / effectiveBaudRate);
    }
    /**
     * Complete transmission of current byte
     */
    completeTransmission() {
        if (this.serialPort) {
            this.serialPort.write(this.transmitDataRegister);
        }
        this.statusRegister |= ACIAStatusBits.TDRE;
        this.transmitCyclesRemaining = 0;
        this.updateInterruptStatus();
    }
    /**
     * Start reception of a byte
     * @param data Byte being received
     */
    startReception(data) {
        this.receiveCyclesRemaining = this.cyclesPerBit * 10; // Simulate receive timing
        this.receiveBuffer.push(data & 0xFF);
        // Check for buffer overflow
        if (this.receiveBuffer.length > 1) {
            this.statusRegister |= ACIAStatusBits.OVRN;
        }
    }
    /**
     * Complete reception of current byte
     */
    completeReception() {
        this.statusRegister |= ACIAStatusBits.RDRF;
        this.receiveCyclesRemaining = 0;
        this.updateInterruptStatus();
    }
    /**
     * Update interrupt status based on current state and control settings
     */
    updateInterruptStatus() {
        let interrupt = false;
        // Check receive interrupt
        if ((this.controlRegister & ACIAControlBits.RX_INT_ENABLE) &&
            (this.statusRegister & ACIAStatusBits.RDRF)) {
            interrupt = true;
        }
        // Check transmit interrupt
        const txControl = this.controlRegister & 0x60;
        if (txControl === ACIAControlBits.TX_RTS_LOW_INT_ENABLE &&
            (this.statusRegister & ACIAStatusBits.TDRE)) {
            interrupt = true;
        }
        this.interruptPending = interrupt;
        if (interrupt) {
            this.statusRegister |= ACIAStatusBits.IRQ;
        }
        else {
            this.statusRegister &= ~ACIAStatusBits.IRQ;
        }
    }
}
exports.ACIA68B50 = ACIA68B50;
//# sourceMappingURL=acia.js.map