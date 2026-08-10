package com.expensetracker.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UpiPayment")
public class UpiPlugin extends Plugin {

    @PluginMethod
    public void launchUpi(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null || uriStr.trim().isEmpty()) {
            call.reject("UPI URI cannot be empty");
            return;
        }

        try {
            Uri uri = Uri.parse(uriStr.trim());
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(uri);

            // Create Android System Chooser for installed UPI apps (GPay, PhonePe, Paytm, BHIM, Cred, etc.)
            Intent chooser = Intent.createChooser(intent, "Pay with UPI");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getActivity().startActivity(chooser);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not launch UPI chooser: " + e.getMessage());
        }
    }
}
