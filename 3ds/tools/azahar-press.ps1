# Sends one key press to the Azahar emulator window (test harness for the 3DS build).
# Default Azahar keys: A=A, B=S, Up=T, Down=G, Left=F, Right=H, SELECT=N, START=M.
# Safety: keybd_event types into whatever window has focus. If Azahar did not actually get focus
# (Windows refuses focus changes while someone is using the PC), abort instead of typing elsewhere.
param([int]$vk, [int]$holdMs = 150, [string]$proc = "azahar")
Add-Type @"
using System; using System.Runtime.InteropServices;
public class K {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint code, uint type);
}
"@
$h = (Get-Process $proc -ErrorAction Stop | ? MainWindowHandle -ne 0 | Select -First 1).MainWindowHandle
[K]::SetForegroundWindow($h) | Out-Null; Start-Sleep -Milliseconds 300
if ([K]::GetForegroundWindow() -ne $h) { throw "Azahar is not the foreground window; not sending keys (someone may be using the PC)." }
$sc = [byte][K]::MapVirtualKey($vk, 0)
[K]::keybd_event([byte]$vk, $sc, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds $holdMs
[K]::keybd_event([byte]$vk, $sc, 2, [UIntPtr]::Zero)
