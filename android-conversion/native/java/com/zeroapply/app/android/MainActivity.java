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
    }
    void chooseResume(ValueCallback<Uri[]> callback) {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = callback;
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        try { startActivityForResult(Intent.createChooser(intent, "Choose your resume"), FILE_REQUEST); }
        catch (RuntimeException error) { fileCallback.onReceiveValue(null); fileCallback = null; }
    }
    void cancelResumeChoice() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }
}
