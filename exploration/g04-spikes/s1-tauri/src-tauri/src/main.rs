// G0.4 S1 Tauri probe
// EXPLORATION / NOT CANONICAL ARCHITECTURE / NOT PRODUCTION COMMITMENT
use std::{fs::OpenOptions, io::Write, thread, time::Duration};
use tauri::{Manager, WindowEvent};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

fn log(event: &str, extra: &str) {
    let path = std::env::var("SPIKE_LOG").unwrap_or_else(|_| {
        std::env::temp_dir().join("g04-tauri-spike.log").to_string_lossy().to_string()
    });
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(f, "{}|{}", event, extra);
    }
}

fn restore(app: &tauri::AppHandle, source: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        let visible = window.is_visible().unwrap_or(false);
        log("restore", &format!("source={source};visible={visible}"));
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let icon = tauri::image::Image::new_owned(vec![0x33u8; 16 * 16 * 4], 16, 16);
            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("G0.4 Tauri Spike")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        restore(tray.app_handle(), "click");
                    }
                })
                .build(app)?;
            log("tray-created", "ok=true");

            if std::env::var("SPIKE_SELF_TEST").ok().as_deref() == Some("1") {
                let handle = app.handle().clone();
                thread::spawn(move || {
                    thread::sleep(Duration::from_millis(900));
                    let Some(window) = handle.get_webview_window("main") else {
                        log("selftest-fail", "step=no-main-window");
                        handle.exit(31);
                        return;
                    };
                    log("selftest-start", &format!("exe={:?}", std::env::current_exe()));

                    if let Err(err) = window.close() {
                        log("selftest-fail", &format!("step=close;err={err}"));
                        handle.exit(32);
                        return;
                    }
                    thread::sleep(Duration::from_millis(500));
                    if window.is_visible().unwrap_or(true) {
                        log("selftest-fail", "step=close-to-hide;visible=true");
                        handle.exit(33);
                        return;
                    }
                    log("close-hidden", "visible=false");

                    // Invoke the same restore function as the tray click handler.
                    restore(&handle, "programmatic-shared-handler");
                    thread::sleep(Duration::from_millis(500));
                    if !window.is_visible().unwrap_or(false) {
                        log("selftest-fail", "step=restore;visible=false");
                        handle.exit(34);
                        return;
                    }
                    log("selftest-pass", "tray-created=true;close-hide=true;restore=true;exit=true");
                    handle.exit(0);
                });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
                let visible = window.is_visible().unwrap_or(true);
                log("close-request-hidden", &format!("visible={visible}"));
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running G0.4 Tauri spike");
}
