package com.coldcaptimer.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LiveStatusPlugin.class); // plugins must be registered before super.onCreate
        registerPlugin(AlarmsPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        AlarmReceiver.stopRinging(this); // opening the app silences a ringing alarm
    }
}
