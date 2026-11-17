package app.recipebox.personal;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import org.json.JSONObject;

/**
 * Also a share target. "Share > recipe-box" hands over either a link (plain text) or a video / screenshot (a file). A file is
 * copied into the app's cache first, because the sending app's permission to read it can end at any moment. The page picks the
 * result up through RecipeBoxShare.take() (on start, and whenever it is told one arrived while the app was already open).
 * take() returns JSON: {"text": "..."} or {"file": {"path": "...", "name": "...", "mime": "..."}}, or "" when nothing waits.
 */
public class MainActivity extends BridgeActivity {
  private static final long MAX_FILE_BYTES = 260L * 1024 * 1024;
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
    handle(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handle(intent);
  }

  private void announce() {
    if (getBridge() == null || getBridge().getWebView() == null) return;
    runOnUiThread(() -> getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('recipebox-share'))", null));
  }

  private void store(JSONObject json) {
    synchronized (MainActivity.class) {
      pending = json.toString();
    }
    announce();
  }

  private void handle(Intent intent) {
    if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
    String type = intent.getType() == null ? "" : intent.getType();
    intent.setAction(Intent.ACTION_MAIN); // a recreated activity must not hand the same share over again
    try {
      if (type.startsWith("video/") || type.startsWith("image/")) {
        final Uri uri = streamOf(intent);
        if (uri == null) return;
        final String mime = type;
        new Thread(() -> copyToCache(uri, mime)).start();
        return;
      }
      String text = intent.getStringExtra(Intent.EXTRA_TEXT);
      if (text == null || text.trim().isEmpty()) return;
      store(new JSONObject().put("text", text.length() > 4000 ? text.substring(0, 4000) : text));
    } catch (Exception ignored) {
      // a share that cannot be read is simply dropped
    }
  }

  @SuppressWarnings("deprecation")
  private Uri streamOf(Intent intent) {
    if (Build.VERSION.SDK_INT >= 33) return intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
    return intent.getParcelableExtra(Intent.EXTRA_STREAM);
  }

  private String displayName(Uri uri, String mime) {
    String name = null;
    try (Cursor c = getContentResolver().query(uri, new String[] {OpenableColumns.DISPLAY_NAME}, null, null, null)) {
      if (c != null && c.moveToFirst()) name = c.getString(0);
    } catch (Exception ignored) {
      // fall through to a generated name
    }
    if (name == null || name.trim().isEmpty()) name = mime.startsWith("video/") ? "shared-video.mp4" : "shared-image.jpg";
    return name.replaceAll("[^A-Za-z0-9._ -]", "_");
  }

  private void copyToCache(Uri uri, String mime) {
    try {
      String actual = getContentResolver().getType(uri);
      if (actual != null && (actual.startsWith("video/") || actual.startsWith("image/"))) mime = actual;
      File dir = new File(getCacheDir(), "shared");
      File[] old = dir.listFiles();
      if (old != null) for (File f : old) f.delete();
      dir.mkdirs();
      String name = displayName(uri, mime);
      File out = new File(dir, System.currentTimeMillis() + "-" + name);
      long total = 0;
      try (InputStream in = getContentResolver().openInputStream(uri); OutputStream os = new FileOutputStream(out)) {
        if (in == null) return;
        byte[] buf = new byte[256 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) {
          total += n;
          if (total > MAX_FILE_BYTES) {
            out.delete();
            store(new JSONObject().put("error", "That file is too large."));
            return;
          }
          os.write(buf, 0, n);
        }
      }
      store(new JSONObject().put("file", new JSONObject().put("path", out.getAbsolutePath()).put("name", name).put("mime", mime)));
    } catch (Exception e) {
      try {
        store(new JSONObject().put("error", "The shared file could not be read."));
      } catch (Exception ignored) {
        // nothing more to do
      }
    }
  }
}
