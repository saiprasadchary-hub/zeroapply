package com.zeroapply.app.android;

final class LlamaNative {
    static { System.loadLibrary("zeroapply_llm"); }
    static native void beginSession();
    static native void load(String path, int threads);
    static native byte[] generate(byte[] prompt, byte[] system, int maxTokens);
    static native void cancel();
    static native void unload();
    private LlamaNative() {}
}
