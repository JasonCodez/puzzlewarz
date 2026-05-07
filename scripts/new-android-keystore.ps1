param(
  [string]$KeystorePath = ".\android\puzzlewarz-upload-keystore.jks",
  [string]$Alias = "puzzlewarz-upload",
  [string]$StorePass,
  [string]$KeyPass,
  [string]$DistinguishedName = "CN=Puzzle Warz, OU=Mobile, O=Puzzle Warz, L=Unknown, S=Unknown, C=US",
  [int]$ValidityDays = 9125
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

$keystoreDirectory = Split-Path -Parent $resolvedKeystorePath
if ($keystoreDirectory) {
  New-Item -ItemType Directory -Force -Path $keystoreDirectory | Out-Null
}

if (-not $StorePass) {
  $storePassFirst = ConvertTo-PlainText (Read-Host -Prompt "Enter a new keystore password (input hidden)" -AsSecureString)
  if (-not $storePassFirst) {
    Fail "Keystore password cannot be empty."
  }

  $storePassSecond = ConvertTo-PlainText (Read-Host -Prompt "Confirm the keystore password (input hidden)" -AsSecureString)
  if ($storePassFirst -ne $storePassSecond) {
    Fail "Keystore password confirmation did not match."
  }

  $StorePass = $storePassFirst
}

if (-not $KeyPass) {
  $KeyPass = $StorePass
}

$arguments = @(
  "-genkeypair",
  "-v",
  "-keystore", $resolvedKeystorePath,
  "-alias", $Alias,
  "-keyalg", "RSA",
  "-keysize", "2048",
  "-validity", $ValidityDays,
  "-dname", $DistinguishedName
  "-storepass", $StorePass,
  "-keypass", $KeyPass
)

& $keytoolPath @arguments
if ($LASTEXITCODE -ne 0) {
  Fail "keytool failed while creating the keystore."
}

Write-Host "Keystore created at: $resolvedKeystorePath"
Write-Host "Alias: $Alias"
Write-Host "Next: run .\scripts\get-android-keystore-sha256.ps1 -KeystorePath `"$resolvedKeystorePath`" -Alias `"$Alias`""