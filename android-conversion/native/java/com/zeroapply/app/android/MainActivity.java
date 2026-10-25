package com.zeroapply.app.android;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int FILE_REQUEST = 4021;
    private ValueCallback<Uri[]> fileCallback;
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhoneAgentPlugin.class);
        super.onCreate(savedInstanceState);
        android.view.View content = findViewById(android.R.id.content);
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            androidx.core.graphics.Insets safe = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars() | androidx.core.view.WindowInsetsCompat.Type.displayCutout());
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            return insets;
        });
        androidx.core.view.ViewCompat.requestApplyInsets(content);
        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                com.getcapacitor.PluginHandle handle = getBridge().getPlugin("ZeroApplyPhoneAgent");
                if (handle != null && ((PhoneAgentPlugin)handle.getInstance()).handleBrowserBack()) return;
                setEnabled(false); getOnBackPressedDispatcher().onBackPressed(); setEnabled(true);
            }
        });
    }
    boolean chooseFile(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        cancelResumeChoice(); fileCallback = callback;
        Intent intent = params.createIntent();
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);
        try { startActivityForResult(Intent.createChooser(intent, "Choose a file"), FILE_REQUEST); return true; }
        catch (RuntimeException error) { cancelResumeChoice(); return false; }
    }
    void cancelResumeChoice() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            if (resultCode == RESULT_OK && data != null && data.getClipData() != null) {
                Uri[] files = new Uri[data.getClipData().getItemCount()];
                for (int i = 0; i < files.length; i++) files[i] = data.getClipData().getItemAt(i).getUri();
                fileCallback.onReceiveValue(files);
            } else fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }
}
