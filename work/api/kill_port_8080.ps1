$port = 8080
$connection = Get-NetTCPConnection -LocalPort $port -State Listen | Select-Object -First 1
if ($connection) {
    $processId = $connection.OwningProcess
    Stop-Process -Id $processId -Force
    Write-Output "Process on port $port (PID $processId) killed"
} else {
    Write-Output "No process found listening on port $port"
}