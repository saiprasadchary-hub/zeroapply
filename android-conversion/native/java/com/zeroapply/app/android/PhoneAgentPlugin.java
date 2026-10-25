package com.zeroapply.app.android;

import android.app.ActivityManager;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.os.CancellationSignal;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import android.app.AlertDialog;
import android.app.Dialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Looper;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
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
    private android.widget.FrameLayout browserPane;
    private final java.util.ArrayList<WebView> browserWindows = new java.util.ArrayList<>();
    private boolean browserVisible;
    private WebView browser;
    
    private boolean browserReady = false;
    private boolean pickingResume = false;
    private boolean destroyed = false;

    @PluginMethod public void openChrome(PluginCall call) {
        if (!trusted(call)) return;
        String url = call.getString("url", "");
        if (!webUrl(url)) { call.reject("Enter an HTTP or HTTPS website address."); return; }
        getActivity().runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setPackage("com.android.chrome");
            try { getActivity().startActivity(intent); call.resolve(); }
            catch (ActivityNotFoundException error) {
                intent.setPackage(null);
                try { getActivity().startActivity(intent); call.resolve(); }
                catch (ActivityNotFoundException missing) { call.reject("Install a browser on your phone to open this website."); }
            }
        });
    }
    @PluginMethod public void loginWithGoogle(PluginCall call) {
        if (!trusted(call)) return;
        int resource = getContext().getResources().getIdentifier("default_web_client_id", "string", getContext().getPackageName());
        if (resource == 0) { call.reject("Google sign-in needs the Firebase Android configuration and registered APK signing fingerprint."); return; }
        String clientId = getContext().getString(resource);
        getActivity().runOnUiThread(() -> {
            GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId).build();
            GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
            CredentialManager.create(getActivity()).getCredentialAsync(getActivity(), request, new CancellationSignal(),
                androidx.core.content.ContextCompat.getMainExecutor(getActivity()), new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override public void onResult(GetCredentialResponse response) {
                        try {
                            String type = response.getCredential().getType();
                            if (!type.equals(GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)) { call.reject("Google returned an unsupported credential."); return; }
                            String token = GoogleIdTokenCredential.createFrom(response.getCredential().getData()).getIdToken();
                            if (token.isEmpty()) { call.reject("Google did not return a sign-in token."); return; }
                            JSObject result = new JSObject(); result.put("idToken", token); call.resolve(result);
                        } catch (Exception error) { call.reject("Could not read the Google sign-in credential."); }
                    }
                    @Override public void onError(GetCredentialException error) { call.reject("Google sign-in was cancelled or unavailable. Retry and check the Android OAuth registration."); }
                });
        });
    }
    private boolean trusted(PluginCall call) {
        AtomicReference<String> page = new AtomicReference<>("");
        Runnable readOrigin = () -> { String value = getBridge().getWebView().getUrl(); page.set(value == null ? "" : value); };
        if (Looper.myLooper() == Looper.getMainLooper()) readOrigin.run();
        else {
            CountDownLatch latch = new CountDownLatch(1);
            getActivity().runOnUiThread(() -> { try { readOrigin.run(); } finally { latch.countDown(); } });
            try { if (!latch.await(2, TimeUnit.SECONDS)) { call.reject("The app is busy. Retry this action."); return false; } }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); call.reject("The app action was interrupted."); return false; }
        }
        Uri uri = Uri.parse(page.get());
        if (!"https".equals(uri.getScheme()) || !"localhost".equals(uri.getHost())) {
            call.reject("This command is available only from ZeroApply's app interface."); return false;
        }
        return true;
    }
    private boolean bundledModel() {
        try (android.content.res.AssetFileDescriptor asset = getContext().getAssets().openFd("models/" + MODEL_FILE)) { return asset.getLength() == MODEL_BYTES; }
        catch (java.io.IOException error) { return false; }
    }
    private File modelFile() { return new File(new File(getContext().getFilesDir(), "models"), MODEL_FILE); }
    private JSObject state() {
        JSObject result = new JSObject();
        result.put("isReady", ready); result.put("isLoading", loading); result.put("isGenerating", generating);
        result.put("progressText", status); result.put("progressPercent", progress);
        result.put("modelName", "Qwen2.5 1.5B (on this phone)");
        result.put("modelDownloaded", modelFile().isFile() && modelFile().length() == MODEL_BYTES || bundledModel());
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
            throw new IllegalStateException("Free about 1.6 GB of storage to prepare the AI model.");
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
        if ((!modelFile().isFile() || modelFile().length() != MODEL_BYTES) && !bundledModel()) {
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
        if (bundledModel()) {
            try {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long total = 0; byte[] buffer = new byte[1024 * 1024]; int count;
                try (InputStream input = getContext().getAssets().open("models/" + MODEL_FILE); FileOutputStream output = new FileOutputStream(partial)) {
                    while ((count = input.read(buffer)) != -1) {
                        checkSession(session); total += count;
                        if (total > MODEL_BYTES) throw new IllegalStateException("Bundled AI size mismatch.");
                        output.write(buffer, 0, count); digest.update(buffer, 0, count);
                        publish("Preparing bundled AI…", (int)(total * 85 / MODEL_BYTES));
                    }
                    output.getFD().sync();
                }
                if (total != MODEL_BYTES || !hex(digest.digest()).equals(MODEL_SHA)) throw new IllegalStateException("Bundled AI integrity check failed.");
                checkSession(session);
                if (!partial.renameTo(file)) throw new IllegalStateException("Could not save bundled AI.");
                return;
            } finally { if (partial.exists()) partial.delete(); }
        }
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
    static boolean webUrl(String url) {
        try {
            java.net.URI uri = new java.net.URI(url);
            return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                && uri.getHost() != null && uri.getUserInfo() == null && uri.getPort() <= 65535;
        } catch (Exception error) { return false; }
    }
    private void publishBrowser() {
        if (browser == null) return;
        JSObject event = new JSObject();
        event.put("url", browser.getUrl() == null ? "" : browser.getUrl());
        event.put("title", browser.getTitle() == null ? "" : browser.getTitle());
        event.put("progress", browser.getProgress()); event.put("canGoBack", browser.canGoBack());
        event.put("canGoForward", browser.canGoForward()); event.put("popup", browserWindows.size() > 1);
        notifyListeners("browserPage", event);
    }
    private void browserMessage(String message) {
        JSObject event = new JSObject(); event.put("message", message); notifyListeners("browserStatus", event);
    }
    private WebView createBrowser() {
        WebView view = new WebView(getActivity());
        WebSettings settings = view.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); settings.setSupportMultipleWindows(true); settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setBuiltInZoomControls(true); settings.setDisplayZoomControls(false); settings.setUseWideViewPort(true); settings.setLoadWithOverviewMode(true);
        CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(view, true);
        // Remote websites use a separate WebView with no Capacitor/native Javascript bridge.
        view.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView page, int progress) { if (page == browser) publishBrowser(); }
            @Override public void onReceivedTitle(WebView page, String title) { if (page == browser) publishBrowser(); }
            @Override public boolean onShowFileChooser(WebView page, android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                pickingResume = ((MainActivity)getActivity()).chooseFile(callback, params); return true;
            }
            @Override public boolean onCreateWindow(WebView page, boolean dialog, boolean gesture, android.os.Message result) {
                if (browserWindows.size() >= 8 || browserPane == null) return false;
                WebView popup = createBrowser(); browser.setVisibility(android.view.View.GONE);
                browserWindows.add(popup); browser = popup; browserReady = false;
                browserPane.addView(popup, new android.widget.FrameLayout.LayoutParams(-1, -1));
                ((WebView.WebViewTransport)result.obj).setWebView(popup); result.sendToTarget(); publishBrowser(); return true;
            }
            @Override public void onCloseWindow(WebView page) { closePopup(page); }
        });
        view.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView page, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (webUrl(url)) return false;
                // Only user gestures can open phone/email links; never launch arbitrary intent:// payloads.
                String scheme = request.getUrl().getScheme();
                if (request.isForMainFrame() && request.hasGesture() && ("tel".equals(scheme) || "mailto".equals(scheme))) {
                    try { getActivity().startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); } catch (ActivityNotFoundException ignored) {}
                }
                return true;
            }
            @Override public void onReceivedSslError(WebView page, SslErrorHandler handler, SslError error) { handler.cancel(); browserMessage("This website’s secure connection could not be verified."); }
            @Override public void onReceivedError(WebView page, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame() && page == browser) browserMessage("Could not load this website. Check your connection and retry.");
            }
            @Override public void onPageStarted(WebView page, String url, android.graphics.Bitmap icon) { if (page == browser) { browserReady = false; publishBrowser(); } }
            @Override public void onPageFinished(WebView page, String url) {
                CookieManager.getInstance().flush();
                if (page == browser) { browserReady = linkedInUrl(url); publishBrowser(); }
            }
        });
        view.setDownloadListener((url, agent, disposition, type, size) -> {
            if (!webUrl(url)) return;
            try { getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (ActivityNotFoundException error) { browserMessage("Open this download in Chrome."); }
        });
        return view;
    }
    private void closePopup(WebView page) {
        int index = browserWindows.indexOf(page);
        if (index <= 0) return;
        // Preserve the opener until its authentication popup has completed.
        for (int i = browserWindows.size() - 1; i >= index; --i) {
            WebView removed = browserWindows.remove(i); browserPane.removeView(removed); removed.stopLoading(); removed.destroy();
        }
        browser = browserWindows.get(browserWindows.size() - 1); browser.setVisibility(android.view.View.VISIBLE);
        browserReady = linkedInUrl(browser.getUrl() == null ? "" : browser.getUrl()); publishBrowser();
    }
    private void ensureBrowser() {
        if (browserPane != null) return;
        browserPane = new android.widget.FrameLayout(getActivity()); browserPane.setBackgroundColor(Color.WHITE);
        ((ViewGroup)getActivity().findViewById(android.R.id.content)).addView(browserPane, new android.widget.FrameLayout.LayoutParams(1, 1));
        browserPane.setVisibility(android.view.View.GONE);
        browser = createBrowser(); browserWindows.add(browser); browserPane.addView(browser, new android.widget.FrameLayout.LayoutParams(-1, -1));
    }
    @PluginMethod public void openBrowser(PluginCall call) {
        if (!trusted(call)) return;
        String url = call.getString("url", "https://www.linkedin.com/");
        if (!webUrl(url)) { call.reject("Enter an HTTP or HTTPS website address."); return; }
        getActivity().runOnUiThread(() -> { ensureBrowser(); browser.loadUrl(url); call.resolve(); });
    }
    @PluginMethod public void openLinkedIn(PluginCall call) { openBrowser(call); }
    @PluginMethod public void setBrowserBounds(PluginCall call) {
        if (!trusted(call)) return;
        double left = call.getDouble("left", 0.0), top = call.getDouble("top", 0.0), width = call.getDouble("width", 0.0), height = call.getDouble("height", 0.0), viewport = call.getDouble("viewport", 1.0);
        boolean visible = call.getBoolean("visible", false);
        if (!Double.isFinite(left+top+width+height+viewport) || viewport <= 0) { call.reject("Invalid browser size."); return; }
        getActivity().runOnUiThread(() -> {
            ensureBrowser(); android.view.View app = getBridge().getWebView(); android.view.View root = getActivity().findViewById(android.R.id.content);
            double scale = app.getWidth() / viewport; int[] appPosition = new int[2], rootPosition = new int[2]; app.getLocationInWindow(appPosition); root.getLocationInWindow(rootPosition);
            android.widget.FrameLayout.LayoutParams bounds = new android.widget.FrameLayout.LayoutParams(Math.max(1, (int)(width*scale)), Math.max(1, (int)(height*scale)));
            bounds.leftMargin = (int)(left*scale) + appPosition[0] - rootPosition[0] - root.getPaddingLeft();
            bounds.topMargin = (int)(top*scale) + appPosition[1] - rootPosition[1] - root.getPaddingTop(); browserPane.setLayoutParams(bounds);
            browserVisible = visible && width > 0 && height > 0; browserPane.setVisibility(browserVisible ? android.view.View.VISIBLE : android.view.View.GONE); publishBrowser(); call.resolve();
        });
    }
    @PluginMethod public void browserNavigate(PluginCall call) {
        if (!trusted(call)) return;
        String action = call.getString("action", "");
        getActivity().runOnUiThread(() -> {
            if (browser == null) { call.reject("Browser is not open."); return; }
            switch (action) {
                case "back": if (browser.canGoBack()) browser.goBack(); else closePopup(browser); break;
                case "forward": if (browser.canGoForward()) browser.goForward(); break;
                case "reload": browser.reload(); break;
                case "stop": browser.stopLoading(); break;
                case "closePopup": closePopup(browser); break;
                default: call.reject("Unknown browser action."); return;
            }
            publishBrowser(); call.resolve();
        });
    }
    boolean handleBrowserBack() {
        if (!browserVisible || browser == null) return false;
        if (browser.canGoBack()) { browser.goBack(); return true; }
        if (browserWindows.size() > 1) { closePopup(browser); return true; }
        return false;
    }
    private void destroyBrowser() {
        ((MainActivity)getActivity()).cancelResumeChoice(); CookieManager.getInstance().flush();
        for (WebView view : browserWindows) { browserPane.removeView(view); view.stopLoading(); view.destroy(); }
        browserWindows.clear(); browser = null; browserReady = false; browserVisible = false;
        if (browserPane != null) { ((ViewGroup)browserPane.getParent()).removeView(browserPane); browserPane = null; }
    }
    @PluginMethod public void evaluateLinkedIn(PluginCall call) {
        if (!trusted(call)) return;
        String script = call.getString("script", "");
        if (script.isEmpty() || script.length() > 150000) { call.reject("Invalid browser command."); return; }
        getActivity().runOnUiThread(() -> {
            if (browser == null || !browserReady || !linkedInUrl(browser.getUrl())) { call.reject("LinkedIn is loading or closed. Wait, then tap Continue AutoApply."); return; }
            browser.evaluateJavascript("JSON.stringify(" + script + ")", raw -> {
                try { if (browser == null || !browserReady || !linkedInUrl(browser.getUrl()) || raw == null || raw.equals("null")) throw new IllegalStateException(); JSObject output = new JSObject(); output.put("json", new JSONArray("["+raw+"]").getString(0)); call.resolve(output); }
                catch (Exception error) { call.reject("The LinkedIn page changed. Retry this step."); }
            });
        });
    }
    @PluginMethod public void showBrowserStatus(PluginCall call) { if (trusted(call)) { browserMessage(call.getString("message", "")); call.resolve(); } }
    @PluginMethod public void closeLinkedIn(PluginCall call) { if (trusted(call)) { getActivity().runOnUiThread(() -> { destroyBrowser(); call.resolve(); }); } }
    @Override protected void handleOnPause() { CookieManager.getInstance().flush(); if (!pickingResume) stopModel(); }
    @Override protected void handleOnResume() { pickingResume = false; }
    @Override protected void handleOnDestroy() { destroyed = true; stopModel(); getActivity().runOnUiThread(this::destroyBrowser); worker.shutdown(); }
}
