package com.coldcaptimer.app;

import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Bridge between the web app and LiveStatusService. */
@CapacitorPlugin(name = "LiveStatus")
public class LiveStatusPlugin extends Plugin {

    /** start({ phases: [...] }): shows/updates the persistent notification. */
    @PluginMethod
    public void start(PluginCall call) {
        JSArray phases = call.getArray("phases");
        if (phases == null) {
            call.reject("phases is required");
            return;
        }
        Intent intent = new Intent(getContext(), LiveStatusService.class).putExtra(LiveStatusService.EXTRA_PHASES, phases.toString());
        try {
            ContextCompat.startForegroundService(getContext(), intent);
            call.resolve();
        } catch (RuntimeException e) {
            call.reject("Could not start the live notification: " + e.getMessage());
        }
    }

    /** stop(): removes the persistent notification. */
    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), LiveStatusService.class));
        call.resolve();
    }
}
