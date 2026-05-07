param(
  [string]$KeystorePath = ".\android\puzzlewarz-upload-keystore.jks",
  [string]$Alias = "puzzlewarz-upload",
  [string]$StorePass,
  [string]$KeyPass
)

function Fail($Message) {
  Write-Error $Message
  exit 1
}

function ConvertTo-PlainText([SecureString]$SecureValue) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Resolve-KeytoolPath {
  $command = Get-Command keytool -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @()
  if ($env:JAVA_HOME) {
    $candidates += (Join-Path $env:JAVA_HOME "bin\keytool.exe")
  }

  $candidates += @(
    "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  $roots = @(
    "C:\Program Files\Java",
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Zulu",
    "C:\Program Files\Amazon Corretto"
  )

  foreach ($root in $roots) {
    if (-not (Test-Path $root)) {
      continue
    }

    $match = Get-ChildItem -Path $root -Filter keytool.exe -Recurse -File -ErrorAction SilentlyContinue |
      Select-Object -First 1

    if ($match) {
      return $match.FullName
    }
  }

  return $null
}

$keytoolPath = Resolve-KeytoolPath
if (-not $keytoolPath) {
  Fail "keytool.exe was not found. Install Android Studio or a JDK 17+ first, then rerun this script."
}

$resolvedKeystorePath = if ([System.IO.Path]::IsPathRooted($KeystorePath)) {
  $KeystorePath
} else {
  Join-Path (Get-Location) $KeystorePath
}

if (-not (Test-Path $resolvedKeystorePath)) {
  Fail "Keystore not found at $resolvedKeystorePath"
}

if (-not $StorePass) {
  $StorePass = ConvertTo-PlainText (Read-Host -Prompt "Enter the keystore password for $resolvedKeystorePath (input hidden)" -AsSecureString)
  if (-not $StorePass) {
    Fail "Keystore password cannot be empty."
  }
}

$arguments = @(
  "-list",
  "-v",
  "-keystore", $resolvedKeystorePath,
  "-alias", $Alias,
  "-storepass", $StorePass
)

if ($KeyPass) {
  $arguments += @("-keypass", $KeyPass)
}

$output = & $keytoolPath @arguments 2>&1
if ($LASTEXITCODE -ne 0) {
  $output | ForEach-Object { Write-Host $_ }
  Fail "keytool failed while reading the keystore fingerprint."
}

$output | ForEach-Object { Write-Host $_ }

$sha256Line = $output | Where-Object { $_ -match "SHA256:" } | Select-Object -First 1
if ($sha256Line) {
  Write-Host ""
  Write-Host "Use this value for ANDROID_TWA_SHA256_FINGERPRINTS:" -ForegroundColor Cyan
  Write-Host ($sha256Line -replace ".*SHA256:\s*", "")
}