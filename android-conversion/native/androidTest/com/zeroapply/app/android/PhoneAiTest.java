package com.zeroapply.app.android;

import static org.junit.Assert.*;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import android.content.Context;
import java.io.File;
import java.nio.file.Files;
import java.util.concurrent.atomic.AtomicReference;
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
        Thread.sleep(2500);
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
    }
}
