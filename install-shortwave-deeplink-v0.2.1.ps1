$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "app.js"
if (-not (Test-Path $path)) {
    throw "app.js not found. Run this from the shortwave-sbs repository root."
}

$content = Get-Content -Raw -Encoding UTF8 $path

if ($content.Contains('const bridgeParams = new URLSearchParams(window.location.search);')) {
    Write-Host "Deep-link support is already present in app.js." -ForegroundColor Yellow
} else {
    $needle1 = @'
        allSchedules =
            data.schedules || [];

        renderSourceInfo(
            data.sources
        );
'@

    $replace1 = @'
        allSchedules =
            data.schedules || [];

        // DXing.world Shortwave Bridge deep-link support.
        // Example: https://shortwave.sbs/?q=BBC
        const bridgeParams = new URLSearchParams(window.location.search);
        const bridgeQuery = (bridgeParams.get("q") || "").trim();

        if (bridgeQuery && els.searchInput) {
            els.searchInput.value = bridgeQuery;

            if (els.bandSelect) {
                els.bandSelect.value = "";
            }

            if (els.onAirOnly) {
                els.onAirOnly.checked = false;
            }
        }

        renderSourceInfo(
            data.sources
        );
'@

    if (-not $content.Contains($needle1)) {
        throw "Insertion point #1 not found. app.js differs from the expected current version."
    }

    $content = $content.Replace($needle1, $replace1)

    # Target only the render() inside loadSchedules by starting after the bridge code.
    $start = $content.IndexOf('const bridgeParams = new URLSearchParams(window.location.search);')
    $renderNeedle = "        render();`r`n    } catch (error) {"
    $pos = $content.IndexOf($renderNeedle, $start)

    if ($pos -lt 0) {
        # LF fallback
        $renderNeedle = "        render();`n    } catch (error) {"
        $pos = $content.IndexOf($renderNeedle, $start)
    }

    if ($pos -lt 0) {
        throw "Insertion point #2 not found after deep-link block."
    }

    $replacement2 = @'
        render();

        if (bridgeQuery) {
            requestAnimationFrame(() => {
                document
                    .querySelector('[data-section="controls"]')
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                els.searchInput?.focus({
                    preventScroll: true
                });
            });
        }
    } catch (error) {
'@

    $content = $content.Substring(0,$pos) + $replacement2 + $content.Substring($pos + $renderNeedle.Length)
    Set-Content -Path $path -Value $content -Encoding UTF8
}

$verify = Get-Content -Raw -Encoding UTF8 $path
if (-not $verify.Contains('bridgeParams') -or -not $verify.Contains('bridgeQuery')) {
    throw "Verification failed: deep-link code is not present."
}

Write-Host ""
Write-Host "OK: ?q= deep-link support is present in app.js." -ForegroundColor Green
Write-Host ""
Write-Host "Next commands:" -ForegroundColor Cyan
Write-Host "  git diff -- app.js"
Write-Host "  git status"
Write-Host "  git add app.js functions/api/bridge.js"
Write-Host '  git commit -m "Add DXing.world Shortwave Bridge deep-link search"'
Write-Host "  git push"
Write-Host ""
Write-Host "After Cloudflare deploy:" -ForegroundColor Cyan
Write-Host "  https://shortwave.sbs/?q=BBC"
Write-Host "  https://shortwave.sbs/?q=9585"
