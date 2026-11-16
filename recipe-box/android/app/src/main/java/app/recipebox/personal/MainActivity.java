package app.recipebox.personal;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

/**
 * Also a share target: "Share > recipe-box" from Instagram, TikTok or a browser hands over the link as plain text. The page
 * picks it up through RecipeBoxShare.take() (on start, and whenever it is told one arrived while the app was already open).
 */
public class MainActivity extends BridgeActivity {
  private static String pending;

  private static final class ShareBridge {
    @JavascriptInterface
    public String take() {
      synchronized (MainActivity.class) {
        String t = pending;
        pending = null;
        return t == null ? "" : t;
      }
    }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().addJavascriptInterface(new ShareBridge(), "RecipeBoxShare");
    }
    remember(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    if (remember(intent) && getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('recipebox-share'))", null));
    }
  }

  private boolean remember(Intent intent) {
    if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return false;
    String text = intent.getStringExtra(Intent.EXTRA_TEXT);
    if (text == null || text.trim().isEmpty()) return false;
    synchronized (MainActivity.class) {
      pending = text.length() > 4000 ? text.substring(0, 4000) : text;
    }
    intent.setAction(Intent.ACTION_MAIN); // a recreated activity must not hand the same link over again
    return true;
  }
}
