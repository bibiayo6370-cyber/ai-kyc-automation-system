param(
  [Parameter()]
  [ValidateRange(1, 999)]
  [int]$ExpectedCount = 27
)

$ErrorActionPreference = "Stop"

Write-Host "Expected screenshot count: $ExpectedCount"
function Get-Sha256Hash {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $sha256 =
    [System.Security.Cryptography.SHA256]::Create()

  $fileStream =
    [System.IO.File]::OpenRead($Path)

  try {
    $hashBytes =
      $sha256.ComputeHash(
        $fileStream
      )

    return (
      [System.BitConverter]::ToString(
        $hashBytes
      )
    ).Replace("-", "")
  }
  finally {
    $fileStream.Dispose()
    $sha256.Dispose()
  }
}

# tests/ is inside backend/, so move up twice to reach repository root.
$backendDirectory = Split-Path $PSScriptRoot -Parent
$repositoryRoot = Split-Path $backendDirectory -Parent

$evidenceDirectory = Join-Path $repositoryRoot "docs/screenshots/sprint-4"
$reportDirectory = Join-Path $repositoryRoot "docs/reports/sprint-4"
$reportPath = Join-Path $reportDirectory "sprint-4-evidence-register.md"

<# Write-Host "Evidence directory: $evidenceDirectory"
Write-Host "Report directory: $reportDirectory" #>

if (-not (Test-Path $evidenceDirectory)) {
  throw ("Sprint 4 evidence directory was not found: " + $evidenceDirectory)
}

New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null

$imageFiles = Get-ChildItem -Path $evidenceDirectory -File | Where-Object {
  $_.Extension -match "^\.(png|jpg|jpeg)$"
}

$records = foreach ($file in $imageFiles) {
  $nameMatch = [regex]::Match(
    $file.Name,
    "^(?<number>\d{2})-(?<description>.+)\.(?<extension>png|jpg|jpeg)$",
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )

$hash = Get-Sha256Hash -Path $file.FullName

  if ($nameMatch.Success) {
    $description = $nameMatch.Groups["description"].Value -replace "[_-]+", " "

    [PSCustomObject]@{
      Number      = [int]$nameMatch.Groups["number"].Value
      FileName    = $file.Name
      Description = $description
      SizeKB      = [Math]::Round($file.Length / 1KB, 1)
      Hash        = $hash
      ValidName   = $true
    }
  }
  else {
    [PSCustomObject]@{
      Number      = $null
      FileName    = $file.Name
      Description = "Invalid filename"
      SizeKB      = [Math]::Round($file.Length / 1KB, 1)
      Hash        = $hash
      ValidName   = $false
    }
  }
}

$validRecords = @(
  $records | Where-Object { $_.ValidName } | Sort-Object Number
)

$invalidRecords = @(
  $records | Where-Object { -not $_.ValidName }
)

$duplicateNumbers = @(
  $validRecords | Group-Object Number | Where-Object { $_.Count -gt 1 }
)

$duplicateHashes = @(
  $records | Group-Object Hash | Where-Object { $_.Count -gt 1 }
)

$presentNumbers = @(
  $validRecords | Select-Object -ExpandProperty Number -Unique
)

$missingNumbers = @(
  1..$ExpectedCount | Where-Object { $_ -notin $presentNumbers }
)

$unexpectedNumbers = @(
  $presentNumbers | Where-Object { $_ -lt 1 -or $_ -gt $ExpectedCount }
)

$reportLines = [System.Collections.Generic.List[string]]::new()

$reportLines.Add("# Sprint 4 Evidence Register")
$reportLines.Add("")
$reportLines.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$reportLines.Add("")
$reportLines.Add("- Expected sequence: 01-$('{0:D2}' -f $ExpectedCount)")
$reportLines.Add("- Image files discovered: $($records.Count)")
$reportLines.Add("- Valid numbered files: $($validRecords.Count)")
$reportLines.Add("")
$reportLines.Add("## Evidence Inventory")
$reportLines.Add("")
$reportLines.Add("| No. | Filename | Description | Size | SHA-256 |")
$reportLines.Add("|---:|---|---|---:|---|")

foreach ($record in $validRecords) {
  $shortHash = $record.Hash.Substring(0, 12)
  $safeFileName = $record.FileName -replace "\|", "\|"
  $safeDescription = $record.Description -replace "\|", "\|"

  $reportLines.Add(
    "| $('{0:D2}' -f $record.Number) | $safeFileName | $safeDescription | $($record.SizeKB) KB | ``$shortHash`` |"
  )
}

$reportLines.Add("")
$reportLines.Add("## Validation Summary")
$reportLines.Add("")

if ($missingNumbers.Count -eq 0) {
  $reportLines.Add("- Number sequence: Complete")
}
else {
  $formattedMissingNumbers = $missingNumbers | ForEach-Object { "{0:D2}" -f $_ }
  $reportLines.Add("- Missing numbers: " + ($formattedMissingNumbers -join ", "))
}

if ($duplicateNumbers.Count -eq 0) {
  $reportLines.Add("- Duplicate sequence numbers: None")
}
else {
  foreach ($duplicateGroup in $duplicateNumbers) {
    $duplicateFileNames = $duplicateGroup.Group.FileName -join ", "
    $reportLines.Add("- Duplicate number $('{0:D2}' -f [int]$duplicateGroup.Name): $duplicateFileNames")
  }
}

if ($duplicateHashes.Count -eq 0) {
  $reportLines.Add("- Exact duplicate file content: None")
}
else {
  foreach ($duplicateHashGroup in $duplicateHashes) {
    $duplicateFileNames = $duplicateHashGroup.Group.FileName -join ", "
    $reportLines.Add("- Duplicate content: $duplicateFileNames")
  }
}

if ($invalidRecords.Count -eq 0) {
  $reportLines.Add("- Invalid filenames: None")
}
else {
  foreach ($invalidRecord in $invalidRecords) {
    $reportLines.Add("- Invalid filename: " + $invalidRecord.FileName)
  }
}

if ($unexpectedNumbers.Count -eq 0) {
  $reportLines.Add("- Numbers outside expected range: None")
}
else {
  $reportLines.Add("- Numbers outside expected range: " + ($unexpectedNumbers -join ", "))
}

$reportLines.Add("")
$reportLines.Add("## Evidence Reuse Policy")
$reportLines.Add("")
$reportLines.Add("Security behaviours already demonstrated in earlier sprint evidence are referenced in the Sprint 4 report rather than captured again.")

$reportLines | Set-Content -Path $reportPath -Encoding UTF8

$hasErrors = $missingNumbers.Count -gt 0 -or
  $duplicateNumbers.Count -gt 0 -or
  $duplicateHashes.Count -gt 0 -or
  $invalidRecords.Count -gt 0 -or
  $unexpectedNumbers.Count -gt 0 -or
  $validRecords.Count -ne $ExpectedCount

Write-Host ""

if ($missingNumbers.Count -eq 0) {
  Write-Host ("PASS: Screenshot sequence 01-" + ('{0:D2}' -f $ExpectedCount) + " is complete")
}
else {
  Write-Host ("FAIL: Missing screenshot numbers: " + ($missingNumbers -join ", "))
}

if ($duplicateNumbers.Count -eq 0) {
  Write-Host "PASS: No duplicate sequence numbers detected"
}
else {
  Write-Host "FAIL: Duplicate sequence numbers detected"
}

if ($duplicateHashes.Count -eq 0) {
  Write-Host "PASS: No exact duplicate screenshot content detected"
}
else {
  Write-Host "FAIL: Exact duplicate screenshot content detected"
  foreach ($duplicateHashGroup in $duplicateHashes) {
    Write-Host ("  " + ($duplicateHashGroup.Group.FileName -join ", "))
  }
}

if ($invalidRecords.Count -eq 0) {
  Write-Host "PASS: All screenshot filenames are valid"
}
else {
  Write-Host "FAIL: Invalid screenshot filenames detected"
  foreach ($invalidRecord in $invalidRecords) {
    Write-Host ("  " + $invalidRecord.FileName)
  }
}

Write-Host ("Evidence register created: " + $reportPath)
Write-Host ""

if ($hasErrors) {
  Write-Host "SPRINT 4 EVIDENCE AUDIT FAILED"
  exit 1
}

Write-Host "SPRINT 4 EVIDENCE AUDIT PASSED"