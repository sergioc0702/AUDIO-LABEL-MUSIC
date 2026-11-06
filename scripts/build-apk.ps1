param(
    [switch]$UseDebugSigningForPersonalRelease
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$javaHome = 'C:\Program Files\Android\Android Studio\jbr'
$androidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$gradleWrapper = Join-Path $androidRoot 'gradlew.bat'
$builtApk = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
$debugApk = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$destinationApk = Join-Path $projectRoot 'MiMusica.apk'
$jar = Join-Path $javaHome 'bin\jar.exe'

if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe'))) {
    throw "No se encontró Java en '$javaHome'. Instala JDK o actualiza la ruta en scripts\build-apk.ps1."
}

if (-not (Test-Path -LiteralPath (Join-Path $androidSdk 'platforms'))) {
    throw "No se encontró Android SDK en '$androidSdk'. Configura ANDROID_HOME y actualiza scripts\build-apk.ps1."
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:PATH = "$(Join-Path $javaHome 'bin');$(Join-Path $androidSdk 'platform-tools');$env:PATH"

Push-Location $androidRoot
try {
    $gradleArguments = @(
        'assembleRelease',
        '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a'
    )
    if ($UseDebugSigningForPersonalRelease) {
        $gradleArguments += '-PuseDebugSigningForPersonalRelease=true'
    }

    & $gradleWrapper @gradleArguments
    if ($LASTEXITCODE -ne 0) {
        throw "La compilación de Android falló con código $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $builtApk)) {
    throw "Gradle terminó sin error, pero no se encontró el APK en '$builtApk'."
}

$apkEntries = & $jar tf $builtApk
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo inspeccionar el APK generado: '$builtApk'."
}

if ($apkEntries -notcontains 'assets/index.android.bundle') {
    throw 'El APK no incluye el bundle de JavaScript y no funcionará sin Metro.'
}

$apksigner = Get-ChildItem -LiteralPath (Join-Path $androidSdk 'build-tools') `
    -Filter 'apksigner.bat' -Recurse -File |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
if (-not $apksigner) {
    throw "No se encontró apksigner en '$androidSdk\build-tools'."
}

& $apksigner verify --verbose $builtApk
if ($LASTEXITCODE -ne 0) {
    throw "La firma del APK no se pudo verificar: '$builtApk'."
}

Copy-Item -LiteralPath $builtApk -Destination $destinationApk -Force

foreach ($obsoleteApk in @($builtApk, $debugApk)) {
    if (
        (Test-Path -LiteralPath $obsoleteApk) -and
        [IO.Path]::GetFullPath($obsoleteApk) -ne
        [IO.Path]::GetFullPath($destinationApk)
    ) {
        Remove-Item -LiteralPath $obsoleteApk -Force
    }
}

$signingDirectory = Join-Path $env:LOCALAPPDATA 'MiMusicApp\signing'
if ($UseDebugSigningForPersonalRelease) {
    foreach ($obsoleteSigningFile in @(
        (Join-Path $signingDirectory 'mymusicapp-release.p12'),
        (Join-Path $signingDirectory 'release-password.dpapi')
    )) {
        if (Test-Path -LiteralPath $obsoleteSigningFile) {
            Remove-Item -LiteralPath $obsoleteSigningFile -Force
        }
    }
}

Write-Host "APK actualizado: $destinationApk"
