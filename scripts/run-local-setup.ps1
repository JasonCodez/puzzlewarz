<#
Runs a local Postgres container, waits for readiness, runs Prisma generate,
migrate dev, and seed.

Usage (PowerShell elevated):
  cd D:\projects\puzzlewarz
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
  .\scripts\run-local-setup.ps1
#>

param(
  [System.Management.Automation.PSCredential]$PostgresCredential,
  [string]$PostgresContainerName = "local-postgres",
  [int]$PostgresPort = 5432
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

Write-Host "== run-local-setup: starting =="

if (-not $PostgresCredential) {
  $defaultSecret = ConvertTo-SecureString "devpass" -AsPlainText -Force
  $PostgresCredential = [System.Management.Automation.PSCredential]::new("postgres", $defaultSecret)
}

$postgresUserName = $PostgresCredential.UserName
$postgresPasswordPlainText = ConvertTo-PlainText $PostgresCredential.Password

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker CLI not found. Ensure Docker Desktop is installed and running."
}

try {
  $existingContainer = docker ps -a --filter "name=$PostgresContainerName" --format "{{.Names}}" |
    Where-Object { $_ -eq $PostgresContainerName }
}
catch {
  Fail "Failed to query docker containers: $_"
}

if ($existingContainer) {
  Write-Host "Removing existing container $PostgresContainerName..."
  docker rm -f $PostgresContainerName | Out-Null
}

Write-Host "Starting Postgres container ($PostgresContainerName)..."
docker run -d --name $PostgresContainerName -e POSTGRES_USER=$postgresUserName -e POSTGRES_PASSWORD=$postgresPasswordPlainText -p ${PostgresPort}:5432 postgres:15 | Out-Null

Write-Host "Waiting for Postgres to accept connections (pg_isready) inside container $PostgresContainerName..."
$startupTimeoutSeconds = 180
$waitedSeconds = 0
while ($true) {
  docker exec $PostgresContainerName pg_isready -U $postgresUserName -d postgres > $null 2>&1
  if ($LASTEXITCODE -eq 0) {
    break
  }

  Start-Sleep -Seconds 1
  $waitedSeconds += 1
  if ($waitedSeconds -ge $startupTimeoutSeconds) {
    Fail "Timed out waiting for Postgres to be ready (pg_isready)."
  }
}

Write-Host "Postgres is ready."

$env:DATABASE_URL = "postgresql://${postgresUserName}:${postgresPasswordPlainText}@127.0.0.1:${PostgresPort}/postgres?schema=public"
Write-Host "DATABASE_URL set for the current session. Value hidden for security."

Write-Host "Running: npx prisma generate"
npx prisma generate
if ($LASTEXITCODE -ne 0) {
  Fail "prisma generate failed (exit $LASTEXITCODE)"
}

Write-Host "Running: npx prisma migrate dev --name init"
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
  Fail "prisma migrate dev failed (exit $LASTEXITCODE)"
}

Write-Host "Running: npm run seed"
npm run seed
if ($LASTEXITCODE -ne 0) {
  Fail "npm run seed failed (exit $LASTEXITCODE)"
}

Write-Host "== run-local-setup: completed successfully =="
Write-Host "Next steps (optional):"
Write-Host " - Inspect prisma/migrations, then commit them: git add prisma/migrations prisma/schema.prisma && git commit -m 'chore(prisma): add postgres migrations'"
Write-Host " - Deploy to Render and run 'npx prisma migrate deploy' + seed on Render"
