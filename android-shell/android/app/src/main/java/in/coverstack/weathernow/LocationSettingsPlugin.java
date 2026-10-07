package in.coverstack.weathernow;

import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens Android's location settings screen.
 *
 * A geolocation call from a WebView cannot raise the system "Turn on location?"
 * dialog, so when location services are switched off the page can only say so.
 * This gives the page a way to take the reader to the screen that fixes it.
 *
 * Nothing is reported back: whether location was switched on is answered by asking
 * for a position again once the app is in front, not by a return value here.
 */
@CapacitorPlugin(name = "LocationSettings")
public class LocationSettingsPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
