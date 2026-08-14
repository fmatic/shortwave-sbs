$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "app.js"

if (-not (Test-Path $path)) {
    throw "app.js not found in current directory."
}

$content = Get-Content -Raw -Encoding UTF8 $path

$needle = @'
        allSchedules =
            data.schedules || [];

        renderSourceInfo(
            data.sources
        );
'@

$replacement = @'
        allSchedules =
            data.schedules || [];

        // DXing.world Shortwave Bridge deep-link support.
        // Example: https://shortwave.sbs/?q=BBC
        const bridgeParams = new URLSearchParams(window.location.search);
        const bridgeQuery = (bridgeParams.get("q") || "").trim();

        if (bridgeQuery && els.searchInput) {
            els.searchInput.value = bridgeQuery;

            // Search the entire schedule rather than the default 49m/on-air view.
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

if (-not $content.Contains($needle)) {
    throw "Could not find the first insertion point in app.js. The file may have changed."
}

$content = $content.Replace($needle, $replacement)

$needle2 = @'
        render();
    } catch (error) {
'@

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

if (-not $content.Contains($needle2)) {
    throw "Could not find the second insertion point in app.js. The file may have changed."
}

$content = $content.Replace($needle2, $replacement2)

Set-Content -Path $path -Value $content -Encoding UTF8

Write-Host "OK: app.js updated with ?q= deep-link support." -ForegroundColor Green
Write-Host "Test after deploy: https://shortwave.sbs/?q=BBC"
