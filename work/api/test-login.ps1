$process = Start-Process -FilePath "node" -ArgumentList "src/index.js" -PassThru

Start-Sleep -Seconds 5

curl.exe -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{\"email\": \"admin@example.com\", \"password\": \"admin123\"}' --cookie-jar cookie.txt

curl.exe -X POST http://localhost:8080/api/admin/backup/run -H "Content-Type: application/json" --cookie cookie.txt

Stop-Process -Id $process.Id -Force