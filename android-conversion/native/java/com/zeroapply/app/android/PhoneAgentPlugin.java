package com.zeroapply.app.android;

import android.app.ActivityManager;
import android.app.AlertDialog;
import android.app.Dialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.StatFs;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;

@CapacitorPlugin(name = "ZeroApplyPhoneAgent")
public class PhoneAgentPlugin extends Plugin {
    static final long MODEL_BYTES = 1117320736L;
    static final String MODEL_SHA = "6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e";
    static final String MODEL_FILE = "qwen2.5-1.5b-instruct-q4_k_m.gguf";
    static final String MODEL_URL = "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/91cad51170dc346986eccefdc2dd33a9da36ead9/" + MODEL_FILE;
    private final Object control = new Object();
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile boolean ready = false;
    private volatile boolean loading = false;
    private volatile boolean generating = false;
    private volatile boolean nativeStarted = false;
    private volatile long epoch = 0;
    private volatile HttpURLConnection download;
    private volatile String status = "AI standby";
    private volatile int progress = 0;
    private Dialog browserDialog;
    private WebView browser;
    private TextView browserStatus;
    private boolean browserReady = false;
    private boolean pickingResume = false;
    private boolean destroyed = false;

    private boolean trusted(PluginCall call) {
        Uri uri = Uri.parse(getBridge().getWebView().getUrl() == null ? "" : getBridge().getWebView().getUrl());
        if (!"https".equals(uri.getScheme()) || !"localhost".equals(uri.getHost())) {
            call.reject("This command is available only from ZeroApply's app interface."); return false;
        }
        return true;
    }
    private File modelFile() { return new File(new File(getContext().getFilesDir(), "models"), MODEL_FILE); }
    private JSObject state() {
        JSObject result = new JSObject();
        result.put("isReady", ready); result.put("isLoading", loading); result.put("isGenerating", generating);
        result.put("progressText", status); result.put("progressPercent", progress);
        result.put("modelName", "Qwen2.5 1.5B (on this phone)");
        result.put("modelDownloaded", modelFile().isFile() && modelFile().length() == MODEL_BYTES);
        return result;
    }
    private void publish(String message, int percent) {
        if (message.equals(status) && percent == progress) return;
        status = message; progress = Math.max(0, Math.min(100, percent));
        notifyListeners("modelState", state());
    }
    @PluginMethod public void modelStatus(PluginCall call) { if (trusted(call)) call.resolve(state()); }
    private void memoryCheck() throws Exception {
        ActivityManager manager = (ActivityManager) getContext().getSystemService(android.content.Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memory = new ActivityManager.MemoryInfo(); manager.getMemoryInfo(memory);
        if (memory.totalMem < 4L * 1024 * 1024 * 1024 || memory.availMem < 1536L * 1024 * 1024 || memory.lowMemory)
            throw new IllegalStateException("AI needs a 64-bit phone with at least 4 GB RAM and about 1.5 GB free memory. Close other apps and retry.");
        boolean supported = false;
        for (String abi : Build.SUPPORTED_ABIS) if (abi.equals("arm64-v8a") || abi.equals("x86_64")) supported = true;
        if (!supported) throw new IllegalStateException("The local AI requires a 64-bit Android device.");
        long needed = modelFile().isFile() && modelFile().length() == MODEL_BYTES ? 128L * 1024 * 1024 : MODEL_BYTES + 512L * 1024 * 1024;
        if (new StatFs(getContext().getFilesDir().getPath()).getAvailableBytes() < needed)
            throw new IllegalStateException("Free about 1.6 GB of storage for the one-time AI download.");
    }
    @PluginMethod public void modelStart(PluginCall call) {
        if (!trusted(call)) return;
        if (!"review-start".equals(call.getString("trigger"))) { call.reject("Click Review & start AutoApply to load AI."); return; }
        synchronized (control) {
            if (ready) { call.resolve(state()); return; }
            if (loading || generating || destroyed) { call.reject("AI is busy. Wait or tap Stop."); return; }
            try { memoryCheck(); } catch (Exception error) { call.reject(error.getMessage()); return; }
            loading = true;
        }
        publish("Preparing phone AI…", 0);
        if (!modelFile().isFile() || modelFile().length() != MODEL_BYTES) {
            getActivity().runOnUiThread(() -> new AlertDialog.Builder(getActivity())
                .setTitle("Download built-in AI?")
                .setMessage("One-time download: about 1.1 GB. Use Wi-Fi if possible. AI then works on this phone without Ollama or a computer. You can stop at any time.")
                .setPositiveButton("Download & start", (dialog, which) -> beginStart(call))
                .setNegativeButton("Cancel", (dialog, which) -> { loading = false; publish("AI standby", 0); call.reject("AI download cancelled."); })
                .setOnCancelListener(dialog -> { loading = false; publish("AI standby", 0); call.reject("AI download cancelled."); }).show());
        } else beginStart(call);
    }
    private void beginStart(PluginCall call) {
        final long session;
        synchronized (control) {
            if (!loading || destroyed) { call.reject("AI startup was stopped."); return; }
            session = ++epoch;
            try { LlamaNative.beginSession(); nativeStarted = true; }
            catch (LinkageError error) { loading = false; publish("AI unavailable on this device", 0); call.reject("This phone cannot load the native AI runtime."); return; }
        }
        worker.execute(() -> {
            try {
                ensureModel(session);
                checkSession(session); memoryCheck();
                publish("Loading AI on this phone…", 90);
                LlamaNative.load(modelFile().getAbsolutePath(), Math.max(1, Math.min(2, Runtime.getRuntime().availableProcessors()-1)));
                synchronized (control) { checkSession(session); ready = true; loading = false; }
                publish("AI ready on this phone", 100); call.resolve(state());
            } catch (Exception error) {
                synchronized (control) { if (session == epoch) { ready = false; loading = false; publish(error.getMessage() == null ? "AI startup failed" : error.getMessage(), 0); } }
                LlamaNative.unload(); call.reject(error.getMessage() == null ? "Could not start phone AI." : error.getMessage());
            }
        });
    }
    private void checkSession(long session) throws InterruptedIOException {
        if (session != epoch || destroyed) throw new InterruptedIOException("AI stopped.");
    }
    private void ensureModel(long session) throws Exception {
        File file = modelFile();
        if (file.isFile() && file.length() == MODEL_BYTES) {
            publish("Checking cached AI model…", 5);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream input = new FileInputStream(file)) {
                byte[] buffer = new byte[1024 * 1024]; long read = 0; int count;
                while ((count = input.read(buffer)) != -1) { checkSession(session); digest.update(buffer, 0, count); read += count; publish("Checking cached AI model…", (int)(read*80/MODEL_BYTES)); }
            }
            if (hex(digest.digest()).equals(MODEL_SHA)) return;
            if (!file.delete()) throw new IllegalStateException("Could not remove the damaged AI model. Clear app storage to retry.");
            throw new IllegalStateException("The damaged AI model was removed. Tap Review & start AutoApply to download it again.");
        }
        if (!file.getParentFile().isDirectory() && !file.getParentFile().mkdirs()) throw new IllegalStateException("Could not create private AI storage.");
        File partial = new File(file.getParentFile(), MODEL_FILE + ".part");
        HttpURLConnection connection = (HttpURLConnection) new URL(MODEL_URL).openConnection();
        connection.setConnectTimeout(30000); connection.setReadTimeout(15000); connection.setInstanceFollowRedirects(true);
        download = connection;
        try {
            if (connection.getResponseCode() != 200 || !"https".equals(connection.getURL().getProtocol())) throw new IllegalStateException("AI download unavailable. Check your connection and retry.");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long total = 0; byte[] buffer = new byte[1024 * 1024]; int count;
            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                while ((count = input.read(buffer)) != -1) {
                    checkSession(session); total += count;
                    if (total > MODEL_BYTES) throw new IllegalStateException("AI download size mismatch.");
                    output.write(buffer, 0, count); digest.update(buffer, 0, count);
                    int percent = (int)(total*85/MODEL_BYTES);
                    if (percent != progress) publish("Downloading AI: " + (total/1024/1024) + " / 1066 MB", percent);
                }
                output.getFD().sync();
            }
            if (total != MODEL_BYTES || !hex(digest.digest()).equals(MODEL_SHA)) throw new IllegalStateException("AI download integrity check failed. Retry on a stable connection.");
            checkSession(session);
            if (!partial.renameTo(file)) throw new IllegalStateException("Could not save the AI model.");
        } finally { connection.disconnect(); download = null; if (partial.exists()) partial.delete(); }
    }
    private static String hex(byte[] bytes) { StringBuilder value = new StringBuilder(); for (byte b : bytes) value.append(String.format(java.util.Locale.ROOT, "%02x", b & 255)); return value.toString(); }
    @PluginMethod public void modelGenerate(PluginCall call) {
        if (!trusted(call)) return;
        final String prompt = call.getString("prompt", ""); final String system = call.getString("systemPrompt", "");
        final int tokens = Math.max(1, Math.min(256, call.getInt("maxTokens", 96)));
        final long session;
        synchronized (control) {
            if (!ready || loading || generating || destroyed) { call.reject("AI is off or busy. Click Review & start AutoApply first."); return; }
            if (prompt.isEmpty() || prompt.length() > 16000 || system.length() > 8000) { call.reject("Shorten the AI question and resume context."); return; }
            generating = true; session = epoch;
        }
        publish("AI is reading the application question…", 100);
        worker.execute(() -> {
            try {
                checkSession(session);
                byte[] result = LlamaNative.generate(prompt.getBytes(StandardCharsets.UTF_8), system.getBytes(StandardCharsets.UTF_8), tokens);
                checkSession(session); JSObject output = new JSObject(); output.put("text", new String(result, StandardCharsets.UTF_8)); call.resolve(output);
            } catch (Exception error) { call.reject(error.getMessage() == null ? "AI answer failed. Review this field manually." : error.getMessage()); }
            finally { synchronized (control) { generating = false; if (session == epoch) publish("AI ready on this phone", 100); } }
        });
    }
    private void stopModel() {
        synchronized (control) { ++epoch; ready = false; loading = false; generating = false; HttpURLConnection connection = download; if (connection != null) new Thread(connection::disconnect, "zeroapply-download-stop").start(); if (nativeStarted) { LlamaNative.cancel(); if (!worker.isShutdown()) worker.execute(LlamaNative::unload); } }
        publish("AI standby", 0);
    }
    @PluginMethod public void modelStop(PluginCall call) { if (trusted(call)) { stopModel(); call.resolve(); } }
    static boolean linkedInUrl(String url) {
        Uri uri = Uri.parse(url); String host = uri.getHost();
        return "https".equals(uri.getScheme()) && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443) && host != null && (host.equals("linkedin.com") || host.endsWith(".linkedin.com"));
    }
    @PluginMethod public void openLinkedIn(PluginCall call) {
        if (!trusted(call)) return;
        String url = call.getString("url", "https://www.linkedin.com/jobs/");
        if (!linkedInUrl(url)) { call.reject("Only secure LinkedIn pages can open in this browser."); return; }
        getActivity().runOnUiThread(() -> {
            if (browserDialog != null) { browser.loadUrl(url); call.resolve(); return; }
            browserDialog = new Dialog(getActivity(), android.R.style.Theme_Material_Light_NoActionBar);
            LinearLayout layout = new LinearLayout(getActivity()); layout.setOrientation(LinearLayout.VERTICAL); layout.setBackgroundColor(Color.WHITE);
            browserStatus = new TextView(getActivity()); browserStatus.setPadding(18, 18, 18, 12); browserStatus.setText("LinkedIn · Sign in yourself, then tap Continue AutoApply. AI never reads your password."); layout.addView(browserStatus);
            LinearLayout controls = new LinearLayout(getActivity()); controls.setOrientation(LinearLayout.HORIZONTAL);
            addButton(controls, "Back", () -> { if (browser.canGoBack()) browser.goBack(); });
            addButton(controls, "Continue AutoApply", () -> { JSObject event = new JSObject(); event.put("action", "continue"); notifyListeners("browserControl", event); });
            addButton(controls, "Stop", () -> { stopModel(); JSObject event = new JSObject(); event.put("action", "stop"); notifyListeners("browserControl", event); browserStatus.setText("Stopped. AI is off. You can continue browsing manually."); });
            addButton(controls, "Close", () -> browserDialog.dismiss()); layout.addView(controls);
            browser = new WebView(getActivity());
            WebSettings settings = browser.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); settings.setAllowFileAccess(false); settings.setAllowContentAccess(true); settings.setSupportMultipleWindows(false);
            CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false);
            browser.setWebChromeClient(new WebChromeClient() {
                @Override public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) { pickingResume = ((MainActivity)getActivity()).chooseResume(callback); return true; }
            });
            browser.setWebViewClient(new WebViewClient() {
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !linkedInUrl(request.getUrl().toString()); }
                @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) { handler.cancel(); browserStatus.setText("LinkedIn's secure connection could not be verified. Retry later."); }
                @Override public void onPageStarted(WebView view, String page, android.graphics.Bitmap icon) { browserReady = false; }
                @Override public void onPageFinished(WebView view, String page) { browserReady = linkedInUrl(page); JSObject event = new JSObject(); event.put("url", page); notifyListeners("browserPage", event); }
            });
            layout.addView(browser, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1)); browserDialog.setContentView(layout);
            browserDialog.setOnDismissListener(dialog -> { stopModel(); ((MainActivity)getActivity()).cancelResumeChoice(); browser.stopLoading(); browser.destroy(); browser = null; browserReady = false; browserDialog = null; JSObject event = new JSObject(); event.put("action", "closed"); notifyListeners("browserControl", event); });
            browserDialog.show(); browserDialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT); browser.loadUrl(url); call.resolve();
        });
    }
    private void addButton(LinearLayout row, String title, Runnable action) { Button button = new Button(getActivity()); button.setText(title); button.setTextSize(12); button.setPadding(4, 4, 4, 4); row.addView(button, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1)); button.setOnClickListener(view -> action.run()); }
    @PluginMethod public void evaluateLinkedIn(PluginCall call) {
        if (!trusted(call)) return;
        String script = call.getString("script", "");
        if (script.isEmpty() || script.length() > 150000) { call.reject("Invalid browser command."); return; }
        getActivity().runOnUiThread(() -> {
            if (browser == null || !browserReady || !linkedInUrl(browser.getUrl())) { call.reject("LinkedIn is loading or closed. Wait, then tap Continue AutoApply."); return; }
            browser.evaluateJavascript("JSON.stringify(" + script + ")", raw -> {
                try { if (raw == null || raw.equals("null")) throw new IllegalStateException(); JSObject output = new JSObject(); output.put("json", new JSONArray("["+raw+"]").getString(0)); call.resolve(output); }
                catch (Exception error) { call.reject("The LinkedIn page changed. Retry this step."); }
            });
        });
    }
    @PluginMethod public void showBrowserStatus(PluginCall call) { if (trusted(call)) { String message = call.getString("message", ""); getActivity().runOnUiThread(() -> { if (browserStatus != null) browserStatus.setText(message); }); call.resolve(); } }
    @PluginMethod public void closeLinkedIn(PluginCall call) { if (trusted(call)) { getActivity().runOnUiThread(() -> { if (browserDialog != null) browserDialog.dismiss(); }); call.resolve(); } }
    @Override protected void handleOnPause() { if (!pickingResume) stopModel(); }
    @Override protected void handleOnResume() { pickingResume = false; }
    @Override protected void handleOnDestroy() { destroyed = true; stopModel(); if (browserDialog != null) getActivity().runOnUiThread(() -> { if (browserDialog != null) browserDialog.dismiss(); }); worker.shutdown(); }
}
