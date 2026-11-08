param([int]$vk, [int]$holdMs = 150, [string]$proc = "azahar")
Add-Type @"
using System; using System.Runtime.InteropServices;
public class K {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint code, uint type);
}
"@
$h = (Get-Process $proc | ? MainWindowHandle -ne 0 | Select -First 1).MainWindowHandle
[K]::SetForegroundWindow($h) | Out-Null; Start-Sleep -Milliseconds 300
$sc = [byte][K]::MapVirtualKey($vk, 0)
[K]::keybd_event([byte]$vk, $sc, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds $holdMs
[K]::keybd_event([byte]$vk, $sc, 2, [UIntPtr]::Zero)
