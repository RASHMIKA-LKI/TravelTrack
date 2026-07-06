# install-to-all.ps1
# Helper script to deploy the release APK to all USB-connected Android devices simultaneously.

$AdbPath = "C:\Users\Ishan\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$RelativeApkPath = "android\app\build\outputs\apk\release\app-release.apk"
$PackageName = "com.traveltrack"

# Resolve absolute path to the APK
$ApkPath = Resolve-Path $RelativeApkPath -ErrorAction SilentlyContinue
if ($null -eq $ApkPath) {
    $ApkPath = Join-Path $PSScriptRoot $RelativeApkPath
} else {
    $ApkPath = $ApkPath.Path
}

if (-not (Test-Path $AdbPath)) {
    Write-Host "Error: ADB not found at $AdbPath. Please make sure Android SDK is installed." -ForegroundColor Red
    exit
}

if (-not (Test-Path $ApkPath)) {
    Write-Host "Error: APK not found at $ApkPath. Please run a release build first." -ForegroundColor Red
    exit
}

Write-Host "Scanning for connected Android devices..." -ForegroundColor Cyan
$DevicesList = & $AdbPath devices
$Devices = @()

foreach ($line in $DevicesList) {
    if ($line -match "\bdevice\b") {
        $devId = $line.Split("`t")[0].Trim()
        $Devices += $devId
    }
}

if ($Devices.Count -eq 0) {
    Write-Host "Warning: No devices found! Make sure both phones are connected to the PC." -ForegroundColor Yellow
    exit
}

Write-Host "Found $($Devices.Count) device(s):" -ForegroundColor Green
foreach ($Device in $Devices) {
    Write-Host "  - $Device" -ForegroundColor Yellow
}

Write-Host "`nUninstalling old version of the app first to prevent conflicts..." -ForegroundColor Cyan
foreach ($Device in $Devices) {
    Write-Host "Removing $PackageName from $Device..."
    # Safe to ignore errors if the app was not previously installed
    & $AdbPath -s $Device uninstall $PackageName | Out-Null
}

Write-Host "`nDeploying fresh APK to all devices in parallel..." -ForegroundColor Cyan
Write-Host "Using APK: $ApkPath" -ForegroundColor DarkGray

# Run installations in parallel background jobs
$Jobs = foreach ($Device in $Devices) {
    Start-Job -ScriptBlock {
        param($adb, $dev, $apk)
        & $adb -s $dev install -r $apk
    } -ArgumentList $AdbPath, $Device, $ApkPath
}

# Wait for all installations to complete
$Jobs | Wait-Job | Out-Null

Write-Host "`nClean installation finished on all devices." -ForegroundColor Green
$Jobs | Receive-Job
$Jobs | Remove-Job
