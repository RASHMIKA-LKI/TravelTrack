# install-to-all.ps1
# Script to deploy the APK to all connected Android devices simultaneously via ADB debugging.

# 1. Resolve ADB executable path (System PATH or Android SDK default)
$AdbPath = if (Get-Command adb -ErrorAction SilentlyContinue) { "adb" } else { "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" }
$PackageName = "com.traveltrack"

if (-not (Get-Command $AdbPath -ErrorAction SilentlyContinue) -and -not (Test-Path $AdbPath)) {
    Write-Host "Error: ADB not found! Ensure Android SDK / platform-tools is installed and added to PATH." -ForegroundColor Red
    exit
}

# 2. Resolve APK file path (Checks Root TravelTrack.apk, Debug APK, or Release APK)
$CandidateApks = @(
    (Join-Path $PSScriptRoot "TravelTrack.apk"),
    (Join-Path $PSScriptRoot "android\app\build\outputs\apk\debug\app-debug.apk"),
    (Join-Path $PSScriptRoot "android\app\build\outputs\apk\release\app-release.apk")
)

$ApkPath = $null
foreach ($cand in $CandidateApks) {
    if (Test-Path $cand) {
        $ApkPath = $cand
        break
    }
}

if ($null -eq $ApkPath) {
    Write-Host "Error: No APK found! Build debug APK using 'npx expo run:android' or place 'TravelTrack.apk' in project root." -ForegroundColor Red
    exit
}

Write-Host "Using APK: $ApkPath" -ForegroundColor Cyan

# 3. Detect connected Android devices
Write-Host "Scanning for ADB-connected devices..." -ForegroundColor Cyan
$RawDevices = & $AdbPath devices
$Devices = @()

foreach ($line in $RawDevices) {
    if ($line -match "\bdevice\b" -and -not ($line -match "List of devices attached")) {
        $devId = $line.Split("`t")[0].Trim()
        if ($devId) { $Devices += $devId }
    }
}

if ($Devices.Count -eq 0) {
    Write-Host "Error: No connected devices found! Enable 'USB Debugging' on both phones and connect via USB or Wi-Fi debugging." -ForegroundColor Yellow
    exit
}

Write-Host "Found $($Devices.Count) device(s):" -ForegroundColor Green
foreach ($Device in $Devices) {
    Write-Host "  [+] Device ID: $Device" -ForegroundColor Yellow
}

# 4. Uninstall previous build to prevent signature/state conflicts
Write-Host "`nUninstalling old version ($PackageName)..." -ForegroundColor Cyan
foreach ($Device in $Devices) {
    Write-Host "Removing from $Device..." -ForegroundColor Gray
    & $AdbPath -s $Device uninstall $PackageName | Out-Null
}

# 5. Install APK across all devices in parallel
Write-Host "`nInstalling APK to all connected devices simultaneously..." -ForegroundColor Cyan

$Jobs = foreach ($Device in $Devices) {
    Start-Job -ScriptBlock {
        param($adb, $dev, $apk)
        & $adb -s $dev install -r -g $apk
    } -ArgumentList $AdbPath, $Device, $ApkPath
}

$Jobs | Wait-Job | Out-Null
$Results = $Jobs | Receive-Job
$Jobs | Remove-Job

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host $Results

