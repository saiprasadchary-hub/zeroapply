package com.zeroapply.app.android;

import static org.junit.Assert.*;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import android.content.Context;
import java.io.File;
import java.nio.file.Files;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class PhoneAiTest {
    @Test public void secureLinkedInOrigins() {
        assertTrue(PhoneAgentPlugin.linkedInUrl("https://www.linkedin.com/jobs/"));
        assertFalse(PhoneAgentPlugin.linkedInUrl("http://www.linkedin.com/jobs/"));
        assertFalse(PhoneAgentPlugin.linkedInUrl("https://linkedin.com.evil.example/"));
        assertFalse(PhoneAgentPlugin.linkedInUrl("https://evil.example/?linkedin.com"));
        assertFalse(PhoneAgentPlugin.linkedInUrl("https://user@linkedin.com/"));
        assertFalse(PhoneAgentPlugin.linkedInUrl("https://linkedin.com:444/"));
    }
    @Test public void realPhoneInferenceAndCancellation() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        File model = new File(new File(context.getFilesDir(), "models"), PhoneAgentPlugin.MODEL_FILE);
        assertEquals(PhoneAgentPlugin.MODEL_BYTES, model.length());
        android.app.Instrumentation instrument = InstrumentationRegistry.getInstrumentation();
        android.content.Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        assertNotNull(launch);
        android.app.Activity activity = instrument.startActivitySync(launch);
        long renderUntil = System.currentTimeMillis() + 30000;
        while (!"true".equals(evaluate((MainActivity) activity, "!!document.getElementById('root')?.childElementCount")) && System.currentTimeMillis() < renderUntil) Thread.sleep(500);
        assertEquals("App interface must render before startup checks", "true", evaluate((MainActivity) activity, "!!document.getElementById('root')?.childElementCount"));
        Thread.sleep(1000);
        String maps = new String(Files.readAllBytes(new File("/proc/self/maps").toPath()), StandardCharsets.UTF_8);
        assertFalse("App startup must not load native AI", maps.contains("libzeroapply_llm"));
        assertFalse("App startup must not map model weights", maps.contains(PhoneAgentPlugin.MODEL_FILE));
        instrument.runOnMainSync(activity::finish);
        LlamaNative.beginSession();
        try {
            LlamaNative.load(model.getAbsolutePath(), 2);
            String answer = new String(LlamaNative.generate("Reply with the word READY.".getBytes(StandardCharsets.UTF_8), "You are a concise assistant.".getBytes(StandardCharsets.UTF_8), 12), StandardCharsets.UTF_8);
            assertFalse("Real native model must produce text", answer.trim().isEmpty());
            System.out.println("ZeroApply on-device AI answer: " + answer);
            AtomicReference<Throwable> interrupted = new AtomicReference<>();
            Thread generation = new Thread(() -> {
                try { LlamaNative.generate("Write a long detailed explanation of software engineering.".getBytes(StandardCharsets.UTF_8), new byte[0], 200); }
                catch (Throwable error) { interrupted.set(error); }
            });
            generation.start(); Thread.sleep(100); LlamaNative.cancel(); generation.join(15000);
            assertFalse("Stop must interrupt active inference promptly", generation.isAlive());
            assertTrue("Cancellation must report a controlled error", interrupted.get() instanceof IllegalStateException);
            try {
                LlamaNative.generate("Test".getBytes(StandardCharsets.UTF_8), new byte[0], 5);
                fail("Generation must fail after Stop");
            } catch (IllegalStateException expected) { assertTrue(expected.getMessage().contains("AI is off")); }
        } finally { LlamaNative.cancel(); LlamaNative.unload(); }
        MainActivity app = (MainActivity) instrument.startActivitySync(launch);
        try {
            long until = System.currentTimeMillis() + 30000;
            while (!"true".equals(evaluate(app, "typeof window.zeroApply?.startEmbeddedLlm === 'function'")) && System.currentTimeMillis() < until) Thread.sleep(500);
            assertEquals("Phone bridge must exist in the installed app", "true", evaluate(app, "typeof window.zeroApply?.startEmbeddedLlm === 'function'"));
            evaluate(app, "window.__zeroApplyNativeTest = null; window.zeroApply.startEmbeddedLlm().then(s => window.__zeroApplyNativeTest={ready:s.isReady}).catch(e => window.__zeroApplyNativeTest={error:String(e)}); true");
            JSONObject started = awaitResult(app, 120000);
            assertTrue("Reviewed native bridge startup: " + started, started.optBoolean("ready"));
            evaluate(app, "window.__zeroApplyNativeTest=null; window.zeroApply.generateEmbeddedLlm({prompt:'Reply with READY.',systemPrompt:'Be concise.',temperature:0,maxTokens:12}).then(text=>window.__zeroApplyNativeTest={text}).catch(e=>window.__zeroApplyNativeTest={error:String(e)}); true");
            JSONObject generated = awaitResult(app, 120000);
            assertFalse("Installed app must get real AI text: " + generated, generated.optString("text").trim().isEmpty());
            evaluate(app, "window.__zeroApplyNativeTest=null; window.zeroApply.stopEmbeddedLlm().then(()=>window.zeroApply.getEmbeddedLlmStatus()).then(s=>window.__zeroApplyNativeTest={off:!s.isReady}).catch(e=>window.__zeroApplyNativeTest={error:String(e)}); true");
            assertTrue("Stop must cross the app bridge", awaitResult(app, 10000).optBoolean("off"));
            Thread.sleep(1000);
            String after = new String(Files.readAllBytes(new File("/proc/self/maps").toPath()), StandardCharsets.UTF_8);
            assertFalse("Stop must unmap model weights", after.contains(PhoneAgentPlugin.MODEL_FILE));
        } finally { instrument.runOnMainSync(app::finish); }
    }
    private static String evaluate(MainActivity activity, String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> activity.getBridge().getWebView().evaluateJavascript(script, value -> { result.set(value); latch.countDown(); }));
        assertTrue("App renderer must respond", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }
    private static JSONObject awaitResult(MainActivity activity, long timeout) throws Exception {
        long until = System.currentTimeMillis() + timeout;
        while (System.currentTimeMillis() < until) {
            String raw = evaluate(activity, "JSON.stringify(window.__zeroApplyNativeTest || null)");
            String decoded = new JSONArray("[" + raw + "]").getString(0);
            if (!"null".equals(decoded)) return new JSONObject(decoded);
            Thread.sleep(500);
        }
        throw new AssertionError("Timed out waiting for native phone AI bridge");
    }
}
