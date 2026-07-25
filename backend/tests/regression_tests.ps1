Clear-Host

$scripts = @(
  "verify:risk-constants",
  "verify:risk-schema",
  "verify:watchlist",
  "verify:risk-scoring",
  "verify:risk-assessment",
  "verify:automatic-risk",
  "verify:risk-retrieval",
  "verify:risk-low",
  "verify:risk-medium",
  "verify:risk-high",
  "verify:risk-security",
  "verify:document-processing",
  "verify:name-matching",
  "verify:image-validation",
  "verify:ocr-service",
  "verify:gridfs"
)

foreach ($script in $scripts) {
  $output = & npm.cmd run $script 2>&1
  $exitCode = $LASTEXITCODE

  $lines = $output |
    ForEach-Object {
      $_.ToString()
    } |
    Where-Object {
      $_.Trim().Length -gt 0
    }

  if ($exitCode -ne 0) {
    Write-Host "`nFAILED: $script"
    $lines | Select-Object -Last 20
    throw "Sprint 4 regression suite stopped because $script failed."
  }

  $successLine = $lines |
    Where-Object {
      $_ -match "(?i)passed|successfully"
    } |
    Select-Object -Last 1

  if (-not $successLine) {
    $successLine = $lines |
      Select-Object -Last 1
  }

  Write-Host "PASS [$script] :: $successLine"
}

Write-Host ""
Write-Host "ALL SPRINT 4 REGRESSION COMMANDS PASSED"