package io.dragonarena.preview;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.content.res.AssetManager;
import android.net.Uri;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Offline, fullscreen Android preview: serves packaged game assets from an HTTPS origin. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ENTRY = "https://" + HOST + "/assets/index.html";
    private WebView game;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setSystemUiVisibility(5894 | 1024 | 512);
        getWindow().setNavigationBarColor(Color.BLACK);
        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(8, 5, 41));
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        game.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        WebSettings web = game.getSettings();
        web.setJavaScriptEnabled(true);
        web.setDomStorageEnabled(true);
        web.setAllowFileAccess(false);
        web.setAllowContentAccess(false);
        web.setAllowFileAccessFromFileURLs(false);
        web.setAllowUniversalAccessFromFileURLs(false);
        web.setMediaPlaybackRequiresUserGesture(false);
        web.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setDefaultTextEncodingName("UTF-8");
        web.setUserAgentString(web.getUserAgentString() + " DragonArenaAndroidPreview/0.5.0");
        game.setWebChromeClient(new WebChromeClient());
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())) return null;
                String path = uri.getPath();
                if (path == null || !path.startsWith("/assets/")) return missing();
                String asset = path.substring("/assets/".length());
                if (asset.contains("..") || asset.startsWith("/")) return missing();
                if (asset.isEmpty()) asset = "index.html";
                try {
                    InputStream input = getAssets().open("www/" + asset, AssetManager.ACCESS_STREAMING);
                    Map<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-cache");
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(mime(asset), mime(asset).startsWith("text/") || asset.endsWith(".json") ? "UTF-8" : null, 200, "OK", headers, input);
                } catch (IOException missing) { return missing(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !("https".equals(uri.getScheme()) && HOST.equals(uri.getHost()));
            }
        });
        setContentView(game);
        game.loadUrl(ENTRY);
    }
    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new java.io.ByteArrayInputStream("Asset not found".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".mjs") || p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".glb")) return "model/gltf-binary";
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".gif")) return "image/gif";
        return "application/octet-stream";
    }
    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && game != null) {
            game.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));", null);
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
    @Override public void onPause() { super.onPause(); if (game != null) game.onPause(); }
    @Override public void onResume() { super.onResume(); if (game != null) game.onResume(); }
    @Override public void onDestroy() { if (game != null) { game.destroy(); game = null; } super.onDestroy(); }
}
