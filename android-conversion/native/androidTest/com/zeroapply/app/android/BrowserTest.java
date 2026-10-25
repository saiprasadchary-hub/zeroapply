package com.zeroapply.app.android;

import static org.junit.Assert.*;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.net.ServerSocket;
import java.net.Socket;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class BrowserTest {
    @Test public void websiteUrlValidation() {
        assertTrue(PhoneAgentPlugin.webUrl("https://example.com/login"));
        assertTrue(PhoneAgentPlugin.webUrl("http://127.0.0.1:8080/"));
        assertFalse(PhoneAgentPlugin.webUrl("javascript:alert(1)"));
        assertFalse(PhoneAgentPlugin.webUrl("file:///sdcard/private"));
        assertFalse(PhoneAgentPlugin.webUrl("https://user:password@example.com/"));
        assertFalse(PhoneAgentPlugin.webUrl("intent://example.com/"));
    }
    @Test public void realBrowserLoginRedirectCookiesAndPopup() throws Exception {
        android.app.Instrumentation instrument = InstrumentationRegistry.getInstrumentation();
        android.content.Context context = instrument.getTargetContext();
        MainActivity app = (MainActivity)instrument.startActivitySync(context.getPackageManager().getLaunchIntentForPackage(context.getPackageName()));
        try (ServerSocket server = new ServerSocket(0)) {
            Thread fixture = new Thread(() -> {
                while (!server.isClosed()) {
                    try (Socket socket = server.accept()) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                        String request = reader.readLine(); String path = request.split(" ")[1].split("\\?")[0]; String line; boolean cookie = false;
                        while ((line = reader.readLine()) != null && !line.isEmpty()) if (line.startsWith("Cookie:") && line.contains("session=logged-in")) cookie = true;
                        String headers = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n";
                        String body;
                        if (path.equals("/login")) { headers = "HTTP/1.1 302 Found\r\nSet-Cookie: session=logged-in; Path=/; HttpOnly; Max-Age=3600\r\nLocation: http://localhost:" + server.getLocalPort() + "/redirect\r\n"; body = ""; }
                        else if (path.equals("/redirect")) { headers = "HTTP/1.1 302 Found\r\nLocation: http://127.0.0.1:" + server.getLocalPort() + "/account\r\n"; body = ""; }
                        else if (path.equals("/popup")) body = "<title>Login popup</title><button onclick=\"window.opener.document.title='Popup completed';window.close()\">Complete</button>";
                        else if (path.equals("/account")) body = "<title>" + (cookie ? "Signed in" : "Signed out") + "</title><p>Account</p>";
                        else body = "<title>Browser fixture</title><form action='/login'><input name='email'><input name='password' type='password'><button>Sign in</button></form><button onclick=\"window.open('/popup','login')\">Popup</button>";
                        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                        socket.getOutputStream().write((headers + "Content-Length: " + bytes.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.UTF_8)); socket.getOutputStream().write(bytes);
                    } catch (Exception error) { if (!server.isClosed()) throw new RuntimeException(error); }
                }
            }, "browser-login-fixture"); fixture.setDaemon(true); fixture.start();
            awaitApp(app);
            String url = "http://127.0.0.1:" + server.getLocalPort();
            command(app, "openBrowser", "{url:'" + url + "/'}");
            command(app, "setBrowserBounds", "{left:0,top:150,width:400,height:500,viewport:400,visible:true}");
            awaitTitle(app, "Browser fixture");
            assertEquals("Websites must not receive the native app bridge", "true", pageScript(app, "typeof Capacitor === 'undefined' && typeof zeroApply === 'undefined' && typeof androidBridge === 'undefined'"));
            pageScript(app, "document.querySelector('input[name=email]').value='test@example.com';document.querySelector('input[name=password]').value='fixture';document.querySelector('form').submit();true");
            awaitTitle(app, "Signed in");
            command(app, "closeLinkedIn", "{}");
            command(app, "openBrowser", "{url:'" + url + "/account'}"); awaitTitle(app, "Signed in");
            command(app, "openBrowser", "{url:'" + url + "/'}"); awaitTitle(app, "Browser fixture");
            pageScript(app, "window.open('/popup','login');true"); awaitTitle(app, "Login popup");
            pageScript(app, "document.querySelector('button').click();true"); awaitTitle(app, "Popup completed");
            command(app, "setBrowserBounds", "{visible:false,viewport:400}");
            java.lang.reflect.Field pane = PhoneAgentPlugin.class.getDeclaredField("browserPane"); pane.setAccessible(true);
            AtomicReference<Integer> visibility = new AtomicReference<>();
            instrument.runOnMainSync(() -> { try { visibility.set(((android.view.View)pane.get(plugin(app))).getVisibility()); } catch (Exception error) { throw new RuntimeException(error); } });
            assertEquals("Tab changes must hide the native web page", Integer.valueOf(android.view.View.GONE), visibility.get());
        } finally { command(app, "closeLinkedIn", "{}"); instrument.runOnMainSync(app::finish); }
    }
    private static PhoneAgentPlugin plugin(MainActivity app) { return (PhoneAgentPlugin)app.getBridge().getPlugin("ZeroApplyPhoneAgent").getInstance(); }
    private static WebView browser(MainActivity app) throws Exception { java.lang.reflect.Field field = PhoneAgentPlugin.class.getDeclaredField("browser"); field.setAccessible(true); return (WebView)field.get(plugin(app)); }
    private static String script(MainActivity app, boolean remote, String js) throws Exception {
        CountDownLatch latch = new CountDownLatch(1); AtomicReference<String> result = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            try { WebView view = remote ? browser(app) : app.getBridge().getWebView(); view.evaluateJavascript(js, value -> { result.set(value); latch.countDown(); }); }
            catch (Exception error) { throw new RuntimeException(error); }
        }); assertTrue(latch.await(10, TimeUnit.SECONDS)); return result.get();
    }
    private static String pageScript(MainActivity app, String js) throws Exception { return script(app, true, js); }
    private static void awaitApp(MainActivity app) throws Exception {
        for (int i = 0; i < 60; i++) { if ("true".equals(script(app, false, "typeof window.Capacitor?.nativePromise === 'function' && !!document.getElementById('root')?.childElementCount"))) return; Thread.sleep(500); }
        fail("App interface did not render");
    }
    private static void command(MainActivity app, String method, String options) throws Exception {
        script(app, false, "window.__browserTest=null;Capacitor.nativePromise('ZeroApplyPhoneAgent','"+method+"',"+options+").then(()=>window.__browserTest='ok').catch(e=>window.__browserTest=String(e));true");
        for (int i = 0; i < 30; i++) { String result = script(app, false, "window.__browserTest"); if (!"null".equals(result)) { assertEquals("Native browser command " + method, "\"ok\"", result); return; } Thread.sleep(100); }
        fail("Native browser command timed out: " + method);
    }
    private static void awaitTitle(MainActivity app, String title) throws Exception {
        for (int i = 0; i < 100; i++) { if (("\""+title+"\"").equals(pageScript(app, "document.title"))) return; Thread.sleep(100); }
        fail("Page title expected " + title + " got " + pageScript(app, "document.title"));
    }
}
