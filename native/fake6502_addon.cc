#include <napi.h>
#include "fake6502.h"

// Global memory callback functions for the C code
static Napi::FunctionReference g_read_callback;
static Napi::FunctionReference g_write_callback;
static Napi::Env g_env;

// C callback functions that bridge to JavaScript
uint8_t memory_read_bridge(uint16_t address) {
    if (!g_read_callback.IsEmpty()) {
        Napi::Value result = g_read_callback.Call({Napi::Number::New(g_env, address)});
        if (result.IsNumber()) {
            return result.As<Napi::Number>().Uint32Value() & 0xFF;
        }
    }
    return 0xFF;
}

void memory_write_bridge(uint16_t address, uint8_t value) {
    if (!g_write_callback.IsEmpty()) {
        g_write_callback.Call({
            Napi::Number::New(g_env, address),
            Napi::Number::New(g_env, value)
        });
    }
}

// JavaScript-callable functions
Napi::Value Reset(const Napi::CallbackInfo& info) {
    cpu_reset();
    return info.Env().Undefined();
}

Napi::Value Step(const Napi::CallbackInfo& info) {
    uint8_t cycles = cpu_step();
    return Napi::Number::New(info.Env(), cycles);
}

Napi::Value GetState(const Napi::CallbackInfo& info) {
    cpu_state_t state;
    cpu_get_state(&state);
    
    Napi::Object obj = Napi::Object::New(info.Env());
    obj.Set("pc", Napi::Number::New(info.Env(), state.pc));
    obj.Set("sp", Napi::Number::New(info.Env(), state.sp));
    obj.Set("a", Napi::Number::New(info.Env(), state.a));
    obj.Set("x", Napi::Number::New(info.Env(), state.x));
    obj.Set("y", Napi::Number::New(info.Env(), state.y));
    obj.Set("status", Napi::Number::New(info.Env(), state.status));
    obj.Set("cycles", Napi::Number::New(info.Env(), state.cycles));
    
    return obj;
}

Napi::Value SetState(const Napi::CallbackInfo& info) {
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(info.Env(), "Expected object argument").ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }
    
    Napi::Object obj = info[0].As<Napi::Object>();
    cpu_state_t state;
    cpu_get_state(&state); // Get current state first
    
    if (obj.Has("pc")) state.pc = obj.Get("pc").As<Napi::Number>().Uint32Value();
    if (obj.Has("sp")) state.sp = obj.Get("sp").As<Napi::Number>().Uint32Value();
    if (obj.Has("a")) state.a = obj.Get("a").As<Napi::Number>().Uint32Value();
    if (obj.Has("x")) state.x = obj.Get("x").As<Napi::Number>().Uint32Value();
    if (obj.Has("y")) state.y = obj.Get("y").As<Napi::Number>().Uint32Value();
    if (obj.Has("status")) state.status = obj.Get("status").As<Napi::Number>().Uint32Value();
    if (obj.Has("cycles")) state.cycles = obj.Get("cycles").As<Napi::Number>().Uint32Value();
    
    cpu_set_state(&state);
    return info.Env().Undefined();
}

Napi::Value SetMemoryCallbacks(const Napi::CallbackInfo& info) {
    if (info.Length() < 2 || !info[0].IsFunction() || !info[1].IsFunction()) {
        Napi::TypeError::New(info.Env(), "Expected two function arguments").ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }
    
    g_env = info.Env();
    g_read_callback = Napi::Persistent(info[0].As<Napi::Function>());
    g_write_callback = Napi::Persistent(info[1].As<Napi::Function>());
    
    cpu_set_memory_callbacks(memory_read_bridge, memory_write_bridge);
    
    return info.Env().Undefined();
}

Napi::Value TriggerIRQ(const Napi::CallbackInfo& info) {
    cpu_trigger_irq();
    return info.Env().Undefined();
}

Napi::Value TriggerNMI(const Napi::CallbackInfo& info) {
    cpu_trigger_nmi();
    return info.Env().Undefined();
}

Napi::Value ClearIRQ(const Napi::CallbackInfo& info) {
    cpu_clear_irq();
    return info.Env().Undefined();
}

Napi::Value IsIRQPending(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), cpu_is_irq_pending());
}

Napi::Value IsNMIPending(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), cpu_is_nmi_pending());
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("reset", Napi::Function::New(env, Reset));
    exports.Set("step", Napi::Function::New(env, Step));
    exports.Set("getState", Napi::Function::New(env, GetState));
    exports.Set("setState", Napi::Function::New(env, SetState));
    exports.Set("setMemoryCallbacks", Napi::Function::New(env, SetMemoryCallbacks));
    exports.Set("triggerIRQ", Napi::Function::New(env, TriggerIRQ));
    exports.Set("triggerNMI", Napi::Function::New(env, TriggerNMI));
    exports.Set("clearIRQ", Napi::Function::New(env, ClearIRQ));
    exports.Set("isIRQPending", Napi::Function::New(env, IsIRQPending));
    exports.Set("isNMIPending", Napi::Function::New(env, IsNMIPending));
    
    return exports;
}

NODE_API_MODULE(fake6502_addon, Init)