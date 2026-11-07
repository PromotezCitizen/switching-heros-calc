@echo off
rem Collection Idle save copier: copies data_a_*.json from an emulator (or USB phone) to a Desktop folder via adb.
rem The PowerShell part below the marker does the work. It is read from this file, nothing else is downloaded except Google platform-tools (asked first).
powershell -NoProfile -Command "$s=[IO.File]::ReadAllText('%~f0',[Text.Encoding]::UTF8); Invoke-Expression ($s -split ('#'+'PS_START'))[1]"
echo.
pause
exit /b
#PS_START
$ErrorActionPreference = 'Continue'
$gameDir = '/sdcard/Android/data/com.zilliongames.collectionidle/files'
# 앱플레이어가 adb 를 여는 흔한 포트 (블루스택 · LD플레이어 · 녹스 · MuMu · 메무)
$ports = 5555, 5556, 5557, 5558, 5559, 5565, 5575, 5585, 7555, 16384, 16416, 16448, 21503, 62001, 62025, 62026
$folderName = '컬렉션아이들 세이브'

function Say([string]$text) { Write-Host $text }

# 1. adb 찾기: PATH → 이 도구가 전에 받아 둔 곳 → (물어보고) 구글 공식 platform-tools 받기
$adb = $null
$found = Get-Command adb -ErrorAction SilentlyContinue
if ($found) { $adb = $found.Source }
if (-not $adb) {
  $toolDir = Join-Path $env:LOCALAPPDATA 'CollectionIdleSave'
  $adb = Join-Path $toolDir 'platform-tools\adb.exe'
  if (-not (Test-Path $adb)) {
    Say 'adb (안드로이드 연결 도구) 가 PC에 없어요.'
    Say '구글 공식 platform-tools (약 10MB) 를 dl.google.com 에서 받아 아래 폴더에 둘게요.'
    Say "  $toolDir"
    $answer = Read-Host '받을까요? (Y/N)'
    if ($answer -notmatch '^[Yy]') { Say '받지 않고 끝냈어요.'; return }
    New-Item -ItemType Directory -Path $toolDir -ErrorAction SilentlyContinue | Out-Null
    $zip = Join-Path $toolDir 'platform-tools.zip'
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      Invoke-WebRequest 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile $zip -UseBasicParsing
      Expand-Archive -Path $zip -DestinationPath $toolDir
      Remove-Item $zip
    } catch {
      Say "받지 못했어요: $($_.Exception.Message)"
      return
    }
    if (-not (Test-Path $adb)) { Say 'adb.exe 를 찾지 못했어요.'; return }
  }
}
Say "adb: $adb"

# 2. 앱플레이어 찾기: 흔한 포트에 붙어 보고, 게임 폴더에 저장 파일이 있는 기기를 고른다
& $adb start-server 2>&1 | Out-Null
Say '앱플레이어를 찾는 중...'
foreach ($port in $ports) { & $adb connect "127.0.0.1:$port" 2>&1 | Out-Null }

$serials = @(& $adb devices 2>$null | ForEach-Object { if ($_ -match '^(\S+)\s+device$') { $Matches[1] } })
$unauthorized = @(& $adb devices 2>$null | Where-Object { $_ -match '\sunauthorized$' })
$candidates = @()
$seen = @{}
foreach ($serial in $serials) {
  $names = @(& $adb -s $serial shell "ls $gameDir" 2>$null | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^data_a_.*\.json$' })
  if ($names.Count -gt 0) {
    $model = (& $adb -s $serial shell getprop ro.product.model 2>$null | Out-String).Trim()
    # 같은 앱플레이어가 emulator-5554 와 127.0.0.1:5555 처럼 두 번 잡히면 하나만 (모델 + 파일 목록이 같음)
    $key = $model + '|' + ($names -join ',')
    if (-not $seen.ContainsKey($key)) {
      $seen[$key] = $true
      $candidates += [pscustomobject]@{ Serial = $serial; Model = $model; Names = $names }
    }
  }
}

if ($candidates.Count -eq 0) {
  Say ''
  Say '게임 저장 파일이 있는 앱플레이어 · 폰을 찾지 못했어요.'
  Say ' - 앱플레이어 설정에서 ADB 연결을 켰는지'
  Say ' - 앱플레이어 안에서 게임을 한 번 켜서 접속했는지'
  Say ' - 앱플레이어를 다시 켠 뒤 이 파일을 다시 실행'
  if ($unauthorized.Count -gt 0) { Say ' - 폰 화면에 USB 디버깅 허용 창이 떠 있으면 허용을 누르고 다시 실행' }
  & $adb kill-server 2>&1 | Out-Null
  return
}

$pick = $candidates[0]
if ($candidates.Count -gt 1) {
  Say '게임이 있는 기기가 여러 개예요.'
  for ($i = 0; $i -lt $candidates.Count; $i++) { Say "  $($i + 1). $($candidates[$i].Model) ($($candidates[$i].Serial))" }
  $choice = Read-Host '번호를 고르세요'
  $index = 0
  if ([int]::TryParse($choice, [ref]$index) -and $index -ge 1 -and $index -le $candidates.Count) { $pick = $candidates[$index - 1] }
}
Say "기기: $($pick.Model) ($($pick.Serial))"

# 3. 바탕화면 폴더에 받기 (전에 받은 저장 파일은 지워서 날짜가 섞이지 않게)
$desktop = [Environment]::GetFolderPath('Desktop')
$target = Join-Path $desktop $folderName
New-Item -ItemType Directory -Path $target -ErrorAction SilentlyContinue | Out-Null
Get-ChildItem -Path $target -Filter 'data_a_*.json' -File | Remove-Item
$copied = 0
foreach ($name in $pick.Names) {
  & $adb -s $pick.Serial pull "$gameDir/$name" (Join-Path $target $name) 2>&1 | Out-Null
  if (Test-Path (Join-Path $target $name)) { $copied++ }
}

# 4. 연결 정리: 브라우저 USB 불러오기와 부딪치지 않게 adb 를 끈다
& $adb disconnect 2>&1 | Out-Null
& $adb kill-server 2>&1 | Out-Null

Say ''
Say "$($pick.Names.Count)개 중 $copied 개를 받았어요: $target"
Say '계산기 불러오기 창의 [폴더 고르기]에서 이 폴더를 고르세요.'
Start-Process explorer.exe $target
