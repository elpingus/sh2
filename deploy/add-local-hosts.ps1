$hostsPath = 'C:\Windows\System32\drivers\etc\hosts'
$entries = @(
  '127.0.0.1 steamhoursnet.xyz',
  '127.0.0.1 www.steamhoursnet.xyz'
)

$existing = [System.IO.File]::ReadAllText($hostsPath)
$toAppend = New-Object System.Collections.Generic.List[string]

foreach ($entry in $entries) {
  $escapedEntry = [Regex]::Escape($entry)
  if ($existing -notmatch "(?m)^$escapedEntry$") {
    $toAppend.Add($entry)
  }
}

if ($toAppend.Count -gt 0) {
  $prefix = ''
  if ($existing.Length -gt 0 -and -not $existing.EndsWith([Environment]::NewLine)) {
    $prefix = [Environment]::NewLine
  }

  $payload = $prefix + ($toAppend -join [Environment]::NewLine) + [Environment]::NewLine
  [System.IO.File]::AppendAllText($hostsPath, $payload, [System.Text.Encoding]::ASCII)
}

Write-Host 'Hosts entries added.'
